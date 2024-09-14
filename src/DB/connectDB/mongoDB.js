const mongoose = require('mongoose');


async function connectDB() {
    const urlBase = process.env.MONGODB;
    const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
    try{
        await mongoose.connect(urlBase, clientOptions);
        console.debug('MongoDB connected');
        return true;
    }catch(err){
        console.log(err);
        return false;
    }
}

async function disconnectDB() {
    try{
        await mongoose.disconnect();
        console.debug('MongoDB disconnected');
        return true;

    }catch(err){
        console.log(err);
        return false;
    }
}

module.exports = { connectDB, disconnectDB };
