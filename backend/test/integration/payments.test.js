import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const enabled = process.env.TELEBOT_DISPOSABLE_DATABASE === "1";
let db;
let agenda;
if (enabled) {
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/telebot_disposable_test");
  process.env.DATABASE_URL = url.href;
  db = await import("../../src/db/postgres.js");
  agenda = await import("../../src/repositories/agenda.repository.js");
}
before(async () => {
  if (!enabled) return;
  await db.query(await readFile(new URL("../../src/db/schema.sql", import.meta.url), "utf8"));
  await db.query("INSERT INTO users (telegram_id) VALUES (111), (222), (333)");
  const installation = await db.query("INSERT INTO bot_installations (telegram_chat_id, chat_type) VALUES (-10, 'supergroup') RETURNING id");
  await db.query(`INSERT INTO bot_installation_users (bot_installation_id,user_id,telegram_chat_id,telegram_user_id)
    SELECT $1,id,-10,telegram_id FROM users`, [installation.rows[0].id]);
});
after(async () => { if (enabled) await db.closeDB(); });

async function createBill(amount = "10.00", members = [111, 222]) {
  return agenda.insetAgendaPayment({ senderId: 111, chatId: -10, amount, members,
    title: "Disposable bill", description: "Test", date: "01/12/2026", pix: "test-key", bank: "Inter" }, value => value);
}
function shares(bill) { return bill.members.filter(m => m.isResponsible).map(m => Number(m.amountShare).toFixed(2)).sort(); }
const options = { skip: !enabled };

test("amount-only and combined edits recalculate from the new total", options, async () => {
  const bill = await createBill();
  const edited = await agenda.updateAgendaPayment(bill.id, { amount: "20.00" });
  assert.deepEqual(shares(edited), ["10.00", "10.00"]);
  const combined = await agenda.updateAgendaPayment(bill.id, { amount: "10.00", members: [111,222,333] });
  assert.deepEqual(shares(combined), ["3.34", "3.34", "3.34"]);
  const changedMembers = await agenda.updateAgendaPayment(bill.id, { members: [111,333] });
  assert.deepEqual(shares(changedMembers), ["5.00", "5.00"]);
});

test("paid shares block edits, including attempts to unpay and edit in one request", options, async () => {
  const bill = await createBill();
  await agenda.updateAgendaPayment(bill.id, { isPaid: true, telegramId: 111 });
  await assert.rejects(agenda.updateAgendaPayment(bill.id, { amount: "12.00" }), {status:409});
  await assert.rejects(agenda.updateAgendaPayment(bill.id, { members: [111] }), {status:409});
  await assert.rejects(agenda.updateAgendaPayment(bill.id, { amount: "12.00", isPaid:false }), {status:409});
  await agenda.updateAgendaPayment(bill.id, { isPaid:false, telegramId:111 });
  assert.deepEqual(shares(await agenda.updateAgendaPayment(bill.id, { amount:"12.00" })), ["6.00", "6.00"]);
});

test("invalid edits roll back the amount and membership together", options, async () => {
  const bill = await createBill();
  await assert.rejects(agenda.updateAgendaPayment(bill.id, { amount:"12.001", members:[111,333] }), {status:400});
  const original = await agenda.getAgendaPaymentById(bill.id);
  assert.equal(original.amount, "10.00");
  assert.deepEqual(original.members.filter(m => m.isResponsible).map(m => m.telegramId).sort(), [111,222]);
  await assert.rejects(agenda.updateAgendaPayment(bill.id, {members:[]}), {status:400});
  assert.equal(await agenda.updateAgendaPayment(bill.id, {amount:"12.00",members:[111,333],title:null}),false);
  const rolledBack = await agenda.getAgendaPaymentById(bill.id);
  assert.equal(rolledBack.amount,"10.00");
  assert.deepEqual(rolledBack.members.filter(m=>m.isResponsible).map(m=>m.telegramId).sort(),[111,222]);
});

test("concurrent confirmations leave the bill fully paid", options, async () => {
  const bill = await createBill();
  await Promise.all([111,222].map(telegramId => agenda.updateAgendaPayment(bill.id, {isPaid:true,telegramId})));
  assert.equal((await agenda.getAgendaPaymentById(bill.id)).isFullyPaid, true);
});

