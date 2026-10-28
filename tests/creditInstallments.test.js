import test from "node:test";
import assert from "node:assert/strict";
import { createCreditPlan, creditPlanTotals, validateCreditPlan, installmentPaid } from "../src/domain/creditInstallments.js";

test("divide R$ 1800 em 3 parcelas mensais iguais e pendentes", () => {
  const plan = createCreditPlan(1800, 3, "2026-10-28");
  assert.deepEqual(plan.map((item) => item.amount), [600, 600, 600]);
  assert.deepEqual(plan.map((item) => item.due), ["2026-10-28", "2026-11-28", "2026-12-28"]);
  assert.equal(plan.every((item) => !installmentPaid(item, [])), true);
  assert.equal(validateCreditPlan(1800, plan).interest, 0);
});

test("detecta juros quando parcelas superam o principal", () => {
  const plan = createCreditPlan(1800, 3, "2026-10-28");
  plan[0].amount = 780;
  const totals = validateCreditPlan(1800, plan);
  assert.equal(totals.planned, 1980);
  assert.equal(totals.interest, 180);
  assert.equal(totals.interestPercent, 10);
});

test("limita a 18 parcelas e não permite soma menor que o principal", () => {
  assert.equal(createCreditPlan(1800, 18, "2026-10-28").length, 18);
  assert.throws(() => createCreditPlan(1800, 19, "2026-10-28"), /2 a 18/);
  const plan = createCreditPlan(1800, 3, "2026-10-28");
  plan[0].amount = 500;
  assert.throws(() => validateCreditPlan(1800, plan), /menor/);
});

test("baixa exige vínculo explícito com parcela", () => {
  const plan = createCreditPlan(1800, 3, "2026-10-28");
  assert.equal(installmentPaid(plan[0], [{ installmentId: plan[0].id, amount: 600 }]), true);
  assert.equal(installmentPaid(plan[1], [{ installmentId: plan[0].id, amount: 600 }]), false);
});
