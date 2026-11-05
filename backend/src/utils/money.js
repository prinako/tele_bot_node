function invalidAmount() {
  return Object.assign(new Error("Enter a positive amount with at most two decimal places"), { status: 400, code: "INVALID_AMOUNT" });
}

export function moneyToCents(value, { allowZero = false } = {}) {
  if (typeof value !== "string" && typeof value !== "number") throw invalidAmount();
  let text = String(value).trim().replace(/^R\$\s*/, "");
  // Brazilian thousands separators are accepted only with an explicit decimal comma.
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(text)) text = text.replace(/\./g, "");
  text = text.replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text)) throw invalidAmount();
  const [whole, fraction = ""] = text.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > 999999999999n || cents < (allowZero ? 0n : 1n)) throw invalidAmount();
  return cents;
}

export function formatCents(cents) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function equalShareCents(total, count) {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw Object.assign(new Error("Select at least one responsible member"), { status: 400 });
  }
  return (total + BigInt(count) - 1n) / BigInt(count);
}

// Compatibility for existing callers; calculations should use moneyToCents.
export function parseMoney(value) {
  return Number(formatCents(moneyToCents(value)));
}
