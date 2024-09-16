const {updateAgendaPayment } = require('../DB/querys/querys.js');
const agendaFormatter = require('../utilities/agenda_formatter.js');
const allAgendaAsKeyboard = require('../utilities/all_agenda_as_keyboard.js');

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
    }

    get selectedAgendaId() { return this._selectedAgendaId; } 
    set selectedAgendaId(v) { this._selectedAgendaId = v; }

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
        await allAgendaAsKeyboard(msg.from.id, 'someonePaid', (buttons) => {
            if (buttons) {
                // Send a message with the keyboard to the user
                this.bot.sendMessage(msg.chat.id, 'Vamos adicionar quem pagou a parte ele\n\nPor favor, selecione o fatura:', {
                    message_thread_id: msg.message_thread_id,
                    reply_markup: {
                        inline_keyboard: buttons // Send the buttons
                    }
                });
            }
        });
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
                    text: 'Sadat',
                    callback_data: 'sadat'
                },
            ],
            [ /* Sam has paid */
                {
                    text: 'Sam',
                    callback_data: 'sam'
                },
            ],
            [ /* Prince has paid */
                {
                    text: 'Prince',
                    callback_data: 'prince'
                }
            ],
        ]
        return options
    }

    async addToDatabase(callbackQuery, data) {
        const msg = callbackQuery.message;
        await updateAgendaPayment(this.selectedAgendaId, data, (updateAgenda) => {
            if(updateAgenda) {
                const formattedAgenda = agendaFormatter(updateAgenda);
                this.bot.editMessageText(formattedAgenda, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[]],
                        remove_keyboard: true
                    },
                });
                this.bot.sendMessage(updateAgenda.chatId,formattedAgenda, {
                    message_thread_id: updateAgenda.topicId,
                    message_id: updateAgenda.messageThreadId,
                    parse_mode: 'Markdown',

                })
            }
        })
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

        // If the user selected an agenda, show the list of people who paid
        if (data.startsWith('someonePaid_')) {
            this.selectedAgendaId = data.split('_')[1];
            this.bot.editMessageText(`Por favor, selecione o quem pagou:`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: this.listOfMenbersAsKeyboard()
                }
            })
        }

        // Switch statement to handle user's response
        switch (data) {
            case 'all':
                // If the user selected "all", set all members as true
                {
                    const data = {
                        sadat: true,
                        sam: true,
                        prince: true
                    }
                    await this.addToDatabase(callbackQuery, data);
                }
                break
            case 'sadat':
                // If the user selected "Sadat", set Sadat as true
                {
                    const data = {
                        sadat: true
                    }
                    await this.addToDatabase(callbackQuery, data);
                }
                break
            case 'sam':
                // If the user selected "Sam", set Sam as true
                {
                    const data = {
                        sam: true
                    }
                    await this.addToDatabase(callbackQuery, data);
                }
                break
            case 'prince':
                // If the user selected "Prince", set Prince as true
                {
                    const data = {
                        prince: true
                    }
                    await this.addToDatabase(callbackQuery, data);
                }
                break
        }
    }
}


module.exports = SomeonePaid;