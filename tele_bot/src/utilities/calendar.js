export const REMINDER_TIMEZONE = "America/Belem";
const belemDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: REMINDER_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

function ordinal(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime() / 86400000;
}

export function dueDateOrdinal(value) {
  if (typeof value !== "string") return null;
  const brazilian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (brazilian) return ordinal(Number(brazilian[3]), Number(brazilian[2]), Number(brazilian[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return ordinal(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
}

export function belemTodayOrdinal(now) {
  const parts = Object.fromEntries(belemDate.formatToParts(now).map(part => [part.type, part.value]));
  return ordinal(Number(parts.year), Number(parts.month), Number(parts.day));
}
