// const {insetPix, getAllPix, updatePix} = require('../DB/querys/querys');
// const generateBankKeyboard = require('../utilities/generate_banks_keyboard');

import {insetPix, updatePix} from '../DB/querys/querys.js';
import generateBankKeyboard from '../utilities/generate_banks_keyboard.js';


class AddPixToDB {
    /**
     * Constructor for the AddPixToDB class.
     * Initializes the userState object and the bot instance.
     * @param {TelegramBot} bot - The Telegram bot instance.
     */
    constructor(bot) {
        // Initialize state properties
        /**
         * The instance of the Telegram bot.
         * @type {TelegramBot}
         * @private
         */
        this.bot = bot;

        /**
         * The pix to be added to the database.
         * @type {string}
         * @private
         */
        this._pix = '';

        /**
         * The ID of the user who is adding the pix.
         * @type {number}
         * @private
         */
        this._senderId = '';

        /**
         * The type of bank account.
         * @type {string}
         * @private
         */
        this._bank = '';

        /**
         * A flag indicating if the user is currently in the stage of adding the pix chave.
         * @type {boolean}
         * @private
         */
        this._isStagePixChave = false;
    }

    set pix(v) { this._pix = v; }

    get pix() { return this._pix; }

    set senderId(v) { this._senderId = v; }

    get senderId() { return this._senderId; }

    set bank(v) { this._bank = v; }

    get bank() { return this._bank; }

    set isStagePixChave(v) { this._isStagePixChave = v; }

    get isStagePixChave() { return this._isStagePixChave; }


    async addPix(msg) {
        // Get the user ID of the message
        const userId = msg.from.id;
        this._senderId = userId;
        
        generateBankKeyboard(bankBtns => {
            this.bot.sendMessage(msg.chat.id, 'Por favor, selecione o tipo de conta:', {
                message_thread_id: msg.message_thread_id,
                reply_markup: {
                    inline_keyboard: bankBtns
                }
            });
        })
    }


    async addPixToDB(callbackQuery) {
        // Get the user ID of the message
        const msg = callbackQuery.message;
    }

    handlePix(callbackQuery) {
        const msg = callbackQuery.message;
        const userId = msg.from.id;
        const data = callbackQuery.data;
        const messageThreadId = msg.message_thread_id;
        console.log(data)
        
        if (data.startsWith('bank_')) {
            this.isStagePixChave = true;
            this.bank = data.split('_')[1];
            this.bot.editMessageText(`Por favor, digite seu PIX da sua conta  ${this.bank} :`, {
                chat_id: msg.chat.id,
                // message_thread_id: messageThreadId,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [[]],
                    remove_keyboard: true
                }
            });
        }
    }

    handleResponse(msg) {
        const userId = msg.from.id;
        const userText = msg.text;
        const messageThreadId = msg.message_thread_id;

        console.log(userText)
        if (userText === '/cancel') {
            return true;
        }

        if (this.isStagePixChave) {
            this.isStagePixChave = false;
            this.pix = userText;
            this.senderId = userId;
            const data = {
                pix: this.pix,
                senderId: this.senderId,
                bank: this.bank
            };
            this.insetPixToDB(data, userId, messageThreadId);
        }
    }

    /**
     * Inserts a new document into the PixSchema collection.
     * @param {Object} data - The data [Object]  to be inserted into the collection.
     * @param {number} userId - The user ID to be used for the message.
     * @param {number} messageThreadId - The message thread ID to be used for the message.
     * @return {boolean} A boolean indicating if the document was inserted successfully.
     */
    async insetPixToDB(data, userId, messageThreadId) {
        // Insert the document into the collection
        await insetPix(data, (result) => {
            console.log(result)
            if (result.error) {

                if (result.error.code === 11000) {
                    // If there was an error inserting the document, send an error message
                    this.bot.sendMessage(userId, `Seu Pix chave ${this.pix} já existente no banco de dados \nPor favor, cadastre um novo pix.`, {
                        message_thread_id: messageThreadId
                    });

                }else {
                    // If there was an error inserting the document, send an error message
                    this.bot.sendMessage(userId, 'Erro ao adicionar pix!, Por favor, tente novamente', {
                        message_thread_id: messageThreadId
                    });
                }
                return true;
            } 
            // If the document was inserted successfully, send a success message
            this.bot.sendMessage(userId, 'Pix adicionado com sucesso!', {
                message_thread_id: messageThreadId
            });
            return true;
        });
    }
}

export default AddPixToDB;