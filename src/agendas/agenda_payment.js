const moment = require('moment');
const { inlineKeyboard } = require('telegraf/markup');

class AgendaPayment {
    /**
     * Constructor for the AgendaPayment class.
     * Initializes the userState object and the bot instance.
     * @param {TelegramBot} bot - The Telegram bot instance.
     */
    constructor(bot) {
        this.bot = bot; // Store the bot instance

        // Initialize state properties
        this._stage = null;
        this._selectedMonth = null;
        this._selectedDay = null;
        this._selectedTitle = null;
        this._selectedAmount = null;
        this._selectedDescription = null;
        this._selectedPix = null;
        this._selectedBank = null;
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
        return groupedBanks.map(b => b.map(bk => ({ text: bk.text, callback_data: bk.callback_data })));
    }

    // Function to send a final summary message like the image
    sendFinalSummary(chatId, messageThreadId) {
        const dueDate = `${this.selectedDay}/${this.selectedMonth}/${moment().year()}`;
        const paymentSummary = `⚠️⚠️ *ATTENTION ${this.selectedTitle.toUpperCase()} BILL* ⚠️⚠️\n\n` +
            `R$ ${this.selectedAmount} \n\n` +
            `*Vencimento:* ${dueDate}\n\n` +
            `Descricão da fatura: \`${this.selectedDescription}\`\n\n` +
            `Pix Chave (${this.selectedBank}): \`${this.selectedPix}\`\n` +
            '---------------------------';

        this.bot.sendMessage(chatId, paymentSummary, {
            message_thread_id: messageThreadId,
            parse_mode: 'Markdown',
            reply_markup: {
                remove_keyboard: true
            }
        });
    }

    /**
     * Function to handle user responses
     * @param {Object} msg - The message object sent by the user
     * @returns {boolean} Whether the process is complete or not
     */
    handleResponse(msg) {
        const chatId = msg.chat.id;
        const userText = msg.text;
        const messageThreadId = msg.message_thread_id;

        switch (this.stage) {
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
                this.stage = 'bank';
                this.bot.sendMessage(chatId, 'Por favor selecione seu banco:', {
                    message_thread_id: messageThreadId,
                    reply_markup: {
                        keyboard: this.generateBankKeyboard(),
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
                return false;

            case 'bank':
                this.selectedBank = userText;
                this.stage = 'pix';
                this.bot.sendMessage(chatId, 'Por favor digite sua chave PIX:', {
                    message_thread_id: messageThreadId
                });
                return false;
            
            case 'pix':
                this.selectedPix = userText;
                this.stage = 'selectMonth';
                this.bot.sendMessage(chatId, 'Qual é o mês de vencimento?', {
                    message_thread_id: messageThreadId,
                    reply_markup: {
                        keyboard: this.generateMonthKeyboard(),
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
                return false;

            case 'selectMonth':
                const monthIndex = moment.months().indexOf(userText);
            
                if (monthIndex === -1) {
                    this.bot.sendMessage(chatId, 'Por favor escolha um mês válido.', {
                        message_thread_id: messageThreadId
                    });
                    return false;
                }

                const year = moment().year();
                this.selectedMonth = monthIndex + 1; // Month is 1-indexed
                this.stage = 'selectDay';

                this.bot.sendMessage(chatId, `Voce escolheu o mês de ${userText}. Agora escolha o dia:`, {
                    message_thread_id: messageThreadId,
                    reply_markup: {
                        keyboard: this.generateDayKeyboard(year, this.selectedMonth),
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });

                return false;
            case 'selectDay':
                const selectedDay = userText;
                const month = this.selectedMonth;
                this.selectedDay = selectedDay;

                const date = `${moment().year()}-${month < 10 ? `0${month}` : month}-${selectedDay}`;
            
                if (moment(date, 'YYYY-MM-DD', true).isValid()) {
                    this.sendFinalSummary(chatId, messageThreadId);

                    // Reset user state after completion
                    return true;
                } else {
                    this.bot.sendMessage(chatId, 'Por favor escolha um dia valido.', {
                        message_thread_id: messageThreadId
                    });
                    return false;
                }
        }
    }
}

module.exports = { AgendaPayment };
