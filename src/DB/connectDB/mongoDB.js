// const mongoose = require('mongoose');
import mongoose from 'mongoose';


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

export { connectDB, disconnectDB };
