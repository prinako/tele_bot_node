// const { updateAgendaPayment } = require("../DB/querys/querys");
// const allAgendaAsKeyboard = require("../utilities/all_agenda_as_keyboard");
// const agendaFormatter = require("../utilities/agenda_formatter");

import { updateAgendaPayment } from "../DB/querys/querys.js";
import allAgendaAsKeyboard from "../utilities/all_agenda_as_keyboard.js";
import agendaFormatter from "../utilities/agenda_formatter.js";

class paid{
    constructor(bot){
        this.bot = bot

        this._selectedAgendaId = '';
    }

    get selectedAgendaId(){
        return this._selectedAgendaId;
    }

    set selectedAgendaId(v){
        this._selectedAgendaId = v;
    }

    async paid(msg){
        await this._getAllAgendas(msg);
    }

    /**
     * Retrieves all agendas from the database and generates a keyboard for the user to select who paid.
     * @param {Message} msg - The Telegram message object.
     * @return {Promise<void>}
     */
    async _getAllAgendas(msg) {
        // Get all agendas from the database and generate a keyboard
        const buttons = await new Promise((resolve) => {
            // Use the allAgendaAsKeyboard function to generate the keyboard
            // The function takes the user ID and the context ('paid') as parameters
            // and resolves with the generated keyboard or undefined if no agendas are found
            allAgendaAsKeyboard(msg.from.id, 'paid', resolve);
        });

        // Create a response message based on whether the keyboard was generated or not
        const responseMessage = buttons
            ? 'Por favor, selecione o fatura:\n\nPor favor, selecione o fatura que voce marca:'
            : 'Voce nao tem nenhuma fatura encontrada';

        // Send the message with the keyboard to the user
        this.bot.sendMessage(msg.chat.id, responseMessage, {
            message_thread_id: msg.message_thread_id,
            reply_markup: buttons ? { inline_keyboard: buttons } : undefined
        });
    }
    async addToDatabase(callbackQuery, data){
        const msg = callbackQuery.message;
        const topicId = process.env.PAID_THREAD_ID;
        await updateAgendaPayment(this.selectedAgendaId, data, (updateAgenda) => {
            if(updateAgenda) {
                const alert =  `A conta deª *${updateAgenda.title}* no valor de *${updateAgenda.amount}* com vencimento para *${updateAgenda.date}* foi marcada como paga. ✅`;
                this.bot.editMessageText(alert, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[]],
                        remove_keyboard: true
                    },
                });


                this.bot.sendMessage(updateAgenda.chatId, alert, {
                    message_thread_id: topicId,
                    message_id: updateAgenda.messageThreadId,
                    parse_mode: 'Markdown',

                })
            }
        })
    }

    async handlePaid(callbackQuery){
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const message_id = callbackQuery.message.message_id;
        if(data.startsWith('paid_')){
            this.selectedAgendaId = data.split('_')[1];

            await this.addToDatabase(callbackQuery, {
                isPaid: true
            });
        }
    }
}

export default paid;