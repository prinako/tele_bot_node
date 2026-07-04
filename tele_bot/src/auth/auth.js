/**
 * Checks if the given user ID is in the list of allowed users.
 *
 * @param {number} userID - The user ID to check.
 * @returns {boolean} `true` if the user is allowed, `false` otherwise.
 */
function authUser(userID) {
    try {
        // Initialize the allowedUsers set if it doesn't exist
        if (!authUser.allowedUsers) {
            // Split the environment variable ALLOWED_USERS, convert to numbers, and create a Set
            authUser.allowedUsers = new Set(process.env.ALLOWED_USERS.split(',').map(Number));
        }
        // Check if the userID is in the allowedUsers set
        return authUser.allowedUsers.has(userID);
    } catch (err) {
        // Log a warning if there's an error and return false
        console.warn(err.message + ' ' + '\n⚠️ Please set ALLOWED_USERS in .env file as a comma separated list of user IDs to allow your users access to all commands in the bot.');
        return false;
    }
}

export default authUser;