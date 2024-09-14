const {getAllAgendaPayment} = require('../DB/querys/querys.js');
const agendaFormatter = require('../utilities/agenda_formatter.js');

class ListOfAllAgendas {

    constructor(bot) {
        this.bot = bot;
    }

    async getAllAgendasDB(msg) {
        await getAllAgendaPayment(msg.from.id, (result) => {
            if (result) {
                result.forEach(element => {
                    const formattedAgenda = agendaFormatter(element);
                    this.bot.sendMessage(msg.chat.id, formattedAgenda, {
                        message_thread_id: msg.message_thread_id
                    });
                    
                });

            }
        });
    }

}