import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
    console.warn('⚠️ TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in your .env file!');
}

let client: TelegramClient | null = null;
let currentSessionString = '';

export async function getClient(): Promise<TelegramClient> {
    if (client) {
        if (!client.connected) {
            await client.connect();
        }
        return client;
    }

    const sessionRecord = await prisma.userSession.findFirst();
    currentSessionString = sessionRecord?.session || '';
    
    const stringSession = new StringSession(currentSessionString);
    
    client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.connect();
    
    return client;
}

export async function sendOtpCode(phoneNumber: string): Promise<string> {
    const c = await getClient();
    const result = await c.sendCode({
        apiId,
        apiHash,
    }, phoneNumber);
    return result.phoneCodeHash;
}

export async function signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string): Promise<boolean> {
    const c = await getClient();
    try {
        await c.invoke(new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode
        }));
        
        // Save the new session
        const newSessionString = c.session.save() as unknown as string;
        
        const existing = await prisma.userSession.findFirst();
        if (existing) {
            await prisma.userSession.update({
                where: { id: existing.id },
                data: { session: newSessionString }
            });
        } else {
            await prisma.userSession.create({
                data: { session: newSessionString }
            });
        }
        currentSessionString = newSessionString;
        return true;
    } catch (error) {
        console.error('Failed to sign in:', error);
        throw error;
    }
}

export async function logout(): Promise<void> {
    const c = await getClient();
    await c.invoke(new Api.auth.LogOut());
    await prisma.userSession.deleteMany();
    currentSessionString = '';
    client = null;
}
