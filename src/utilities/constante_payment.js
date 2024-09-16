/**
 * A function that returns an array of objects representing constant payments.
 * 
 * Each object in the array has the following properties:
 * - chatId: The chat ID of the Telegram chat where the payment should be sent.
 * - senderId: The user ID of the person who should send the payment.
 * - topicId: The topic ID of the conversation where the payment should be sent.
 * - messageThreadId: The ID of the message thread where the payment should be sent.
 * - day: The day of the month when the payment should be sent.
 * - title: A short description of the payment.
 * - amount: The amount of money to be sent.
 * - description: A longer description of the payment.
 * - pix: The PIX key of the recipient.
 * - bank: The name of the bank of the recipient.
 * - isPaid: A boolean indicating whether the payment has already been made.
 * - sadat: A boolean indicating whether Sadat has paid.
 * - sam: A boolean indicating whether Sam has paid.
 * - prince: A boolean indicating whether Prince has paid.
 * 
 * @return {Object[]} An array of objects representing constant payments.
 */
function constantPayment(){
    const listConstantPayment = [
        {
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
            prince: false,
        }
    ];
    return listConstantPayment
}

module.exports = constantPayment;