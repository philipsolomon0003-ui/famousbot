import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
console.log('CWD:', process.cwd());
console.log('TELEGRAM_API_ID:', process.env.TELEGRAM_API_ID);
console.log('TELEGRAM_API_HASH:', process.env.TELEGRAM_API_HASH);
console.log('Parsed API_ID:', parseInt(process.env.TELEGRAM_API_ID || '0'));
