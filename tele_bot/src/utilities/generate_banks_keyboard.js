import { getBanks } from "../api/backendClient.js";

function generateBanksKeyboard(banks) {
  const bankButtons = banks.map((bank) => ({
    text: bank.name,
    callback_data: `bank_${bank.name}`,
  }));

  return bankButtons.reduce((rows, button, index) => {
    if (index % 2 === 0) {
      rows.push([button]);
    } else {
      rows[rows.length - 1].push(button);
    }

    return rows;
  }, []);
}

async function loadBanksKeyboard() {
  const banks = await getBanks();
  if (!Array.isArray(banks) || banks.length === 0) {
    return null;
  }

  return generateBanksKeyboard(banks);
}

async function generateBankKeyboard(next) {
  const keyboard = await loadBanksKeyboard();

  if (next) {
    return next(keyboard);
  }

  return keyboard;
}

export { generateBanksKeyboard, loadBanksKeyboard };
export default generateBankKeyboard;
