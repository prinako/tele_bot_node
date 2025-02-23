/**
 * Sends a message to the user indicating that they do not have permission to use a certain command.
 * @param {TelegramBot} bot - The Telegram bot instance.
 * @param {Message} msg - The Telegram message object.
 * @return {Promise<Message>}
 */
function userHasNoPermission(bot, msg) {
    return bot.sendMessage(msg.chat.id, 'Voce não tem permissão para usar este comando.', {
        message_thread_id: msg.message_thread_id
    });
}

export default userHasNoPermission;