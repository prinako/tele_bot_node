const TelegramBot = require('node-telegram-bot-api');
const { AgendaPayment } = require('./agendas/agenda_payment.js');

// Create a new instance of the bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });


const userClass = {};

// Command /start to initiate the month selection
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Please use /agenda to start the process.', {
        reply_markup: {
        }
    });
});

// Command /agenda to initiate the month selection
bot.onText(/\/agenda/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize user state and user class if not already initialized
    if (!userClass[chatId]) {
        userClass[chatId] = {};
    }
    
    userClass[chatId] = new AgendaPayment(bot);

    // Set the current stage of interaction
    userClass[chatId].stage = 'title';

    bot.sendMessage(chatId, 'Qual é o título da fatura?',{
        message_thread_id: msg.message_thread_id,
        reply_markup: {
            remove_keyboard: true
        
        }
        });
    });


// Handle user responses
bot.on('message', async (msg) => {
    console.log(msg);
    const chatId = msg.chat.id;

    // Check if the userClass instance exists for the user
    if (userClass[chatId]) {
        const isCompleted = userClass[chatId].handleResponse(msg);
        // If the process is complete, clean up the state and user class
        if (isCompleted) {
            delete userClass[chatId];
            console.log(userClass);
        }
    }
});

// bot.on('callback_query', (query) => {
//     console.log(query);
//     const chatId = query.message.chat.id;

//     // Check if the userClass instance exists for the user
//     if (userClass[chatId]) {
//         const isCompleted = userClass[chatId].handleResponse(query);
//         // If the process is complete, clean up the state and user class
//         if (isCompleted) {
//             delete userClass[chatId];
//             console.log(userClass);
//         }
//     }
// });
