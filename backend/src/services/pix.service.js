import {
    getUserPixBySenderBank,
    insetPix,
    updatePix,
} from '../repositories/pix.repository.js';

function registerPix(data) {
    return new Promise((resolve) => {
        insetPix(data, resolve);
    });
}

async function getPixBySenderBank(senderId, bank) {
    return getUserPixBySenderBank(senderId, bank);
}

function updatePixKey(id, data) {
    return new Promise((resolve) => {
        updatePix(id, data, resolve);
    });
}

export {
    getPixBySenderBank,
    registerPix,
    updatePixKey,
};
