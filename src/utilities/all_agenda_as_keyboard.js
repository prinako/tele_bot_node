// const { getAllAgendaPaymentBySender } = require("../DB/querys/querys");
// const generateBtn = require("../utilities/generate_btn.js");


import {getAllAgendaPaymentBySender} from "../DB/querys/querys.js";
import generateBtn from "../utilities/generate_btn.js";

/**
 * Retrieves all agendas from the database and generates a keyboard for the user to select which one to proceed with.
 * @param {number} userID - The Telegram user ID.
 * @param {string} name - The namespace to be used for the callback_data.
 * @param {Function} next - The callback function to call with the generated buttons.
 * @return {Promise<void>}
 */
async function allAgendaAsKeyboard(userID, name) {
    // Get all agendas from the database
    if (name === 'someonePaid') {
        const result = await getAllAgendaPaymentBySender(userID,dec => dec);
        console.log(result);
        if (result.length === 0 || !result) {
            return false;
        }
        // Generate a keyboard with the agendas
        return generateBtn(result, name);
    }
}

export default allAgendaAsKeyboard