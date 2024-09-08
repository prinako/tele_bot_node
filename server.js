const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');

// Create a new instance of the bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Store user state
const userState = {};

// Function to create a keyboard for selecting months
// Function to create a keyboard for selecting months
function generateMonthKeyboard() {
    const months = moment.months();
    // Group months into rows of 3 for example
    const monthsInRows = [];
    for (let i = 0; i < months.length; i += 3) {
        monthsInRows.push(months.slice(i, i + 3));
    }
    return monthsInRows.map(month => month.map(m => ({ text: m, callback_data: `month_${m}` })));
}

// Function to create a keyboard for selecting days of a given month
// Function to create a keyboard for selecting days of a given month
function generateDayKeyboard(year, month) {
    const daysInMonth = moment(`${year}-${month}`, 'YYYY-MM').daysInMonth();
    const calendar = [];
    
    // Add days of the month to the keyboard, grouped in rows of 7
    for (let day = 1; day <= daysInMonth; day++) {
        if (day % 7 === 1 && day !== 1) {
            calendar.push([]);
        }
        calendar[calendar.length - 1] = calendar[calendar.length - 1] || [];
        calendar[calendar.length - 1].push({
            text: day < 10 ? `0${day}` : day.toString(),
            callback_data: `day_${year}_${month}_${day}`
        });
    }
    
    return calendar;
}


// Command /start to initiate the month selection
bot.onText(/\/agenda/, (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { stage: 'selectMonth' };

    bot.sendMessage(chatId, 'Please select a month:', {
        reply_markup: {
            keyboard: generateMonthKeyboard(),
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});

// Handle user responses
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userText = msg.text;
    console.log(userState);

    if (userState[chatId] && userState[chatId].stage === 'selectMonth') {
        const monthIndex = moment.months().indexOf(userText);
        console.log(monthIndex);
        
        if (monthIndex === -1) {
            bot.sendMessage(chatId, 'Please select a valid month.');
            return;
        }

        const year = moment().year();
        userState[chatId].selectedMonth = monthIndex + 1; // Month is 1-indexed
        userState[chatId].stage = 'selectDay';

        bot.sendMessage(chatId, `You selected ${userText}. Now select a day:`, {
            reply_markup: {
                keyboard: generateDayKeyboard(year, userState[chatId].selectedMonth),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else if (userState[chatId] && userState[chatId].stage === 'selectDay') {
        const selectedDay = userText;
        const month = userState[chatId].selectedMonth;
        console.log(selectedDay, month);
        const year = moment().year();
        let date = `${year}-${month < 10 ? `0${month}` : month}-${selectedDay}`;
        console.log(date);

        if (moment(date, 'YYYY-MM-DD', true).isValid()) {
            bot.sendMessage(chatId, `You selected: ${selectedDay}/${month}/${year}`, {
                reply_markup: {
                    remove_keyboard: true // Remove the keyboard after selection
                }
            });

            // Reset user state
            delete userState[chatId];
        } else {
            bot.sendMessage(chatId, 'Please select a valid day.');
        }
    }
});
