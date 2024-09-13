const { AgendaPaymentSchema } = require('../schema/schema.js');
const { connectDB, disconnectDB } = require('../connectDB/mongoDB.js');


async function insetAgendaPayment(data, next) {
    const connect = await connectDB();
    if (!connect) {
        return false;
    }
    const agenda = new AgendaPaymentSchema(data);
    await agenda.save().then(async () =>{
        await disconnectDB();
        return next(true);
    }).catch(async err => {
        console.log(err)
        await disconnectDB();
        return next(false);
    });
}

async function getAgendaPayment() {
    const connect = await connectDB();
    if (connect) {
        const result = await AgendaPaymentSchema.find();
        if (result) {
            await disconnectDB();
            return result;
        }
    }
    return false;
}

module.exports = {
    insetAgendaPayment,
    getAgendaPayment,
}
