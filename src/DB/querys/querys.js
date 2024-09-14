const { AgendaPaymentSchema } = require('../schema/schema.js');
const { connectDB, disconnectDB } = require('../connectDB/mongoDB.js');


/**
 * Inserts a new document into the AgendaPayment collection.
 * @param {Object} data - The data [Object]  to be inserted into the collection.
 * @param {Function} next - A callback function that will be called with a boolean argument indicating whether the document was inserted successfully.
 * @return {Promise} A promise that resolves with the document that was inserted, or rejects if there was an error.
 */
async function insetAgendaPayment(data, next) {
    const connect = await connectDB();
    if (!connect) {
        return false;
    }
    // Create a new instance of the AgendaPaymentSchema model
    const agenda = new AgendaPaymentSchema(data);
    // Save the document to the collection
    await agenda.save().then(async () => {
        // Disconnect from the database
        await disconnectDB();
        // Call the callback with true, indicating that the document was inserted successfully
        return next(true);
    }).catch(async err => {
        // Log any errors that occurred
        console.log(err);
        // Disconnect from the database
        await disconnectDB();
        // Call the callback with false, indicating that there was an error inserting the document
        return next(false);
    });
}

/**
 * Retrieves all documents from the AgendaPayment collection that match the given senderId
 * and isPaid = false.
 * @param {number} senderId - The senderId to search for.
 * @param {Function} next - A callback function that will be called with the result of the query.
 * @return {Promise} A promise that resolves with the result of the query, or rejects if there was an error.
 */
async function getAllAgendaPayment(senderId, next) {
    const connect = await connectDB();
    if (connect) {
        // Find all documents that match the given senderId and isPaid = false
        await AgendaPaymentSchema.find({
            senderId: senderId,
            isPaid: false
        }).exec()
        .then(async (result) => {
            // Disconnect from the database
            await disconnectDB();
            // Call the callback with the result of the query
            return next(result);
        })
        .catch(async err => {
            // Log any errors that occurred
            console.log(err);
            // Disconnect from the database
            await disconnectDB();
            // Call the callback with false, indicating that there was an error
            return next(false);
        });
    }
    return next(false);
}

async function updateAgendaPayment(id, data, next) {
    const connect = await connectDB();
    if (connect) {
        // Find the document with the given id
        await AgendaPaymentSchema.findByIdAndUpdate(id, data, { new: true })
        .exec()
        .then(async (result) => {
            // Disconnect from the database
            await disconnectDB();
            // Call the callback with the result of the query
            return next(result);
        })
        .catch(async err => {
            // Log any errors that occurred
            console.log(err);
            // Disconnect from the database
            await disconnectDB();
            // Call the callback with false, indicating that there was an error
            return next(false);
        });
    }
    return next(false);
}

async function deleteAgendaPayment() {}

module.exports = {
    insetAgendaPayment,
    getAllAgendaPayment,
    deleteAgendaPayment,
    updateAgendaPayment,
}
