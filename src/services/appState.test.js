import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAppState } from "./appState.js";

test("preserva dados e campos adicionais do registro", () => {
  const source = { freights: [{ id: "frete-1" }], extra: { custom: true } };
  const result = normalizeAppState(source);
  assert.deepEqual(result.freights, source.freights);
  assert.deepEqual(result.extra, source.extra);
  assert.deepEqual(result.expenses, []);
  assert.deepEqual(result.receivables, []);
  assert.deepEqual(result.employees, []);
  assert.deepEqual(result.trucks, []);
  assert.deepEqual(result.categories, []);
  assert.deepEqual(source, { freights: [{ id: "frete-1" }], extra: { custom: true } });
});

test("substitui coleções inválidas por arrays vazios", () => {
  const result = normalizeAppState({ freights: null, expenses: {}, receivables: "inválido", employees: 1, trucks: false, categories: undefined });
  for (const key of ["freights", "expenses", "receivables", "employees", "trucks", "categories"]) {
    assert.deepEqual(result[key], []);
  }
});