test("an edit waits for an in-flight paid update and then rejects", options, async () => {
  const bill = await createBill();
  const blocker = await db.getClient();
  try {
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM agenda_payments WHERE id=$1 FOR UPDATE", [bill.id]);
    await blocker.query(`UPDATE agenda_payment_members SET is_paid=TRUE WHERE agenda_payment_id=$1`, [bill.id]);
    const pending = agenda.updateAgendaPayment(bill.id, {amount:"20.00"});
    // Attach a rejection handler immediately; the transaction deliberately blocks it.
    const check = assert.rejects(pending, {status:409});
    await blocker.query("COMMIT");
    await check;
    assert.equal((await agenda.getAgendaPaymentById(bill.id)).amount, "10.00");
  } finally { await blocker.query("ROLLBACK"); blocker.release(); }
});

test("creation uses equal upward-rounded shares and exposes the surplus", options, async () => {
  const bill = await createBill("10.00", [111,222,333]);
  assert.deepEqual(shares(bill), ["3.34", "3.34", "3.34"]);
  assert.equal(bill.amount, "10.00");
  assert.equal(bill.allocatedAmount, "10.02");
  assert.equal(bill.surplusAmount, "0.02");
  const tiny = await createBill("0.01", [111,222,333]);
  assert.deepEqual(shares(tiny), ["0.01", "0.01", "0.01"]);
  assert.equal(tiny.surplusAmount, "0.02");
});

test("creation rejects excess precision and makes no partial bill", options, async () => {
  const before = await db.query("SELECT count(*) FROM agenda_payments");
  const invalid = await createBill("10.001", [111,222,333]);
  assert.equal(invalid.status, 400);
  const after = await db.query("SELECT count(*) FROM agenda_payments");
  assert.equal(after.rows[0].count, before.rows[0].count);
});

test("schema initialization seeds missing banks and repeated startup preserves administrator settings", options, async () => {
  const schema = await readFile(new URL("../../src/db/schema.sql", import.meta.url), "utf8");
  const fresh = await db.query("SELECT sort_order, is_active FROM banks WHERE name='Nubank'");
  assert.equal(fresh.rows[0].sort_order,50);
  assert.equal(fresh.rows[0].is_active,true);
  await db.query("UPDATE banks SET sort_order=987, is_active=FALSE, updated_at='2026-01-01T00:00:00Z' WHERE name='Inter'");
  await db.query("INSERT INTO banks (name,sort_order) VALUES ('Disposable custom bank', 12)");
  const before = await db.query("SELECT * FROM banks WHERE name IN ('Inter','Disposable custom bank') ORDER BY name");
  // Exercise the same whole-schema transaction used by backend startup.
  const client = await db.getClient();
  try {
    await client.query("BEGIN"); await client.query(schema); await client.query("COMMIT");
  } finally { client.release(); }
  const after = await db.query("SELECT * FROM banks WHERE name IN ('Inter','Disposable custom bank') ORDER BY name");
  assert.deepEqual(after.rows,before.rows);
  const names = await db.query("SELECT name FROM banks");
  assert.equal(new Set(names.rows.map(row=>row.name)).size,names.rowCount);
});


test("controller reports paid-edit conflicts and invalid precision without hiding the reason", options, async () => {
  const { patch } = await import("../../src/controllers/agenda.controller.js");
  const bill = await createBill();
  await agenda.updateAgendaPayment(bill.id,{isPaid:true,telegramId:111});
  const response = {status(code) {this.code=code;return this;},json(body) {this.body=body;return this;}};
  const next = error => assert.fail(`Unexpected error middleware: ${error.code}`);
  await patch({params:{id:bill.id},body:{amount:"20.00"},query:{}},response,next);
  assert.equal(response.code,409);
  assert.match(response.body.error,/unpaid/);
  await agenda.updateAgendaPayment(bill.id,{isPaid:false,telegramId:111});
  await patch({params:{id:bill.id},body:{amount:"20.001"},query:{}},response,next);
  assert.equal(response.code,400);
  assert.match(response.body.error,/two decimal places/);
});
