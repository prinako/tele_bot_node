import { test } from "node:test";
import assert from "node:assert/strict";
import { moneyToCents, formatCents, equalShareCents } from "../src/utils/money.js";

test("money accepts explicit decimal formats and rejects excess precision", () => {
  for (const [input, cents] of [["10",1000n],["10.01",1001n],["10,01",1001n],["R$ 1.234,56",123456n],[10.25,1025n]]) {
    assert.equal(moneyToCents(input), cents);
  }
  for (const input of ["1.001", "10,001", "abc", "1e2", "", "-1", 0, NaN, Infinity, "10000000000.00", null]) {
    assert.throws(() => moneyToCents(input), {status:400});
  }
  assert.equal(moneyToCents("0.00", {allowZero:true}), 0n);
});

test("equal shares round up by exact cents and preserve the original total", () => {
  assert.equal(formatCents(equalShareCents(1000n, 3)), "3.34");
  assert.equal(formatCents(equalShareCents(1n, 3)), "0.01");
  assert.equal(formatCents(equalShareCents(1200n, 3)), "4.00");
  assert.equal(formatCents(3n * equalShareCents(1000n, 3) - 1000n), "0.02");
  assert.throws(() => equalShareCents(1000n, 0), {status:400});
});
