// const {updateAgendaPayment, getAgendaPaymentById } = require('../DB/querys/querys.js');
// const agendaFormatter = require('../utilities/agenda_formatter.js');
// const allAgendaAsKeyboard = require('../utilities/all_agenda_as_keyboard.js');

import {updateAgendaPayment, getAgendaPaymentById } from '../DB/querys/querys.js';
import agendaFormatter from '../utilities/agenda_formatter.js';
import allAgendaAsKeyboard from '../utilities/all_agenda_as_keyboard.js';

class SomeonePaid {
      /**
     * Constructor for the AgendaPayment class.
     * Initializes the userState object and the bot instance.
     * @param {TelegramBot} bot - The Telegram bot instance.
     * @return {void}
     */
    constructor(bot) {
        this.bot = bot;

        // Initialize state properties
        this._selectedAgendaId = '';
        this._prince = false;
        this._frank = false;
        this._sadat = false;
    }

    get selectedAgendaId() { return this._selectedAgendaId; } 
    set selectedAgendaId(v) { this._selectedAgendaId = v; }

    get prince() { return this._prince; }
    set prince(v) { this._prince = v; }

    get frank() { return this._frank; }
    set frank(v) { this._frank = v; }

    get sadat() { return this._sadat; }
    set sadat(v) { this._sadat = v; }
 
    /**
     * Retrieves all agendas from the database and generates a keyboard for the user to select who paid.
     * @param {Message} msg - The Telegram message object.
     * @return {Promise<void>}
     */
    async addWhoPaid(msg) {
        // Get all agendas from the database and generate a keyboard for the user to select who paid
        await this.getAllAgendasKeyboard(msg);
    }

    /**
     * Retrieves all agendas from the database and generates a keyboard for the user to select who paid.
     * @param {Message} msg - The Telegram message object.
     * @return {Promise<void>}
     */
    async getAllAgendasKeyboard(msg) {
        // Get all agendas from the database
        const buttons = await allAgendaAsKeyboard(msg.from.id, 'someonePaid');
        if (buttons) {
            // Send a message with the keyboard to the user
            this.bot.sendMessage(msg.chat.id, 'Vamos adicionar quem pagou a parte ele\n\nPor favor, selecione o fatura:', {
                message_thread_id: msg.message_thread_id,
                reply_markup: {
                    inline_keyboard: buttons // Send the buttons
                }
            });
        }
    }

    /**
     * Generates a keyboard for selecting who paid.
     * @return {Object[][]} a 2D array of objects where each object has a text and a callback_data property.
     */
    listOfMenbersAsKeyboard() {
        const options = [
            [ /* All members have paid */
                {
                    text: 'Tudo mundo pagou',
                    callback_data: 'all'
                }
            ],
            [ /* Sadat has paid */
                {
                    text: this.sadat ? 'Sadat ✅' : 'Sadat ❌',
                    callback_data: 'sadat'
                },
            ],
            [ /* Sam has paid */
                {
                    text: this.frank ? 'Frank ✅' : 'Frank ❌',
                    callback_data: 'frank'
                },
            ],
            [ /* Prince has paid */
                {
                    text: this.prince ? 'Prince ✅' : 'Prince ❌',
                    callback_data: 'prince'
                }
            ],
            [
                {
                    text: 'Confirmar',
                    callback_data: 'done'
                }
            ]
        ]
        return options
    }

    /**
     * Updates the agenda in the database with the new information.
     * @param {Object} callbackQuery - The callback query object sent by the user.
     * @param {Object} data - The new information to be added to the agenda.
     * @return {Promise<void>}
     */
    async addToDatabase(callbackQuery, data) {
        const msg = callbackQuery.message;

        // Update the agenda in the database
        const updateAgenda = await updateAgendaPayment(this.selectedAgendaId, data);

        if (updateAgenda) {
            // Format the agenda for display
            const formattedAgenda = agendaFormatter(updateAgenda);

            // Edit the message with the new information
            this.bot.editMessageText(formattedAgenda, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[]],
                    remove_keyboard: true
                },
            });

            // Send a copy of the message to the topic
            this.bot.sendMessage(updateAgenda.chatId, formattedAgenda, {
                message_thread_id: updateAgenda.topicId,
                message_id: updateAgenda.messageThreadId,
                parse_mode: 'Markdown',
            });
        }else {
            // Send an error message to the user
            this.bot.sendMessage(msg.chat.id, 'Ocorreu um erro ao atualizar a fatura. Por favor, tente novamente.');
        }
    }

    /**
     * Handles callback queries from the user.
     * Depending on the current stage of the interaction, the user's response will be handled differently.
     * @param {Object} callbackQuery - The callback query object sent by the user.
     */
    async handlePaid(callbackQuery) {
        const msg = callbackQuery.message;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const messageThreadId = callbackQuery.message_thread_id;
        
        console.log(data)
        // If the user selected an agenda, show the list of people who paid
        if (data.startsWith('someonePaid_')) {
            this.selectedAgendaId = data.split('_')[1];

            const result = await getAgendaPaymentById(this.selectedAgendaId);
            if (result) {
                this.sadat = result.sadat
                this.frank = result.frank
                this.prince = result.prince

                this.resend(msg)
            }
        }

        // Switch statement to handle user's response
        switch (data) {
            case 'all':
                // If the user selected "all", set all members as true
                {
                    this.prince = true
                    this.frank = true
                    this.sadat = true

                    const data = {
                        sadat: this.sadat,
                        frank: this.frank,
                        prince: this.prince
                    }
                    await this.addToDatabase(callbackQuery, data);
                }
                break
            case 'sadat':
                // If the user selected "Sadat", set Sadat as true
                {
                    this.sadat = !this.sadat
                    this.resend(msg)
                }
                break
            case 'frank':
                // If the user selected "Frank", set Sam as true
                {
                    this.frank = !this.frank
                    this.resend(msg)
                }
                break
            case 'prince':
                // If the user selected "Prince", set Prince as true
                {
                    this.prince = !this.prince
                    this.resend(msg)
                }
                break
            case 'done':
                {
                    const data = {
                        sadat: this.sadat,
                        frank: this.frank,
                        prince: this.prince
                    }
                    await this.addToDatabase(callbackQuery, data);
                }
                break
        }
    }

    /**
     * Re-sends the message with the list of people who paid.
     * Used to re-show the list after a user selects an agenda.
     * @param {Object} msg - The Telegram message object.
     */
    resend(msg) {
        this.bot.editMessageText(`Por favor, selecione o quem pagou:`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: this.listOfMenbersAsKeyboard()
            }
        })
    }
}


export default SomeonePaid;