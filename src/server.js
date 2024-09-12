const TelegramBot = require('node-telegram-bot-api');
const { AgendaPayment } = require('./agendas/agenda_payment.js');


// Create a new instance of the bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });


const agendaUsersState = {};

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
    const userId = msg.from.id;

    // Initialize user state and user class if not already initialized
    if (!agendaUsersState[userId]) {
        agendaUsersState[userId] = {};
    }
    
    agendaUsersState[userId] = new AgendaPayment(bot);

    bot.sendMessage(msg.chat.id, 'Vamos registrar o pagamento de fatura em pendente\n\nPor favor, selecione o mês de vencimento:',{
        message_thread_id: msg.message_thread_id,
        reply_markup: {
            inline_keyboard: agendaUsersState[userId].generateMonthKeyboard()
        }
        });
    });


// Handle user responses
bot.on('message', async (msg) => {
    // Get the user ID of the message
    const userId = msg.from.id;

    if (agendaUsersState[userId] && agendaUsersState[userId].stage === 'pix') {
        agendaUsersState[userId].stageTracker = true;
    }

    // Check if the agendaUsersState instance exists for the user
    if (agendaUsersState[userId] && agendaUsersState[userId].stageTracker) {
        // Handle the user's response
        const isCompleted = agendaUsersState[userId].handleResponse(msg);
        // If the process is complete, clean up the state and user class
        if (isCompleted) {
            delete agendaUsersState[userId];
        }
    }
})

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
    const userId = callbackQuery.from.id;

    if (agendaUsersState[userId]) {
        agendaUsersState[userId].handleKeyboard(callbackQuery);
    }
});
