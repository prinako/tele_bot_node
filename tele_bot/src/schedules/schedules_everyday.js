import cron from "node-cron";
import { getAllAgendaPayments } from "../api/backendClient.js";
import agendaFormatter from "../utilities/agenda_formatter.js";
import { belemTodayOrdinal, dueDateOrdinal, REMINDER_TIMEZONE } from "../utilities/calendar.js";

const daysLeftMessages = {
  3: "Faltam 3 dias para a data de vencimento",
  2: "Faltam 2 dias para a data de vencimento",
  1: "Faltam 1 dia para a data de vencimento",
  0: "Hoje é a data de vencimento",
};

export default class SchedulesEveryday {
  constructor(bot, { now = () => new Date(), loadAgendas = getAllAgendaPayments, schedule = cron.schedule } = {}) {
    this.bot = bot;
    this.now = now;
    this.loadAgendas = loadAgendas;
    this.task = schedule("0 9 * * *", () => this._checkIfNeedToNotify(), { timezone: REMINDER_TIMEZONE });
  }

  async _checkIfNeedToNotify() {
    const today = belemTodayOrdinal(this.now());
    let agendas;
    try { agendas = await this.loadAgendas(); }
    catch (error) {
      console.error("Reminder loading failed", { code: error.code, status: error.status });
      return;
    }
    if (!Array.isArray(agendas)) return;
    for (const agenda of agendas) {
      if (agenda.isFullyPaid || agenda.isPaid) continue;
      const due = dueDateOrdinal(agenda.date);
      if (due === null) continue;
      const daysLeft = due - today;
      if (!Object.hasOwn(daysLeftMessages, daysLeft)) continue;
      try {
        await this.bot.sendMessage(agenda.chatId, `${agendaFormatter(agenda)}${daysLeftMessages[daysLeft]}`, {
          message_thread_id: agenda.topicId ?? agenda.messageThreadId ?? undefined,
          parse_mode: "Markdown",
        });
      } catch (error) {
        console.error("Reminder delivery failed", { code: error.code, status: error.status });
      }
    }
  }
}
