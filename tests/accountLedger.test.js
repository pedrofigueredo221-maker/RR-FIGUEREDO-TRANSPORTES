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
