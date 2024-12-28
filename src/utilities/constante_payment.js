/**
 * Return an array with an AgendaPayment object with default values.
 * The values are: chatId, senderId, topicId, messageThreadId, day, title, amount, description, pix, bank, isPaid, sadat, sam, prince.
 * The values are the same as the environment variables.
 * The method is used to create the default AgendaPayment object that is sent every day.
 * @return {Array} The array with the AgendaPayment object.
 */
function constantPayment() {
    return [{
        chatId: process.env.CHAT_ID,
        senderId: process.env.SENDER_ID,
        topicId: process.env.TOPIC_ID,
        messageThreadId: process.env.MESSAGE_THREAD_ID,
        day: 17,
        title: 'internet',
        amount: 'R$ 50,00',
        description: 'R$ 150,00/3 = R$ 50,00 por cada',
        pix: process.env.PIX,
        bank: 'Next',
        isPaid: false,
        sadat: false,
        sam: false,
        prince: false
    }];
}

export default constantPayment;