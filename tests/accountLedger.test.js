import test from "node:test";
import assert from "node:assert/strict";
import { accountTotals, addMovement, cardInstallments } from "../src/domain/accountLedger.js";
test("baixas mistas fecham apenas ao totalizar a conta", () => {
  let entries = [];
  entries = addMovement(5000, entries, {date:"2026-10-26",method:"PIX",amount:1000});
  entries = addMovement(5000, entries, {date:"2026-10-27",method:"Dinheiro",amount:1500});
  assert.equal(accountTotals(5000,entries).status,"Parcial");
  entries = addMovement(5000, entries, {date:"2026-10-28",method:"TED",amount:2500});
  assert.equal(accountTotals(5000,entries).balance,0);
  assert.equal(accountTotals(5000,entries).closed,true);
  assert.throws(()=>addMovement(5000,entries,{date:"2026-10-29",method:"PIX",amount:1}),/CONTA FECHADA/);
});
test("rejeita saldo excedido, meio inválido e valores negativos",()=>{
  assert.throws(()=>addMovement(100,[],{date:"2026-10-26",method:"PIX",amount:100.01}),/ultrapassar/);
  assert.throws(()=>addMovement(100,[],{date:"2026-10-26",method:"Outro",amount:10}),/meio/);
  assert.throws(()=>addMovement(100,[],{date:"2026-10-26",method:"PIX",amount:-1}),/maior que zero/);
});
test("centavos de parcelas de crédito fecham o valor exato",()=>{
  const entries=cardInstallments(100,3,"2026-10-26");
  assert.equal(entries.length,3);
  assert.equal(accountTotals(100,entries).balance,0);
});

test("valida datas e preserva vencimentos no fim do mês",()=>{
  const entry=addMovement(50,[],{date:"2026-10-26",method:"PIX",amount:10});
  assert.equal(entry[0].date,"2026-10-26");
  assert.throws(()=>addMovement(50,[],{date:"26/10/2026",method:"PIX",amount:10}),/data/);
  const installments=cardInstallments(300,3,"2026-01-31");
  assert.deepEqual(installments.map(x=>x.date),["2026-01-31","2026-02-28","2026-03-31"]);
});


import { createCreditPlan, creditPlanTotals, validateCreditPlan, installmentPaid } from "../src/domain/creditInstallments.js";

test("crédito em 3x gera parcelas mensais pendentes, sem recebimentos automáticos", () => {
  const installments = createCreditPlan(1800, 3, "2026-10-28");
  assert.deepEqual(installments.map((item) => item.due), ["2026-10-28", "2026-11-28", "2026-12-28"]);
  assert.deepEqual(installments.map((item) => item.amount), [600, 600, 600]);
  assert.equal(accountTotals(1800, []).paid, 0);
  assert.equal(installmentPaid(installments[0], []), false);
});

test("juros são calculados sobre a diferença e não registrados como baixa", () => {
  const installments = createCreditPlan(1800, 3, "2026-10-28");
  installments[0].amount = 780;
  const totals = validateCreditPlan(1800, installments);
  assert.equal(totals.planned, 1980);
  assert.equal(totals.interest, 180);
  assert.equal(totals.interestPercent, 10);
  const receipt = { installmentId: installments[0].id, amount: 780, date: "2026-10-28", method: "Crédito" };
  assert.equal(installmentPaid(installments[0], [receipt]), true);
  assert.equal(installmentPaid(installments[1], [receipt]), false);
});

test("parcelamento limita 18x e exige datas e valores válidos", () => {
  assert.equal(createCreditPlan(1800, 18, "2026-01-31").length, 18);
  assert.throws(() => createCreditPlan(1800, 19, "2026-01-31"), /18 parcelas/);
  const installments = createCreditPlan(100, 2, "2026-10-28");
  installments[0].amount = -1;
  assert.throws(() => validateCreditPlan(100, installments), /positivo/);
  installments[0].amount = 50;
  installments[0].due = "28/10/2026";
  assert.throws(() => validateCreditPlan(100, installments), /data válida/);
});
