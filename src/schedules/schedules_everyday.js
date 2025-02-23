// const cron = require('node-cron');
// const {getAllAgendaPayment} = require('../DB/querys/querys.js');
// const agendaFormatter = require('../utilities/agenda_formatter.js');
// const constantPayment = require('../utilities/constante_payment.js');


import cron from 'node-cron';
import {getAllAgendaPayment} from '../DB/querys/querys.js';
import agendaFormatter from '../utilities/agenda_formatter.js';
import constantPayment from '../utilities/constant_payment.js';

/**
 * A class that checks if there are any agendas to notify the user.
 */
class SchedulesEveryday {
    /**
     * Constructor for the SchedulesEveryday class.
     * @param {TelegramBot} bot - The Telegram bot instance.
     */
    constructor(bot) {
        this.bot = bot;
        this.runEveryday();
        /**
         * Check if there are any agendas to notify the user.
         * @return {void}
         */
    }

    /**
     * Runs the checkIfNeedToNotify function every day at 9:00 AM.
     * @return {void}
     */
    runEveryday() {
        cron.schedule('0 9 * * *', async () => {
            // Check if there are any agendas that need to be notified
            this._checkIfNeedToNotify();
        });
    }
    
    /**
     * Checks if there are any agendas that need to be notified.
     * If today is 3, 2 or 1 day before the agenda date, a message is sent to the user with the agenda details
     * and the notification that there are x days left.
     * @return {void}
     */
    async _checkIfNeedToNotify() {
        const today = new Date();

        // Get all agendas from the database
        await getAllAgendaPayment((allAgendas) => {
            if (allAgendas) {
                // Loop through each agenda
                allAgendas.forEach(agenda => {
                    const agendaDay = Number(agenda.date.split('/')[0]);

                    // Check if today is 3 days before the agenda date
                    if ((agendaDay - 3) === today.getDate()) {
                        // Format the agenda details
                        const formattedAgenda = agendaFormatter(agenda);

                        // Send a message to the user with the agenda details
                        // and the notification that there are 3 days left
                        this.bot.sendMessage(agenda.chatId, formattedAgenda +`Faltam 3 dias para a data de vencimento`,{
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        });
                    }
                    // Check if today is 2 days before the agenda date
                    else if ((agendaDay - 2) === today.getDate()) {
                        // Format the agenda details
                        const formattedAgenda = agendaFormatter(agenda);

                        // Send a message to the user with the agenda details
                        // and the notification that there are 2 days left
                        this.bot.sendMessage(agenda.chatId, formattedAgenda +`Faltam 2 dias para a data de vencimento`,{
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        });
                    }
                    // Check if today is 1 day before the agenda date
                    else if ((agendaDay - 1) === today.getDate()) {
                        // Format the agenda details
                        const formattedAgenda = agendaFormatter(agenda);

                        // Send a message to the user with the agenda details
                        // and the notification that there is 1 day left
                        this.bot.sendMessage(agenda.chatId, formattedAgenda +`Faltam 1 dia para a data de vencimento`,{
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        });
                    }else if(agendaDay === today.getDate()){
                        const formattedAgenda = agendaFormatter(agenda);
                        this.bot.sendMessage(agenda.chatId, formattedAgenda + `Hoje é a data de vencimento`, {
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        })
                    }
                })
            }
        });
    }

    async _constantePaymentNotify() {
        const today = new Date();

        const connectAgenda = constantPayment() 
        connectAgenda.forEach(agenda => {
            const month = today.getMonth() + 1;
            const year = today.getFullYear();
            agenda.day = `${agenda.day}/${month}/${year}`;

            const formattedAgenda = agendaFormatter(agenda);
            this.bot.sendMessage(agenda.chatId, formattedAgenda, {
                message_thread_id: agenda.topicId,
                parse_mode: 'Markdown'
            });
        })
    }
}

export default SchedulesEveryday;