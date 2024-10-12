const { updateAgendaPayment } = require("../DB/querys/querys");
const allAgendaAsKeyboard = require("../utilities/all_agenda_as_keyboard");
const agendaFormatter = require("../utilities/agenda_formatter");

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
        await this.getAllAgendas(msg);
    }

    async getAllAgendas(msg){
        await allAgendaAsKeyboard(msg.from.id,'paid', (buttons) => {
            if(buttons){
                this.bot.sendMessage(msg.chat.id, `Por favor, selecione o fatura:\n\nPor favor, selecione o fatura que voce marca:`, {
                    message_thread_id: msg.message_thread_id,
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                });
            }
        })
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
module.exports = paid;