import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as dotenv from 'dotenv';
dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';

console.log("Loaded API_ID:", apiId);
console.log("Loaded API_HASH:", apiHash);

async function test() {
    try {
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
        
        console.log("Sending code to +2349167640574...");
        const result = await client.sendCode({
            apiId,
            apiHash
        }, '+2349167640574');
        
        console.log("Success! Hash:", result.phoneCodeHash);
        process.exit(0);
    } catch (e) {
        console.error("Error details:", e);
        process.exit(1);
    }
}
test();
