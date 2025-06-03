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
     * Initializes the bot instance and starts the daily schedule.
     * 
     * @param {TelegramBot} bot - The Telegram bot instance.
     * @return {void}
     */
    constructor(bot) {
        /**
         * The Telegram bot instance used for sending notifications.
         * @type {TelegramBot}
         */
        this.bot = bot;

        // Start the daily scheduling task
        this.runEveryday();

        /**
         * Initiates a check for any agendas that need user notifications.
         * This ensures that users are updated on pending tasks regularly.
         * @return {void}
         */
    }

    /**
     * Schedules a daily task to run the _checkIfNeedToNotify method
     * every day at 9:00 AM. This ensures that any pending agenda notifications
     * are checked and sent to users on a regular basis.
     * 
     * @return {void}
     */
    runEveryday() {
        /**
         * Cron expression to run the _checkIfNeedToNotify method at 9:00 AM every day.
         * The expression is in the format:
         *   second (0-59)
         *   minute (0-59)
         *   hour (0-23)
         *   day of the month (1-31)
         *   month (0-11)
         *   day of the week (0-6)
         * 
         * In this case, the expression is set to run the method at 9:00 AM every day.
         */
        cron.schedule('0 9 * * *', this._checkIfNeedToNotify.bind(this));
    }
    
    /**
     * Checks if there are any agendas that need to be notified.
     * If today is 3, 2 or 1 day before the agenda date, a message is sent to the user with the agenda details
     * and the notification that there are x days left.
     * @return {void}
     */
    async _checkIfNeedToNotify() {
        const dateNow = new Date();
        const today = dateNow.getDate();
        const month = dateNow.getMonth() + 1;
        const year = dateNow.getFullYear();
        // Get all agendas from the database
        await getAllAgendaPayment(async (allAgendas) => {
            if (allAgendas) {
                // Loop through each agenda
                allAgendas.forEach(async (agenda) => {
                    const agendaDay = Number(agenda.date.split('/')[0]);
                    const agendaMonth = Number(agenda.date.split('/')[1]);
                    const agendaYear = Number(agenda.date.split('/')[2]);
                    
                    if (agendaMonth !== month || agendaYear !== year) {
                        // If the agenda month or year is different from the current month or year, skip the agenda
                        return;
                    }
                    // Check if today is 3 days before the agenda date
                    if ((agendaDay - 3) === today) {
                        // Format the agenda details
                        const formattedAgenda = agendaFormatter(agenda);

                        // Send a message to the user with the agenda details
                        // and the notification that there are 3 days left
                        await this.bot.sendMessage(agenda.chatId, formattedAgenda +`Faltam 3 dias para a data de vencimento`,{
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        });
                    }
                    // Check if today is 2 days before the agenda date
                    else if ((agendaDay - 2) === today) {
                        // Format the agenda details
                        const formattedAgenda = agendaFormatter(agenda);

                        // Send a message to the user with the agenda details
                        // and the notification that there are 2 days left
                        await this.bot.sendMessage(agenda.chatId, formattedAgenda +`Faltam 2 dias para a data de vencimento`,{
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        });
                    }
                    // Check if today is 1 day before the agenda date
                    else if ((agendaDay - 1) === today) {
                        // Format the agenda details
                        const formattedAgenda = agendaFormatter(agenda);

                        // Send a message to the user with the agenda details
                        // and the notification that there is 1 day left
                        await this.bot.sendMessage(agenda.chatId, formattedAgenda +`Faltam 1 dia para a data de vencimento`,{
                            message_thread_id: agenda.topicId,
                            parse_mode: 'Markdown'
                        });
                    }else if(agendaDay === today){
                        const formattedAgenda = agendaFormatter(agenda);
                        await this.bot.sendMessage(agenda.chatId, formattedAgenda + `Hoje é a data de vencimento`, {
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