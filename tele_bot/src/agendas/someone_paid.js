// const {updateAgendaPayment, getAgendaPaymentById } = require('../api/backendClient.js');
// const agendaFormatter = require('../utilities/agenda_formatter.js');
// const allAgendaAsKeyboard = require('../utilities/all_agenda_as_keyboard.js');

import { updateAgendaPayment, getAgendaPaymentById } from '../api/backendClient.js';
import agendaFormatter from '../utilities/agenda_formatter.js';
import allAgendaAsKeyboard from '../utilities/all_agenda_as_keyboard.js';

class SomeonePaid {
    /**
     * Constructor for the SomeonePaid class.
     * @param {TelegramBot} bot - The Telegram bot instance.
     * @return {void}
     */
    constructor(bot) {
        this.bot = bot;
        this._selectedAgendaId = '';
        this._members = [];
    }

    get selectedAgendaId() { return this._selectedAgendaId; }
    set selectedAgendaId(v) { this._selectedAgendaId = v; }

    get members() { return this._members; }
    set members(v) { this._members = Array.isArray(v) ? v : []; }

    /**
     * Retrieves all agendas from the database and generates a keyboard for the user to select who paid.
     * @param {Message} msg - The Telegram message object.
     * @return {Promise<void>}
     */
    async addWhoPaid(msg) {
        await this.getAllAgendasKeyboard(msg);
    }

    /**
     * Retrieves all agendas from the database and generates a keyboard for the user to select who paid.
     * @param {Message} msg - The Telegram message object.
     * @return {Promise<void>}
     */
    async getAllAgendasKeyboard(msg) {
        const buttons = await allAgendaAsKeyboard(msg.from.id, 'someonePaid');
        if (buttons) {
            this.bot.sendMessage(msg.chat.id, 'Vamos adicionar quem pagou a parte ele\n\nPor favor, selecione o fatura:', {
                message_thread_id: msg.message_thread_id,
                reply_markup: {
                    inline_keyboard: buttons
                }
            });
        }
    }

    /**
     * Generates a keyboard for selecting which responsible member has paid.
     * @return {Object[][]} a 2D array of Telegram inline keyboard buttons.
     */
    listOfMembersAsKeyboard() {
        const memberButtons = this.members
            .filter((member) => member.isResponsible !== false)
            .map((member) => ([{
                text: `${member.displayName || member.telegramId} ${member.isPaid ? '✅' : '❌'}`,
                callback_data: `member_${member.telegramId}`
            }]));

        return [
            [{
                text: 'Tudo mundo pagou',
                callback_data: 'all'
            }],
            ...memberButtons,
            [{
                text: 'Confirmar',
                callback_data: 'done'
            }]
        ];
    }

    /**
     * Updates the selected agenda members in the database.
     * @param {Object} callbackQuery - The callback query object sent by the user.
     * @return {Promise<void>}
     */
    async addToDatabase(callbackQuery) {
        const msg = callbackQuery.message;
        let updateAgenda = false;

        for (const member of this.members.filter((item) => item.isResponsible !== false)) {
            updateAgenda = await updateAgendaPayment(this.selectedAgendaId, {
                isPaid: member.isPaid,
                telegramId: member.telegramId
            });
        }

        if (updateAgenda) {
            const refreshedAgenda = await getAgendaPaymentById(this.selectedAgendaId);
            const formattedAgenda = agendaFormatter(refreshedAgenda || updateAgenda);

            this.bot.editMessageText(formattedAgenda, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[]],
                    remove_keyboard: true
                },
            });

            this.bot.sendMessage(updateAgenda.chatId, formattedAgenda, {
                message_thread_id: updateAgenda.topicId,
                message_id: updateAgenda.messageThreadId,
                parse_mode: 'Markdown',
            });
        } else {
            this.bot.sendMessage(msg.chat.id, 'Ocorreu um erro ao atualizar a fatura. Por favor, tente novamente.');
        }
    }

    /**
     * Handles callback queries from the user.
     * @param {Object} callbackQuery - The callback query object sent by the user.
     */
    async handlePaid(callbackQuery) {
        const msg = callbackQuery.message;
        const data = callbackQuery.data;

        if (data.startsWith('someonePaid_')) {
            this.selectedAgendaId = data.split('_')[1];

            const result = await getAgendaPaymentById(this.selectedAgendaId);
            if (result) {
                this.members = result.members;
                this.resend(msg);
            }
            return;
        }

        if (data.startsWith('member_')) {
            const telegramId = Number(data.split('_')[1]);
            this.members = this.members.map((member) => (
                member.telegramId === telegramId
                    ? { ...member, isPaid: !member.isPaid }
                    : member
            ));
            this.resend(msg);
            return;
        }

        switch (data) {
            case 'all':
                this.members = this.members.map((member) => ({ ...member, isPaid: true }));
                await this.addToDatabase(callbackQuery);
                break;
            case 'done':
                await this.addToDatabase(callbackQuery);
                break;
        }
    }

    /**
     * Re-sends the message with the list of people who paid.
     * @param {Object} msg - The Telegram message object.
     */
    resend(msg) {
        this.bot.editMessageText('Por favor, selecione o quem pagou:', {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: this.listOfMembersAsKeyboard()
            }
        });
    }
}

export default SomeonePaid;
