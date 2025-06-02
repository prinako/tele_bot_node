// const { getAllAgendaPaymentBySender } = require("../DB/querys/querys");
// const generateBtn = require("../utilities/generate_btn.js");


import {getAllAgendaPaymentBySender} from "../DB/querys/querys.js";
import generateBtn from "../utilities/generate_btn.js";

/**
 * Retrieves all agendas from the database and generates a keyboard for the user to select which one to proceed with.
 * @param {number} userID - The Telegram user ID.
 * @param {string} name - The namespace to be used for the callback_data.
 * @return {Promise<Object[][]|boolean>} A promise that resolves with the generated buttons array or false if no agendas were found.
 */
async function allAgendaAsKeyboard(userID, name) {
    // Check if the name parameter matches the expected namespaces
    if (name === 'someonePaid' || name === 'paid') {
        // Retrieve agendas from the database filtered by userID
        const result = await getAllAgendaPaymentBySender(userID);
        
        // Log the result for debugging purposes
        console.log(result);
        
        // Return false if no results were found or the result is falsy
        if (!result || result.length === 0) {
            return false;
        }

        // Generate and return a keyboard with the agendas
        return generateBtn(result, name);
    }
}

export default allAgendaAsKeyboard