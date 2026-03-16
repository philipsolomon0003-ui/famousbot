import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import dotenv from 'dotenv';

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';
const phoneNumber = '+2349167640574';

async function test() {
    console.log('Testing sendCode for:', phoneNumber);
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
        connectionRetries: 5,
    });

    try {
        await client.connect();
        console.log('Connected to Telegram');
        const result = await client.sendCode({
            apiId,
            apiHash,
        }, phoneNumber);
        console.log('Success! phoneCodeHash:', result.phoneCodeHash);
    } catch (error: any) {
        console.error('Detailed Error:', error);
    } finally {
        await client.disconnect();
    }
}

test();
