import TelegramBot from 'node-telegram-bot-api';
import env from './config/env.js';

function createBot() {
    return new TelegramBot(env.botToken, { polling: true });
}

export default createBot;
