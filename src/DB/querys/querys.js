const { AgendaPaymentSchema, PixSchema } = require('../schema/schema.js');
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
    await agenda.save().then(async (dou) => {
        // Disconnect from the database
        await disconnectDB();
        // Call the callback with true, indicating that the document was inserted successfully
        return next(dou);
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
async function getAllAgendaPaymentBySender(senderId, next) {
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

/**
 * Retrieves all documents from the AgendaPayment collection.
 * @param {Function} next - A callback function that will be called with the result of the query.
 * @return {Promise} A promise that resolves with the result of the query, or rejects if there was an error.
 */
async function getAllAgendaPayment(next) {
    const connect = await connectDB();
    if (connect) {
        // Find all documents in the AgendaPayment collection
        await AgendaPaymentSchema.find({isPaid: false}).exec()
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

async function getAgendaPaymentById(id, next) {
    const connect = await connectDB();
    if (connect) {
    
        // Find the document with the given id
        await AgendaPaymentSchema.findById(id).exec()
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
}

/**
 * Updates a document in the AgendaPayment collection.
 * @param {string} id - The id of the document to be updated.
 * @param {Object} data - The data to be updated.
 * @param {Function} next - A callback function that will be called with the result of the query.
 * @return {Promise} A promise that resolves with the result of the query, or rejects if there was an error.
 */
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


/**
 * Inserts a new document into the PixSchema collection.
 * @param {Object} data - The data [Object]  to be inserted into the collection.
 * @param {Function} next - A callback function that will be called with a boolean argument indicating whether the document was inserted successfully.
 * @return {Promise} A promise that resolves with the document that was inserted, or rejects if there was an error.
 */
async function insetPix(data, next) {
    const connect = await connectDB();
    if (connect) {
        let returnData = {};
        // Create a new instance of the PixSchema model
        const pix = new PixSchema(data);
        // Save the document to the collection
        await pix.save().then(async (dou) => {
            // Disconnect from the database
            // Call the callback with true, indicating that the document was inserted successfully
            returnData = {error: false, returnData: dou};
        }).catch(async err => {
            // Disconnect from the database
            // Log any errors that occurred
            console.log(err);
            returnData = {error: false, returnData: err};
            // Call the callback with false, indicating that there was an error inserting the document
        });
        await disconnectDB();
        return next(returnData);
    }
}


/**
 * Retrieves all PIX documents from the PixSchema collection that match the given senderId and bank.
 * @param {number} senderId - The senderId to search for.
 * @param {string} bank - The bank type to search for.
 * @param {Function} next - A callback function that will be called with the result of the query.
 * @return {Promise<void>}
 */
async function getUserPixBySenderBank(senderId, bank, next) {
    // Connect to the database
    const connect = await connectDB();
    if (connect) {
        // Find all documents that match the given senderId and bank
        await PixSchema.find({senderId: senderId, bank: bank}).exec()
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
    // If connection failed, call the callback with false
    return next(false);
}

/**
 * Updates a document in the PixSchema collection.
 * @param {string} id - The id of the document to be updated.
 * @param {Object} data - The data to be updated.
 * @param {Function} next - A callback function that will be called with the result of the query.
 * @return {Promise} A promise that resolves with the result of the query, or rejects if there was an error.
 */
async function updatePix(id, data, next) {
    const connect = await connectDB();
    if (connect) {
        // Find the document with the given id
        await PixSchema.findByIdAndUpdate(id, data, { new: true })
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
    getAllAgendaPaymentBySender,
    getAgendaPaymentById,
    deleteAgendaPayment,
    updateAgendaPayment,
    insetPix,
    getUserPixBySenderBank,
    updatePix,
}
