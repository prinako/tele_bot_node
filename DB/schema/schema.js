const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const agendaPaymentSchema = new Schema({
    chatId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
        required: true
    },
    messageThreadId: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    amount:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    pix: {
        type: String,
        required: true
    },
    bank: {
        type: String,
        required: true
    },
    isPaid: {
        type: Boolean,
        default: false
    }
},{
    timestamps: true
});


const AgendaPaymentSchema = mongoose.model('AgendaPayment', agendaPaymentSchema);
module.exports = {
    AgendaPaymentSchema,
}