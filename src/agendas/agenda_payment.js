const moment = require('moment');
const { insetAgendaPayment} = require('../DB/querys/querys.js');
const agendaFormatter = require('../utilities/agenda_formatter.js');

class AgendaPayment {
    /**
     * Constructor for the AgendaPayment class.
     * Initializes the userState object and the bot instance.
     * @param {TelegramBot} bot - The Telegram bot instance.
     * @return {void}
     */
    constructor(bot) {
        this.bot = bot; // Store the bot instance

        // Initialize state properties
        this._stage = 'selectMonth'; // Initialize the stage to 'selectMonth'
        this._selectedMonth = '';
        this._selectedDay = '';
        this._selectedTitle = '';
        this._selectedAmount = '';
        this._selectedDescription = '';
        this._selectedPix = '';
        this._selectedBank = '';
        this._stageTracker = false;
    }

    /**
     * Setters and getters for stage, selectedMonth, and selectedDay
     * These properties are used to store the current state of the user's interaction
     * with the bot.
     */
    set stage(v) { this._stage = v; }
    /**
     * @return {string} the current stage of interaction
     */

    /**
     * @return {string} the current stage of interaction
     */
    get stage() { return this._stage; }

    /**
     * @return {string} the selected month
     */
    get selectedMonth() { return this._selectedMonth; }

    /**
     * @return {string} the selected day
     */
    get selectedDay() { return this._selectedDay; }

    /**
     * @param {string} v the selected month
     */
    set selectedMonth(v) { this._selectedMonth = v; }
    /**
     * @param {string} v the selected day
     */
    set selectedDay(v) { this._selectedDay = v; }

    // Setters and getters for selectedTitle, selectedAmount, selectedDescription, selectedPix, and selectedBank
    // These properties are used to store the current state of the user's interaction with the bot.

    /**
     * @param {string} v the selected title
     */
    set selectedTitle(v) { this._selectedTitle = v; }
    /**
     * @return {string} the selected title
     */
    get selectedTitle() { return this._selectedTitle; }

    /**
     * @param {string} v the selected amount
     */
    set selectedAmount(v) { this._selectedAmount = v; }
    /**
     * @return {string} the selected amount
     */
    get selectedAmount() { return this._selectedAmount; }

    /**
     * @param {string} v the selected description
     */
    set selectedDescription(v) { this._selectedDescription = v; }
    /**
     * @return {string} the selected description
     */
    get selectedDescription() { return this._selectedDescription; }

    /**
     * @param {string} v the selected pix
     */
    set selectedPix(v) { this._selectedPix = v; }
    /**
     * @return {string} the selected pix
     */
    get selectedPix() { return this._selectedPix; }

    /**
     * @param {string} v the selected bank
     */
    set selectedBank(v) { this._selectedBank = v; }
    /**
     * @return {string} the selected bank
     */
    get selectedBank() { return this._selectedBank; }

    set stageTracker(v) { this._stageTracker = v; }
    get stageTracker() { return this._stageTracker; }


    /**
     * Generates a keyboard for selecting months.
     * @return {Object[][]} a 2D array of objects where each object has a text and a callback_data property
     */
    generateMonthKeyboard() {
        const months = moment.months();
        const monthsInRows = [];
        for (let i = 0; i < months.length; i += 3) {
            monthsInRows.push(months.slice(i, i + 3));
        }
        return monthsInRows.map(month => month.map(m => ({
            // The text to be displayed on the button
            text: m,
            // The callback data that will be sent when the button is clicked
            callback_data: `month_${m}`
        })));
    }
    /**
     * Generates a keyboard for selecting days of a given month.
     * @param {number} year - The year to generate the days for.
     * @param {number|string} month - The month to generate the days for. Can be a number (1-12) or a string (e.g. 'January').
     * @return {Object[][]} a 2D array of objects where each object has a text and a callback_data property.
     * The outer array is the calendar, and the inner arrays are the weeks.
     */
    generateDayKeyboard(year, month) {
        const daysInMonth = moment(`${year}-${month}`, 'YYYY-MM').daysInMonth();
        const calendar = [];
        
        // Add days of the month to the keyboard, grouped in rows of 7
        let week = [];
        for (let day = 1; day <= daysInMonth; day++) {
            // Format the day as a two-digit string (e.g. '01', '02', etc.)
            const dayString = day < 10 ? `0${day}` : day.toString();

            // Create an object with the day as text and a callback_data property
            // The callback_data is in the format `day_<year>_<month>_<day>`
            const dayObject = {
                text: dayString,
                callback_data: `day_${year}_${month}_${day}`
            };

            // Add the day to the current week
            week.push(dayObject);

            // If the week is full (7 days) or it's the last day, push the week
            if (week.length === 7 || day === daysInMonth) {
                calendar.push(week);
                week = []; // Reset for the next week
            }
        }

        return calendar;
    }

   
    /**
     * Generates a keyboard for selecting banks.
     * @return {Object[][]} a 2D array of objects where each object has a text and a callback_data property
     */
    generateBankKeyboard(){
        // List of banks to be displayed in the keyboard
        const bankList = [
            {text: 'Bradesco', callback_data: 'Bradesco'},
            {text: 'Itau', callback_data: 'Itau'},
            {text: 'Santander', callback_data: 'Santander'},
            {text: 'Caixa', callback_data: 'Caixa'},
            {text: 'Nubank', callback_data: 'Nubank'},
            {text: 'Inter', callback_data: 'Inter'},
            {text: 'Banco do Brasil', callback_data: 'Banco do Brasil'},
            {text: 'Next', callback_data: 'Next'},
            {text: 'C6 Bank', callback_data: 'C6 Bank'},
            {text: 'Picpay', callback_data: 'Picpay'},
            {text: 'Neon', callback_data: 'Neon'},
        ];

        // Group the list of banks in rows of 2
        const groupedBanks = bankList.reduce((acc, cur, idx) => {
            if (idx % 2 === 0) {
                acc.push([cur]);
            } else {
                acc[acc.length - 1].push(cur);
            }
            return acc;
        }, []);

        // Map the grouped banks to the format required by the Telegram API
        return groupedBanks.map(b => b.map(bk => ({ text: bk.text, callback_data: `bank_${bk.callback_data }`})));
    }

