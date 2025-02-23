import TelegramBot from 'node-telegram-bot-api/lib/telegram.js';
import AgendaPayment from './agendas/agenda_payment.js';
import SomeonePaid from './agendas/someone_paid.js';
import SchedulesEveryday from './schedules/schedules_everyday.js';
import Paid from './agendas/paid.js';
import Pix from './agendas/add_pix_to_db.js';
import allowedUsers from './auth/auth.js';
import userHasNoPermission from './utilities/has_no_permissions.js';


// Create a new instance of the bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

new SchedulesEveryday(bot);

const agendaUsersState = {};
const paidState = {};
const pagouState = {};
const pixState = {};


bot.onText(/\/cancel/, (msg) => {
    const userId = msg.from.id;

    if (!allowedUsers(userId)) {
        userHasNoPermission(bot, msg);
        return;
    }

    if (agendaUsersState[userId]) {
        delete agendaUsersState[userId];
    }
    if (paidState[userId]) {
        delete paidState[userId];
    }
    if (pixState[userId]) {
        delete pixState[userId];
    }
    bot.sendMessage(msg.chat.id, 'Operação cancelada', {
        message_thread_id: msg.message_thread_id
    });
});

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
        userHasNoPermission(bot, msg);
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
        userHasNoPermission(bot, msg);
        return;
    }

    if (paidState[userId]) {
        paidState[userId] = {};
    }
    paidState[userId] = new SomeonePaid(bot);
    paidState[userId].addWhoPaid(msg);
});

bot.onText(/\/pagou/, (msg) => {
    const userId = msg.from.id;
    if (!allowedUsers(userId)) {
        userHasNoPermission(bot, msg);
        return;
    }
    pagouState[userId] = new Paid(bot);
    pagouState[userId].paid(msg);
});

bot.onText(/\/registerpix/, (msg) => {
    const userId = msg.from.id;

    if (!allowedUsers(userId)) {
        userHasNoPermission(bot, msg);
        return;
    }

    pixState[userId] = new Pix(bot);
    pixState[userId].addPix(msg);
});

bot.onText(/\/delete/, (msg) => {
    const userId = msg.from.id;
    if (!allowedUsers(userId)) {
        userHasNoPermission(bot, msg);
        return;
    }
});

bot.onText(/\/ia/, (msg) => {});

// Handle user responses
bot.on('message', async (msg) => {
    if (msg.text === '/cancel') {
        return;
    }
    // console.log(msg);
    
    // Get the user ID of the message
    const userId = msg.from.id;

    if (agendaUsersState[userId] && (agendaUsersState[userId].stage === 'title' || agendaUsersState[userId].stage === 'newPix') ) {
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

    if (pixState[userId] && pixState[userId].isStagePixChave) {
        const isCompleted = pixState[userId].handleResponse(msg);
        if (isCompleted) {
            delete pixState[userId];
        }
    }
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
    if (callbackQuery.data === '/cancel') {
        return;
    }
    // Get the user ID of the message
    const userId = callbackQuery.from.id;

    if (agendaUsersState[userId]) {
        agendaUsersState[userId].handleKeyboard(callbackQuery);
    }
    if (paidState[userId]) {
        paidState[userId].handlePaid(callbackQuery);
    }
    if (pixState[userId]) {
        pixState[userId].handlePix(callbackQuery);
    }
    if (pagouState[userId]) {
        pagouState[userId].handlePaid(callbackQuery);
    }
});
