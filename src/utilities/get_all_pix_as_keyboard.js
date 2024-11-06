const { getUserPixBySenderBank } = require("../DB/querys/querys");
const generateBtn = require("./generate_btn")



/**
 * Retrieves all PIX from the database for a given sender ID and bank type,
 * and generates a keyboard for the user to select which one to proceed with.
 * @param {number} senderId - The Telegram user ID.
 * @param {string} bank - The type of bank account.
 * @param {string} name - The namespace to be used for the callback_data.
 * @param {Function} next - The callback function to call with the generated buttons.
 * @return {Promise<void>}
 */
async function getUserPixBySenderBankAsKeyboard(senderId, bank, name, next) {
    // Get all pix from database
    await getUserPixBySenderBank(senderId, bank, (result) => {
        if (result) {
            // Generate a keyboard with the pix
            generateBtn(result, name, next);
        }
        // return next(false);
    });
}

module.exports = getUserPixBySenderBankAsKeyboard