    // Function to send a final summary message like the image
    async sendFinalSummary(chatId, messageThreadId, userId) {

        const dueDate = `${this.selectedDay}/${this.selectedMonth}/${moment().year()}`;
        const dataToDB = {
            chatId: chatId,
            senderId: userId,
            messageThreadId: messageThreadId,
            date: dueDate,
            title: this.selectedTitle,
            amount: this.selectedAmount,
            description: this.selectedDescription,
            pix: this.selectedPix,
            bank: this.selectedBank
        } 
        const paymentSummary = agendaFormatter(dataToDB);
        
        await insetAgendaPayment( dataToDB ,(isInseted) =>{
            if (!isInseted) {
                this.bot.sendMessage(chatId, 'Houve um erro ao registrar a fatura. Por favor, tente novamente mais tarde.', {
                    message_thread_id: messageThreadId
                });
                return true;
            }
            // Send the summary message
            this.bot.sendMessage(chatId, paymentSummary, {
            message_thread_id: messageThreadId,
            parse_mode: 'Markdown',
            reply_markup: {
                    remove_keyboard: true
                }
            });

        });
        return true;
    }

    /**
     * Function to handle user responses
     * @param {Object} msg - The message object sent by the user
     * @returns {boolean} Whether the process is complete or not
     */
    handleResponse(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userText = msg.text;
        const messageThreadId = msg.message_thread_id;

        switch (this.stage) {
            case 'pix':
                this.selectedPix = userText;
                this.stage = 'title';
                this.bot.sendMessage(chatId, 'Por favor, digite o título da fatura:', {
                    message_thread_id: messageThreadId
                });
                return false;

            case 'title':
                this.selectedTitle = userText;
                this.stage = 'amount';
                this.bot.sendMessage(chatId, 'Por favor, qual é o valor da fatura?', {
                    message_thread_id: messageThreadId
                });
                return false;

            case 'amount':
                this.selectedAmount = userText;
                this.stage = 'description';
                this.bot.sendMessage(chatId, 'Por favor escreva a descrição da fatura:',{
                    message_thread_id: messageThreadId
                });
                return false;
        
            case 'description':
                this.selectedDescription = userText;
                this.stage = 'finalSummary';
                this.sendFinalSummary(chatId, messageThreadId, userId);
                return true;
        }
    }

    /**
     * Handles callback queries from the user.
     * Depending on the current stage of the interaction, the user's response will be handled differently.
     * @param {Object} callbackQuery - The callback query object sent by the user.
     */
    handleKeyboard(callbackQuery) {
        const msg = callbackQuery.message;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const chatId = msg.chat.id;

        
        // Handle month selection
        if (data.startsWith('month_')) {
            const selectedMonth = data.split('_')[1];
            this.selectedMonth = moment().month(selectedMonth).format('MM');
             this.stage = 'selectDay';

            // Send day selection after month
            const year = moment().year();
            this.bot.editMessageText(`You selected the month of ${selectedMonth}. Now select the day:`, {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard:  this.generateDayKeyboard(year,  this.selectedMonth)
                }
            });
        }

        // Handle day selection
        if (data.startsWith('day_')) {
            const selectedDay = data.split('_')[3];
             this.selectedDay = selectedDay;
             this.stage = 'bank';

            // Remove the day keyboard and ask for bank selection
            this.bot.editMessageText('Por favor selecione seu banco:', {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard:  this.generateBankKeyboard()
                }
            });
        }

        // Handle bank selection
        if (data.startsWith('bank_')) {
            const selectedBank = data.split('_')[1];
             this.selectedBank = selectedBank;
             this.stage = 'pix';

            // Remove the bank keyboard and ask for PIX key
            this.bot.editMessageText(`Voce selecionou o banco ${selectedBank}. Por favor digite sua chave PIX:`, {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [[]],
                    remove_keyboard: true
                }
            });
        }
    }
}



module.exports = AgendaPayment;
