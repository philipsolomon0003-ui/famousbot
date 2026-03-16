import { Api } from 'telegram';
import { getClient } from './src/telegramAuth';

async function testAdvancedSearch() {
    const client = await getClient();
    const query = 'iptv'; 
    
    console.log('Testing advanced search...');
    
    // 1. Regular contacts search
    const contactsResult = await client.invoke(new Api.contacts.Search({
        q: query,
        limit: 100
    }));
    
    const chatsMap = new Map<string, any>();
    
    if (contactsResult.chats) {
        for (const chat of contactsResult.chats) {
            chatsMap.set(chat.id.toString(), chat);
        }
    }
    
    // 2. Message global search
    const msgResult: any = await client.invoke(new Api.messages.SearchGlobal({
        q: query,
        filter: new Api.InputMessagesFilterEmpty(),
        minDate: 0,
        maxDate: 0,
        offsetRate: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        offsetId: 0,
        limit: 100 // max is usually 100 per request
    }));
    
    if (msgResult.chats) {
        for (const chat of msgResult.chats) {
            chatsMap.set(chat.id.toString(), chat);
        }
    }
    
    console.log(`Total unique chats found: ${chatsMap.size}`);
    const resultsList = Array.from(chatsMap.values());
    console.log('Titles:', resultsList.map((c: any) => c.title || c.username).slice(0, 30));
    
    process.exit(0);
}

testAdvancedSearch().catch(console.error);
