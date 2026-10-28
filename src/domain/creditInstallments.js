import { cardInstallments, cents } from "./accountLedger.js";

export const MAX_CREDIT_INSTALLMENTS = 18;
export const isCredit = (method) => method === "Crédito" || method === "Cartão de crédito";

export function createCreditPlan(principal, count, firstDate) {
  if (!Number.isInteger(count) || count < 2 || count > MAX_CREDIT_INSTALLMENTS) {
    throw new Error("Selecione de 2 a 18 parcelas.");
  }
  return cardInstallments(principal, count, firstDate).map((item, index) => ({
    id: globalThis.crypto?.randomUUID?.() || `parcela-${Date.now()}-${index}`,
    number: index + 1,
    due: item.date,
    amount: item.amount,
  }));
}

export function creditPlanTotals(principal, installments) {
  const principalCents = cents(principal);
  const plannedCents = installments.reduce((sum, item) => sum + cents(item.amount), 0);
  const interestCents = plannedCents - principalCents;
  return {
    planned: plannedCents / 100,
    interest: Math.max(0, interestCents) / 100,
    interestPercent: principalCents > 0 ? Math.max(0, interestCents) * 100 / principalCents : 0,
  };
}

export function validateCreditPlan(principal, installments) {
  if (!Array.isArray(installments) || installments.length < 2 || installments.length > MAX_CREDIT_INSTALLMENTS) {
    throw new Error("O parcelamento deve ter entre 2 e 18 parcelas.");
  }
  const ids = new Set();
  for (const item of installments) {
    if (!item.id || ids.has(item.id)) throw new Error("Identificação duplicada de parcela.");
    ids.add(item.id);
    if (!new RegExp("^\\d{4}-\\d{2}-\\d{2}$").test(item.due) || Number.isNaN(Date.parse(item.due + "T12:00:00"))) {
      throw new Error("Informe uma data válida para cada parcela.");
    }
    if (!Number.isFinite(Number(item.amount)) || cents(item.amount) <= 0) {
      throw new Error("Todas as parcelas devem ter valor positivo.");
    }
  }
  const totals = creditPlanTotals(principal, installments);
  if (cents(totals.planned) < cents(principal)) {
    throw new Error("A soma das parcelas não pode ser menor que o valor a parcelar.");
  }
  return totals;
}

export function installmentPaid(installment, receipts) {
  return receipts.some((receipt) => receipt.installmentId === installment.id);
}


/**
 * Recebimentos automáticos de cartão no vencimento.
 * Id determinístico evita duplicidade entre renderizações e reaberturas.
 * O total não ultrapassa o valor parcelado; parcelas já baixadas são ignoradas.
 * Recebimentos previstos para datas futuras não entram no saldo.
 */
export function creditReceiptsDue(account, asOf = new Date().toLocaleDateString("en-CA")) {
  const installments = account.creditInstallments || account.receivableCreditInstallments || [];
  const existing = account.receipts || [];
  if (!isCredit(account.paymentMethod || account.receivablePaymentMethod) || !Array.isArray(installments) || installments.length < 2) return [];
  const due = installments.filter((item) => item.due && item.due <= asOf && !installmentPaid(item, existing));
  return due.map((item) => ({
    id: `auto-credit-${item.id}`,
    installmentId: item.id,
    date: item.due,
    method: "Crédito",
    amount: Number(item.amount),
    automatic: true,
  }));
}

export function withDueCreditReceipts(account, asOf) {
  const added = creditReceiptsDue(account, asOf);
  if (!added.length) return account;
  const receipts = [...(account.receipts || []), ...added];
  const received = Math.round(receipts.reduce((sum, receipt) => sum + cents(receipt.amount), 0)) / 100;
  return { ...account, receipts, received: Math.max(Number(account.received || 0), received) };
}
