import dotenv from 'dotenv';

dotenv.config();

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    botToken: process.env.BOT_TOKEN,
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    billsThreadId: process.env.BILLS_THREAD_ID,
    paidThreadId: process.env.PAID_THREAD_ID,
    chatId: process.env.CHAT_ID,
    log: process.env.LOG === 'true',
};

export default env;
