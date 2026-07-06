import { query } from "../db/postgres.js";
import { getAllAgendaPaymentsForAdmin } from "./agenda.repository.js";
import { getAllPixKeys } from "./pix.repository.js";

async function getStats() {
  const result = await query(
    `SELECT
        (SELECT COUNT(*)::int FROM users) AS users_count,
        (SELECT COUNT(*)::int FROM banks WHERE is_active = TRUE) AS active_banks_count,
        (SELECT COUNT(*)::int FROM pix_keys) AS pix_keys_count,
        (SELECT COUNT(*)::int FROM agenda_payments WHERE is_fully_paid = FALSE) AS unpaid_agenda_payments_count,
        (SELECT COUNT(*)::int FROM agenda_payments WHERE is_fully_paid = TRUE) AS paid_agenda_payments_count,
        (SELECT COUNT(*)::int FROM bot_installations) AS bot_installations_count,
        (SELECT COUNT(*)::int FROM bot_installation_topics) AS bot_installation_topics_count,
        (SELECT COUNT(*)::int FROM bot_installation_users) AS bot_installation_users_count`,
  );

  const row = result.rows[0];
  return {
    usersCount: row.users_count,
    activeBanksCount: row.active_banks_count,
    pixKeysCount: row.pix_keys_count,
    unpaidAgendaPaymentsCount: row.unpaid_agenda_payments_count,
    paidAgendaPaymentsCount: row.paid_agenda_payments_count,
    botInstallationsCount: row.bot_installations_count,
    botInstallationTopicsCount: row.bot_installation_topics_count,
    botInstallationUsersCount: row.bot_installation_users_count,
  };
}

async function getPixKeys() {
  return getAllPixKeys();
}

async function getAgendaPayments() {
  return getAllAgendaPaymentsForAdmin();
}

export { getAgendaPayments, getPixKeys, getStats };
