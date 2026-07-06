import TelegramBot from 'node-telegram-bot-api';
import env from './config/env.js';

/**
 * Creates a new Telegram bot instance.
 *
 * @returns {TelegramBot} The bot instance.
 */
function createBot() {
    return new TelegramBot(env.botToken, { polling: true });
}

export default createBot;
