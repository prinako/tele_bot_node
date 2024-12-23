/**
 * Checks if the given user ID is in the list of allowed users.
 *
 * @param {number} userID - The user ID to check.
 * @returns {boolean} `true` if the user is allowed, `false` otherwise.
 */
function authUser(userID) {
    // Split the ALLOWED_USERS environment variable into an array of
    // numbers, and convert it to a Set for fast lookups.
    try{

        const allowedUsers = new Set(process.env.ALLOWED_USERS.split(',').map(Number));
        // Check if the given user ID is in the set of allowed users.
        return allowedUsers.has(userID);
    }catch(err){
        console.log(err);
        return false;
    }
}

export default authUser;