const { getAllAgendaPaymentBySender } = require("../DB/querys/querys");
const generateBtn = require("../utilities/generate_btn.js");

/**
 * Retrieves all agendas from the database and generates a keyboard for the user to select which one to proceed with.
 * @param {number} userID - The Telegram user ID.
 * @param {string} name - The namespace to be used for the callback_data.
 * @param {Function} next - The callback function to call with the generated buttons.
 * @return {Promise<void>}
 */
async function allAgendaAsKeyboard(userID, name, next) {
    // Get all agendas from the database
    await getAllAgendaPaymentBySender(userID, (result) => {
        if (result) {
            // Generate a keyboard with the agendas
            generateBtn(result, name, next);
        }
    });
}

module.exports = allAgendaAsKeyboard