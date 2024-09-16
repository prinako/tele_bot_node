const TelegramBot = require('node-telegram-bot-api');
const AgendaPayment = require('./agendas/agenda_payment.js');
const SomeonePaid = require('./agendas/someone_piad.js');
const SchedulesEveryday = require('./schedules/schedules_everyday.js');
const Paid = require('./agendas/paid.js');
const allowedUsers = require('./auth/auth.js');
const userHasNoPermition = require('./utilities/has_no_permition.js');



// Create a new instance of the bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

new SchedulesEveryday(bot);

const agendaUsersState = {};
const piadState = {};
const pagouState = {};


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
    
    if (agendaUsersState[userId]) {
        agendaUsersState[userId] = {};
    }
    if (!allowedUsers(userId)) {
        userHasNoPermition(bot, msg);
        return;
    }
    agendaUsersState[userId] = new AgendaPayment(bot);

    bot.sendMessage(msg.chat.id, 'Vamos registrar o pagamento de fatura em pendente\n\nPor favor, selecione o mês de vencimento:',{
        message_thread_id: msg.message_thread_id,
        reply_markup: {
            inline_keyboard: agendaUsersState[userId].generateMonthKeyboard()
        }
    });
});

bot.onText(/\/cancel/, (msg) => {
    const userId = msg.from.id;

    if (!allowedUsers(userId)) {
        userHasNoPermition(bot, msg);
        return;
    }

    if (agendaUsersState[userId]) {
        delete agendaUsersState[userId];
    }
    if (piadState[userId]) {
        delete piadState[userId];
    }
    bot.sendMessage(msg.chat.id, 'Operação cancelada', {
        message_thread_id: msg.message_thread_id
    });
});

bot.onText(/\/help/, (msg) => {
    // const chatId = msg.chat.id;
    if (!allowedUsers(msg.from.id)) {
        bot.sendMessage(msg.chat.id, `Comandos disponíveis para ${msg.from.first_name}:\n /ia - Para conversar com a inteligência artificial.\n`,{
            message_thread_id: msg.message_thread_id,
            chat_id: msg.chat.id,
            message_id: msg.message_id,
        } );
        return;
    }

    bot.sendMessage(msg.chat.id, `Comandos disponíveis para ${msg.from.first_name}:\n /agenda - Para registrar o pagamento de fatura em pendente.\n /cancel - Para cancelar a operação atual.\n /pagou - Para adicionar quem pagou a parte ele.\n /delete - Para deletar o fatura que foi registrada.\n /whopaid - Para saber quem pagou`, {
        message_thread_id: msg.message_thread_id,
        chat_id: msg.chat.id,
        message_id: msg.message_id,
    });
});

bot.onText(/\/whopaid/, (msg) => {
    const userId = msg.from.id;
    if (!allowedUsers(userId)) {
        userHasNoPermition(bot, msg);
        return;
    }

    if (piadState[userId]) {
        piadState[userId] = {};
    }
    piadState[userId] = new SomeonePaid(bot);
    piadState[userId].addWhoPaid(msg);
});

bot.onText(/\/pagou/, (msg) => {
    const userId = msg.from.id;
    if (!allowedUsers(userId)) {
        userHasNoPermition(bot, msg);
        return;
    }
    pagouState[userId] = new Paid(bot);
    pagouState[userId].paid(msg);
});

bot.onText(/\/delete/, (msg) => {
    const userId = msg.from.id;
    if (!allowedUsers(userId)) {
        userHasNoPermition(bot, msg);
        return;
    }
})

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
    if (piadState[userId]) {
        piadState[userId].handlePaid(callbackQuery);
    }
});
