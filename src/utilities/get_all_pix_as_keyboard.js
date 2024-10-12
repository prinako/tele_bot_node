const { getAllPix } = require("../DB/querys/querys");
const generateBtn = require("./generate_btn")


/**
 * Get all pix from database and generate a keyboard to be used in telegram bot.
 * @param {number} senderId - The senderId to search for.
 * @param {string} name - The namespace to be used for the callback_data.
 * @param {function} next - The callback function to call with the generated buttons.
 */
async function getAllPixAsKeyboard(senderId, name, next) {
    // Get all pix from database
    await getAllPix(senderId, (result) => {
        if (result) {
            // Generate a keyboard with the pix
            generateBtn(result, name, next);
        }
    });
}

module.exports = getAllPixAsKeyboard