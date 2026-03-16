import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { getClient, sendOtpCode, signIn, logout } from './telegramAuth';
import { Api } from 'telegram';
import cron from 'node-cron';

dotenv.config();

const prisma = new PrismaClient({});
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const ADMIN_TOKEN = 'userbot_session_active';

// Simple Auth middleware
const requireAuth = (req: Request, res: Response, next: express.NextFunction) => {
    const token = req.headers['x-admin-token'];
    if (token === ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// In-memory broadcast progress tracking
interface Progress {
    total: number;
    sent: number;
    failed: number;
    status: 'broadcasting' | 'completed' | 'failed';
}
const broadcastProgress = new Map<number, Progress>();

// ----------------------------------------------------
// AUTHENTICATION ROUTES (Replacing strict password login)
// ----------------------------------------------------

// Kept for frontend backwards compatibility during transition, or we can use it to check session status
app.post('/api/auth/login', async (req, res) => {
    res.status(400).json({ error: 'Use MTProto login flow (/send-code and /sign-in)' });
});

app.post('/api/auth/send-code', async (req, res) => {
    console.log('[API] /api/auth/send-code HIT! Body:', req.body);
    try {
        const { phoneNumber } = req.body;
        console.log('[API] Extracted phoneNumber:', phoneNumber);
        const phoneCodeHash = await sendOtpCode(phoneNumber);
        console.log('[API] Successfully got hash:', phoneCodeHash);
        res.json({ phoneCodeHash });
    } catch (error: any) {
        console.error('[API] send-code error:', error);
        res.status(500).json({ error: error.message || 'Failed to send code' });
    }
});

app.post('/api/auth/sign-in', async (req, res) => {
    try {
        const { phoneNumber, phoneCodeHash, code } = req.body;
        const success = await signIn(phoneNumber, phoneCodeHash, code);
        if (success) {
            cachedGroups = null;
            lastGroupsFetchTime = 0;
            res.json({ token: ADMIN_TOKEN });
        } else {
            res.status(401).json({ error: 'Invalid code' });
        }
    } catch (error: any) {
        console.error('sign-in error:', error);
        res.status(401).json({ error: error.message || 'Failed to sign in' });
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        await logout();
        cachedGroups = null;
        lastGroupsFetchTime = 0;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// ----------------------------------------------------
// GROUPS & MESSAGES API
// ----------------------------------------------------

let cachedGroups: any[] | null = null;
let lastGroupsFetchTime = 0;
const GROUPS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/api/groups', requireAuth, async (req, res) => {
    try {
        const now = Date.now();
        const refresh = req.query.refresh === 'true';

        // Return cached groups if valid and not refreshing
        if (!refresh && cachedGroups && (now - lastGroupsFetchTime < GROUPS_CACHE_DURATION)) {
            return res.json(cachedGroups);
        }

        const client = await getClient();
        console.log('Fetching fresh dialogs from Telegram...');
        // Pass limit: undefined to fetch ALL dialogs, not just the default 100
        const dialogs = await client.getDialogs({ limit: undefined });
        console.log(`[API /groups] GramJS returned ${dialogs.length} dialog entities.`);
        
        // Filter out groups, channels, and users (bots)
        const groups = dialogs
            .filter(d => d.isGroup || d.isChannel || d.isUser)
            .map(d => {
                let type = 'unknown';
                if (d.isGroup) type = 'group';
                else if (d.isChannel) type = 'channel';
                else if (d.isUser) type = 'user';

                return {
                    id: d.id?.toString(),
                    title: d.title || d.name, // Users might use name instead of title
                    type: type,
                    isActive: true
                };
            });
            
        // Update cache
        cachedGroups = groups;
        lastGroupsFetchTime = now;
        
        res.json(groups);
    } catch (error: any) {
        console.error('Failed to fetch groups via GramJS:', error);
        res.status(500).json({ error: 'Failed to fetch groups from Telegram' });
    }
});

app.post('/api/groups/join', requireAuth, async (req, res) => {
    try {
        const { linkOrTag } = req.body;
        if (!linkOrTag) {
            return res.status(400).json({ error: 'Missing link or tag' });
        }

        const client = await getClient();
        let normalized = linkOrTag.trim();

        // 1. Check if it's an invite link hash
        if (normalized.includes('joinchat/') || normalized.includes('t.me/+')) {
            let hash = '';
            if (normalized.includes('joinchat/')) {
                hash = normalized.split('joinchat/')[1].split('/')[0].split('?')[0];
            } else if (normalized.includes('t.me/+')) {
                hash = normalized.split('t.me/+')[1].split('/')[0].split('?')[0];
            }

            if (hash) {
                await client.invoke(new Api.messages.ImportChatInvite({ hash }));
                cachedGroups = null; // Invalidate cache
                return res.json({ success: true, message: 'Joined via invite link' });
            }
        }

        // 2. Otherwise it's a public username tag
        // Strip URLs or @ symbols to get just the username
        let username = normalized;
        if (username.startsWith('http')) {
            const parts = username.split('/');
            username = parts[parts.length - 1];
        }
        if (username.startsWith('@')) {
            username = username.substring(1);
        }

        await client.invoke(new Api.channels.JoinChannel({ channel: username }));
        cachedGroups = null; // Invalidate cache
        return res.json({ success: true, message: `Joined @${username}` });

    } catch (error: any) {
        console.error('Failed to join group:', error);
        res.status(500).json({ error: error.message || 'Failed to join group/channel' });
    }
});

app.post('/api/groups/search', requireAuth, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const client = await getClient();
        console.log(`[API /search] Searching for: ${query}`);
        
        const chatsMap = new Map<string, any>();

        try {
            // 1. Regular contacts search (Finds exact name matches, limit ~10)
            const searchResult = await client.invoke(new Api.contacts.Search({
                q: query,
                limit: 100
            }));
            
            if (searchResult.chats) {
                for (const chat of searchResult.chats) {
                    chatsMap.set(chat.id.toString(), chat);
                }
            }
        } catch (e) {
            console.error('contacts.Search error:', e);
        }

        try {
            // 2. Global message search (Finds recently active groups mentioning the keyword)
            // This bypasses the strict ~10 limit and returns "latest" active groups.
            const msgResult: any = await client.invoke(new Api.messages.SearchGlobal({
                q: query,
                filter: new Api.InputMessagesFilterEmpty(),
                minDate: 0,
                maxDate: 0,
                offsetRate: 0,
                offsetPeer: new Api.InputPeerEmpty(),
                offsetId: 0,
                limit: 80 // Limit to 80 to prevent timeout
            }));
            
            if (msgResult.chats) {
                for (const chat of msgResult.chats) {
                    chatsMap.set(chat.id.toString(), chat);
                }
            }
        } catch (e) {
             console.error('messages.SearchGlobal error:', e);
        }

        const uniqueChats = Array.from(chatsMap.values());
        console.log(`[API /search] Found ${uniqueChats.length} unique chats`);

        // Filter and map the results to a consistent format
        const results = uniqueChats.map((chat: any) => {
            let type = 'unknown';
            
            // Analyze the GramJS entity to determine its type
            if (chat.className === 'Channel') {
                // In MTProto, Megagroups (supergroups) use the Channel class
                if (chat.megagroup) {
                    type = 'group';
                } else {
                    type = 'channel';
                }
            } else if (chat.className === 'Chat') {
                // Standard basic groups
                type = 'group';
            } else if (chat.className === 'User') {
                if (chat.bot) {
                    type = 'bot';
                } else {
                    type = 'user';
                }
            }
            
            return {
                id: chat.id?.toString(),
                title: chat.title || chat.username || chat.firstName || 'Unknown',
                username: chat.username,
                type: type,
                participantsCount: chat.participantsCount || 0
            };
        });

        res.json(results);
    } catch (error: any) {
        console.error('Failed to search groups:', error);
        res.status(500).json({ error: error.message || 'Failed to search Telegram' });
    }
});
app.post('/api/messages', requireAuth, async (req, res) => {
    const { content, isScheduled, scheduledFor, targetGroups } = req.body;
    
    // Validate targetGroups if provided
    let targetGroupsStr = null;
    if (targetGroups && Array.isArray(targetGroups) && targetGroups.length > 0) {
        targetGroupsStr = JSON.stringify(targetGroups);
    }

    const message = await prisma.message.create({
        data: {
            content,
            isScheduled: isScheduled || false,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            status: isScheduled ? 'pending' : 'broadcasting',
            targetGroups: targetGroupsStr
        }
    });

    if (!isScheduled) {
        // Trigger immediate broadcast asynchronously
        broadcastMessage(message.id);
    }

    res.json(message);
});

app.get('/api/progress/:messageId', requireAuth, (req: Request, res: Response) => {
    const messageId = parseInt(req.params.messageId as string);
    const progress = broadcastProgress.get(messageId);
    
    if (!progress) {
        return res.status(404).json({ error: 'Progress not found' });
    }
    
    res.json(progress);
});

app.get('/api/logs', requireAuth, async (req, res) => {
    const logs = await prisma.activityLog.findMany({
        include: { message: true },
        orderBy: { sentAt: 'desc' },
        take: 100
    });
    res.json(logs);
});

app.delete('/api/logs', requireAuth, async (req, res) => {
    try {
        await prisma.activityLog.deleteMany();
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to clear logs:', error);
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

// ----------------------------------------------------
// DASHBOARD STATS API
// ----------------------------------------------------

app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const now = Date.now();
        let groupsCount = 0;
        
        // Use cached groups if available to be fast
        if (cachedGroups && (now - lastGroupsFetchTime < GROUPS_CACHE_DURATION)) {
            groupsCount = cachedGroups.length;
        } else {
            // If not cached, we have to fetch (this will be slow the first time, but we populate the cache)
            const client = await getClient();
            console.log('Fetching fresh dialogs from Telegram for stats...');
            const dialogs = await client.getDialogs({ limit: undefined });
            console.log(`[Stats] GramJS returned ${dialogs.length} dialog entities.`);
            
            const groups = dialogs.filter(d => d.isGroup || d.isChannel || d.isUser);
            groupsCount = groups.length;
            
            // Sneakily populate the cache while we're at it
            cachedGroups = groups.map(d => {
                let type = 'unknown';if (d.isGroup) type = 'group';else if (d.isChannel) type = 'channel';else if (d.isUser) type = 'user';
                return { id: d.id?.toString(), title: d.title || d.name, type: type, isActive: true };
            });
            lastGroupsFetchTime = now;
        }

        const sentMessages = await prisma.activityLog.count({ where: { status: 'success' } });
        const scheduledMessages = await prisma.message.count({ where: { isScheduled: true, status: 'pending' } });

        res.json({
            groups: groupsCount,
            sentMessages,
            scheduledMessages
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ----------------------------------------------------
// ANTI-BAN UTILITIES
// ----------------------------------------------------

/**
 * Parses spintax like "{Hello|Hi|Greetings} there!" into a random selection.
 */
function spinText(text: string): string {
    return text.replace(/{([^{}]+)}/g, (match, contents) => {
        const options = contents.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

// ----------------------------------------------------
// BROADCASTING LOGIC
// ----------------------------------------------------

async function broadcastMessage(messageId: number) {
    try {
        const message = await prisma.message.findUnique({ where: { id: messageId }});
        if (!message) return;

        const client = await getClient();
        console.log('Fetching fresh dialogs for broadcast...');
        const dialogs = await client.getDialogs({ limit: undefined });
        
        // Include ONLY groups. Skip channels (users can't broadcast to them) and bots/users.
        let groups = dialogs.filter((d: any) => d.isGroup === true);
        
        // Filter by specific target groups if specified in the message
        if (message.targetGroups) {
            try {
                const targetIds: string[] = JSON.parse(message.targetGroups);
                if (targetIds.length > 0) {
                    groups = groups.filter(g => g.id && targetIds.includes(g.id.toString()));
                }
            } catch (e) {
                console.error('Failed to parse targetGroups for message', messageId, e);
            }
        }
        
        // Initialize progress
        broadcastProgress.set(messageId, {
            total: groups.length,
            sent: 0,
            failed: 0,
            status: 'broadcasting'
        });

        // If there are no groups found, mark as failed immediately
        if (groups.length === 0) {
            console.log('No groups found for broadcasting.');
            broadcastProgress.set(messageId, { total: 0, sent: 0, failed: 0, status: 'completed' });
            await prisma.message.update({ where: { id: messageId }, data: { status: 'failed' }});
            return;
        }

        let successCount = 0;
        let messagesSentSinceLastLongPause = 0;
        
        // Anti-Ban: Dynamic Delay Base (starts fast, gets slower)
        let baseDelayMs = 3000;
        
        // Anti-Ban: Randomize the coffee break threshold (15-25 messages)
        let nextCoffeeBreakAt = Math.floor(Math.random() * 11) + 15;

        for (const group of groups) {
            if (!group.id) continue;
            
            try {
                // Anti-Ban feature 1: Dynamic randomized delay that ramps up
                // To prevent detection, the delay slowly increases as we send more messages.
                baseDelayMs = Math.min(baseDelayMs + 250, 15000); // Ramps up to a max 15s base delay
                
                let randomDelay = baseDelayMs + Math.floor(Math.random() * 5000);

                // Anti-Ban feature 4: Nighttime Throttling Check
                // If the user's local server time is between 2 AM and 6 AM, double the delays
                const currentHour = new Date().getHours();
                if (currentHour >= 2 && currentHour <= 6) {
                     console.log(`[Anti-Ban] Late night hours detected. Doubling delay times to appear normal.`);
                     randomDelay *= 2;
                }

                console.log(`[Anti-Ban] Waiting ${randomDelay}ms before next message...`);
                await new Promise(resolve => setTimeout(resolve, randomDelay));

                // Anti-Ban feature 5: Spintax parsing
                const finalMessage = spinText(message.content);

                await client.sendMessage(group.id, { message: finalMessage });
                
                // Update progress
                const p = broadcastProgress.get(messageId);
                if (p) {
                    p.sent++;
                    broadcastProgress.set(messageId, { ...p });
                }

                await prisma.activityLog.create({
                    data: {
                        messageId: message.id,
                        groupId: group.id.toString(),
                        status: 'success'
                    }
                });
                successCount++;
                messagesSentSinceLastLongPause++;
                console.log(`Sent message to ${group.title}`);
                
                // Anti-Ban feature 2: Take a long pause at randomized intervals
                if (messagesSentSinceLastLongPause >= nextCoffeeBreakAt) {
                    const longPause = Math.floor(Math.random() * 60000) + 60000; // 1m to 2m pause
                    console.log(`[Anti-Ban] Taking a long coffee break of ${longPause}ms to avoid spam detection...`);
                    await new Promise(resolve => setTimeout(resolve, longPause));
                    messagesSentSinceLastLongPause = 0;
                    
                    // Pick a new random threshold for the next break
                    nextCoffeeBreakAt = Math.floor(Math.random() * 11) + 15;
                    
                    // Reset the dynamic delay base, simulating a fresh start after a break
                    baseDelayMs = 3000;
                }

            } catch (error: any) {
                console.error(`Failed to send to ${group.title}:`, error.message);
                
                // Anti-Ban feature 3: Respect Telegram's explicit "Flood Wait" requests
                if (error.message.includes('FLOOD_WAIT') || error.message.includes('A wait of')) {
                    // Extract the number of seconds to wait from the error message string (e.g. "A wait of 45 seconds is required")
                    const match = error.message.match(/(\d+)/);
                    if (match && match[1]) {
                        const secondsToWait = parseInt(match[1]);
                        console.log(`[Anti-Ban] Telegram requested a cooldown. Sleeping for ${secondsToWait} seconds...`);
                        await new Promise(resolve => setTimeout(resolve, (secondsToWait + 5) * 1000)); // Add 5s buffer
                    }
                }

                // Update progress
                const p = broadcastProgress.get(messageId);
                if (p) {
                    p.failed++;
                    broadcastProgress.set(messageId, { ...p });
                }

                await prisma.activityLog.create({
                    data: {
                        messageId: message.id,
                        groupId: group.id.toString(),
                        status: 'failed',
                        error: error.message
                    }
                });
            }
        }

        broadcastProgress.set(messageId, {
            ...broadcastProgress.get(messageId)!,
            status: 'completed'
        });

        await prisma.message.update({
            where: { id: message.id },
            data: { status: 'sent' }
        });
        
    } catch (e) {
        console.error('Fatal broadcast error:', e);
        await prisma.message.update({ where: { id: messageId }, data: { status: 'failed' }});
    }
}

// ----------------------------------------------------
// SCHEDULED MESSAGE PROCESSOR
// ----------------------------------------------------

cron.schedule('* * * * *', async () => {
    const now = new Date();
    const readyMessages = await prisma.message.findMany({
        where: {
            isScheduled: true,
            status: 'pending',
            scheduledFor: { lte: now }
        }
    });

    for (const msg of readyMessages) {
        await prisma.message.update({ where: { id: msg.id }, data: { status: 'broadcasting' } });
        console.log(`Processing scheduled message ID ${msg.id}`);
        await broadcastMessage(msg.id);
    }
});

// ----------------------------------------------------
// SERVER START
// ----------------------------------------------------

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        // Attempt to warm up the connection on boot if session exists
        const sessionRecord = await prisma.userSession.findFirst();
        if (sessionRecord?.session) {
            console.log('Found existing MTProto session, warming up connection...');
            await getClient();
            console.log('Connected to Telegram Userbot successfully.');
        } else {
            console.log('No Telegram session found. Please login via the frontend.');
        }
    } catch (e) {
        console.warn('Failed to connect to Telegram on startup. Might need fresh login.');
    }
});
