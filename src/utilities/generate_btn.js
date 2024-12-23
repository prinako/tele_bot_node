/**
 * Generates a 2D array of buttons for Telegram keyboard, with each button containing text and a callback_data property.
 * @param {Array} array - The array of data to be used for generating the buttons
 * @param {String} nameSpace - The namespace to be used for the callback_data
 * @param {Function} next - The callback function to call with the generated buttons
 * @return {Promise} A promise that resolves with the generated buttons
 */
function generateBtn(array, nameSpace, next) {
    // Create an array to store the generated buttons
    const btnList = [];
    // Iterate over the array and generate a button for each item
    array.forEach(d => {
        btnList.push({
            text: d.title? `${d.title}\n${d.date}`: d.bank, // The text to be displayed on the button
            callback_data: d.title? d.id: d.pix // The callback data to be sent when the button is clicked
        });
    });
    // Group the buttons into rows of 2
    const groupedBtn = btnList.reduce((acc, cur, idx) => {
        if (idx % 2 === 0) {
            acc.push([cur]);
        } else {
            acc[acc.length - 1].push(cur);
        }
        return acc;
    }, []);
    // Map the grouped buttons to the format required by the Telegram API
    const buttons = groupedBtn.map(b => b.map(bk => ({
        text: bk.text,
        callback_data: `${nameSpace}_${bk.callback_data}` // Add the namespace to the callback data
    })));
    // Call the callback with the generated buttons
    return next(buttons);
}

export default generateBtn
