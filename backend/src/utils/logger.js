import env from '../config/env.js';

function debug(...args) {
    if (env.log) {
        console.debug(...args);
    }
}

function error(...args) {
    console.error(...args);
}

export {
    debug,
    error,
};
