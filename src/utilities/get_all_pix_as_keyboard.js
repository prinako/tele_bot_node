// const { getUserPixBySenderBank } = require("../DB/querys/querys");
// const generateBtn = require("./generate_btn")

import {getUserPixBySenderBank} from "../DB/querys/querys.js";
import generateBtn from "./generate_btn.js";

/**
 * Retrieves all PIX from the database for a given sender ID and bank type,
 * and generates a keyboard for the user to select which one to proceed with.
 * @param {number} senderId - The Telegram user ID.
 * @param {string} bank - The type of bank account.
 * @param {string} name - The namespace to be used for the callback_data.
 * @return {Promise} A promise that resolves with the generated buttons, or rejects if there was an error.
 */
async function getUserPixBySenderBankAsKeyboard(senderId, bank, name) {
    // Get all pix from database
    const result = await getUserPixBySenderBank(senderId, bank);
    if (!result || result.length === 0) {
        // Return false if the result is empty
        return false;
    }
    // Generate a keyboard with the pix
    return generateBtn(result, name);
}

export default getUserPixBySenderBankAsKeyboard;