import { test } from "node:test";
import assert from "node:assert/strict";
import AgendaPayment from "../src/agendas/agenda_payment.js";
import agendaFormatter from "../src/utilities/agenda_formatter.js";

test("bot preview uses the same upward cent rounding as persisted shares", () => {
  const flow = new AgendaPayment({});
  assert.equal(flow.dividers("10.00", 3), true);
  assert.match(flow.selectedDescription, /R\$ 3\.34 por cada pessoa/);
  assert.match(flow.selectedDescription, /Total da fatura: R\$ 10\.00/);
  assert.match(flow.selectedDescription, /Excedente de arredondamento: R\$ 0\.02/);
  assert.equal(flow.dividers("10.001", 3), false);
  assert.equal(flow.dividers("0.01", 3), true);
  assert.match(flow.selectedDescription, /R\$ 0\.01 por cada pessoa/);
});

test("bill messages distinguish original amount, allocated amount and surplus", () => {
  const message = agendaFormatter({ title:"Test", amount:"10.00", allocatedAmount:"10.02", surplusAmount:"0.02", members:[] });
  assert.match(message, /R\$ 10\.00/);
  assert.match(message, /Total das cotas: R\$ 10\.02/);
  assert.match(message, /Excedente de arredondamento: R\$ 0\.02/);
});
