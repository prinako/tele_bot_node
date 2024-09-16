const {getAllAgendaPayment, } = require('../DB/querys/querys.js');
const agendaFormatter = require('../utilities/agenda_formatter.js');
const allAgendaAsKeyboard = require('../utilities/all_agenda_as_keyboard.js');

class EditAgenda {
      /**
     * Constructor for the AgendaPayment class.
     * Initializes the userState object and the bot instance.
     * @param {TelegramBot} bot - The Telegram bot instance.
     * @return {void}
     */
    constructor(bot) {
        this.bot = bot;

        // Initialize state properties
        this._stage = 'editAgenda';
        this._selectedSomeOnePaid = [];
        this._selectedTitle = '';
        this._selectedAmuont = '';
        this._selectedDescription = '';
        this._selectedPix = '';
        this._selectedBank = '';
        this._selectedAgendaId = '';
        this._stageTracker = false;
    }

    set stage(v) { this._stage = v; }
    get stage() { return this._stage; }

    get selectedSomeOnePaid() { return this._selectedSomeOnePaid; } 
    set selectedSomeOnePaid(v) { this._selectedSomeOnePaid = [...this._selectedSomeOnePaid , v]; }

    get selectedTitle() { return this._selectedTitle; } 
    set selectedTitle(v) { this._selectedTitle = v; }

    get selectedAmuont() { return this._selectedAmuont; } 
    set selectedAmuont(v) { this._selectedAmuont = v; }

    get selectedDescription() { return this._selectedDescription; } 
    set selectedDescription(v) { this._selectedDescription = v; }

    get selectedPix() { return this._selectedPix; } 
    set selectedPix(v) { this._selectedPix = v; }

    get selectedBank() { return this._selectedBank; } 
    set selectedBank(v) { this._selectedBank = v; }

    get selectedAgendaId() { return this._selectedAgendaId; } 
    set selectedAgendaId(v) { this._selectedAgendaId = v; }

    get stageTracker() { return this._stageTracker; } 
    set stageTracker(v) { this._stageTracker = v; }


    async editAgenda(msg) {
        await this.editAgendasAsKeyboard(msg);
    }

    async editAgendasAsKeyboard(msg) {
        await allAgendaAsKeyboard(msg.from.id,'agenda', (buttons) => {
            if(buttons) {

                this.bot.sendMessage(msg.chat.id, 'Vamos editar o pagamento de fatura em pendente\n\nPor favor, selecione o mês de vencimento:',{
                    message_thread_id: msg.message_thread_id,
                    reply_markup: {
                        inline_keyboard: buttons // Send the buttons
                    }
                });

            }
        })
        
    }

    generateEditAgendaKeyboard() {
        const options = [
            [
                {
                    text: 'Tudo',
                    callback_data: 'edit_all'
                },
                {
                    text: 'Titulo',
                    callback_data: 'edit_title'
                }
            ],
            [
                {
                    text: 'Valor',
                    callback_data: 'edit_amuont'
                },
                {
                    text: 'Descricão',
                    callback_data: 'edit_description'
                }
            ],
            [
                {
                    text: 'Pix',
                    callback_data: 'edit_pix'
                },
                {
                    text: 'Banco',
                    callback_data: 'edit_bank'
                }
            ],
            [
                {
                    text: 'Alguém pagou',    
                    callback_data: 'edit_someone_paid'
                }
            ]
        ]
        return options
    }

    handleResponse(callbackQuery) {
        const msg = callbackQuery.message;
    }

    handleEditAgenda(callbackQuery) {
        const msg = callbackQuery.message;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const messageThreadId = callbackQuery.message_thread_id;
        
        if (data.startsWith('agenda_')){
            this.selectedAgendaId = data.split('_')[1];
            this.bot.editMessageText(`Voce selecionou agenda coom ID: ${this.selectedAgendaId} \n\nPor favor, selecione o que deseja editar:`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard:  this.generateEditAgendaKeyboard()
                }
            })
        }
        switch(data) {
            case 'edit_all':
                this.stage = 'edit_all'
                break
            case 'edit_title':
                this.stage = 'edit_title'
                this.bot.editMessageText('Por favor, digite o novo titulo:', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[]]
                    }
                }
            )
            case 'edit_amuont':
                this.stage = 'edit_amuont'
                this.bot.editMessageText('Por favor, digite o novo valor:', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[]]
                    }
                }
            )
            case 'edit_description':
                this.stage = 'edit_description'
                this.bot.editMessageText('Por favor, digite a nova descricão:', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[]]
                    }
                }
            )

            case 'edit_pix':
                this.stage = 'edit_pix'
                this.bot.editMessageText('Por favor, digite a nova chave PIX:', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[]]
                    }
                }
            )
            case 'edit_bank':
                this.stage = 'edit_bank'
                this.bot.editMessageText('Por favor, digite o novo banco:', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[]]
                    }
                }
            )
            case 'edit_someone_paid':
                this.stage = 'edit_someone_paid'
                this.bot.editMessageText('Por favor, digite o nome do pagador:', {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[]]
                    }
                }
            )
        }
    }
}


module.exports = EditAgenda