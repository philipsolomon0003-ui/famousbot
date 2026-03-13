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
        // Return cached groups if valid
        if (cachedGroups && (now - lastGroupsFetchTime < GROUPS_CACHE_DURATION)) {
            return res.json(cachedGroups);
        }

        const client = await getClient();
        console.log('Fetching fresh dialogs from Telegram...');
        const dialogs = await client.getDialogs({});
        
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
        
        // Search Telegram contacts/global search for the keyword
        const searchResult = await client.invoke(new Api.contacts.Search({
            q: query,
            limit: 50
        }));

        // Filter and map the results to a consistent format
        const results = searchResult.chats.map((chat: any) => {
            let type = 'unknown';
            if (chat.className === 'Channel') type = 'channel';
            else if (chat.className === 'Chat') type = 'group';
            
            return {
                id: chat.id?.toString(),
                title: chat.title || chat.username || 'Unknown',
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
    const { content, isScheduled, scheduledFor } = req.body;
    
    const message = await prisma.message.create({
        data: {
            content,
            isScheduled: isScheduled || false,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            status: isScheduled ? 'pending' : 'broadcasting'
        }
    });

    if (!isScheduled) {
        // Trigger immediate broadcast asynchronously
        broadcastMessage(message.id);
    }

    res.json(message);
});

app.get('/api/logs', requireAuth, async (req, res) => {
    const logs = await prisma.activityLog.findMany({
        include: { message: true },
        orderBy: { sentAt: 'desc' },
        take: 100
    });
    res.json(logs);
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
            const dialogs = await client.getDialogs({});
            
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
// BROADCASTING LOGIC
// ----------------------------------------------------

async function broadcastMessage(messageId: number) {
    try {
        const message = await prisma.message.findUnique({ where: { id: messageId }});
        if (!message) return;

        const client = await getClient();
        const dialogs = await client.getDialogs({});
        const groups = dialogs.filter(d => d.isGroup || d.isChannel);
        
        // If there are no groups found, mark as failed immediately
        if (groups.length === 0) {
            console.log('No groups found for broadcasting.');
            await prisma.message.update({ where: { id: messageId }, data: { status: 'failed' }});
            return;
        }

        let successCount = 0;
        
        for (const group of groups) {
            if (!group.id) continue;
            
            try {
                await client.sendMessage(group.id, { message: message.content });
                
                await prisma.activityLog.create({
                    data: {
                        messageId: message.id,
                        groupId: group.id.toString(),
                        status: 'success'
                    }
                });
                successCount++;
                console.log(`Sent message to ${group.title}`);
                
                // Rate limiting logic: sleep 1.5 seconds between sends
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (error: any) {
                console.error(`Failed to send to ${group.title}:`, error.message);
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
