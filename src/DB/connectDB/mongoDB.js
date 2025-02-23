import mongoose from 'mongoose';

/**
 * Establishes a connection to the MongoDB database using Mongoose.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the connection is successful, or `false` if an error occurs.
 */
async function connectDB() {
    // Retrieve MongoDB connection string from environment variables
    const urlBase = process.env.MONGODB;

    // Define client options for the MongoDB server, enabling strict mode and deprecation warnings
    const clientOptions = {
        serverApi: {
            version: '1',
            strict: true,
            deprecationErrors: true
        }
    };

    try {
        // Attempt to connect to MongoDB using Mongoose with the specified URL and options
        await mongoose.connect(urlBase, clientOptions);
        
        // Log a successful connection message
        console.debug('MongoDB connected');
        
        // Return true indicating the connection was successful
        return true;
    } catch (err) {
        // Log any errors that occurred during the connection attempt
        console.log(err);
        
        // Return false indicating the connection was unsuccessful
        return false;
    }
}

/**
 * Disconnects the Mongoose connection to the MongoDB database.
 *
 * This function is used to disconnect the Mongoose connection after all database operations have been completed.
 * It is important to disconnect the connection to prevent memory leaks and ensure that the connection is properly closed.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the disconnection is successful, or `false` if an error occurs.
 */
async function disconnectDB() {
    try {
        // Disconnect the Mongoose connection
        await mongoose.disconnect();

        // Log a message to indicate that the connection was successfully disconnected
        console.debug('MongoDB disconnected');

        // Return true to indicate that the disconnection was successful
        return true;

    } catch (err) {
        // Log any errors that occurred during the disconnection process
        console.log(err);

        // Return false to indicate that there was an error during the disconnection process
        return false;
    }
}

export { connectDB, disconnectDB };
