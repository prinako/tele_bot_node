/**
 * Clean text
 * @param {*} value 
 * @returns 
 */
function cleanText(value) {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" ? text : null;
}

/**
 * Get member name
 * @param {Object} member 
 * @returns {string} member name
 */
export default function getMemberName(member = {}) {
    comsole.log(member);
    const username = cleanText(
    member.username ||
        member.telegramUsername ||
        member.user?.username ||
        member.user?.telegramUsername,
    );

    const firstName = cleanText(
    member.firstName ||
        member.first_name ||
        member.user?.firstName ||
        member.user?.first_name,
    );

    const lastName = cleanText(
    member.lastName ||
        member.last_name ||
        member.user?.lastName ||
        member.user?.last_name,
    );

    const displayName = cleanText(
    member.displayName ||
        member.display_name ||
        member.user?.displayName ||
        member.user?.display_name,
    );

    if (displayName) {
    return displayName;
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (fullName) {
    return fullName;
    }

    if (username) {
    return username.startsWith("@") ? username : `@${username}`;
    }

    return String(
    member.telegramId ||
        member.telegram_id ||
        member.user?.telegramId ||
        member.user?.telegram_id ||
        member.user_id ||
        member.id ||
        "Unknown",
    );
}