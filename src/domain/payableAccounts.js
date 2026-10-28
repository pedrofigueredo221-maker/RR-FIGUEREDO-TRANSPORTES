import { cents } from "./accountLedger.js";
import { withDueCreditReceipts } from "./creditInstallments.js";

const round = (value) => cents(value) / 100;
const newId = () => globalThis.crypto?.randomUUID?.() || `pagamento-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function payableToAccount(expense) {
  if (!expense) return null;
  const installments = expense.installments || [];
  const historic = installments.flatMap((item, index) => {
    const entries = (item.payments || []).map((payment, entryIndex) => ({
      ...payment,
      id: payment.id || `legacy-${expense.id}-${index}-${entryIndex}`,
      installmentId: payment.installmentId || expense.creditInstallments?.[index]?.id,
    }));
    const missing = Math.max(0, cents(item.paid) - entries.reduce((sum, payment) => sum + cents(payment.amount), 0));
    if (missing) entries.push({ id: `legacy-balance-${expense.id}-${index}`, date: item.due || expense.created, method: "Pagamento anterior", amount: missing / 100 });
    return entries;
  });
  const receipts = expense.payableReceipts || historic;
  const paid = round(receipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0));
  return {
    ...expense,
    title: expense.title || expense.description || "",
    description: expense.notes || expense.description || "",
    created: expense.created || expense.date || new Date().toISOString().slice(0, 10),
    due: expense.due || installments[0]?.due || expense.created || new Date().toISOString().slice(0, 10),
    paymentMethod: expense.paymentMethod || "PIX",
    creditInstallments: expense.creditInstallments || [],
    installmentPrincipal: expense.installmentPrincipal ?? null,
    receipts,
    received: paid,
  };
}

export function accountToPayable(account, original) {
  const previous = original?.installments || [];
  const credit = account.creditInstallments?.length > 1;
  const receipts = account.receipts || [];
  let installments;
  if (credit) {
    installments = account.creditInstallments.map((item) => {
      const movements = receipts.filter((payment) => payment.installmentId === item.id);
      const paid = round(movements.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
      return { due: item.due, value: Number(item.amount), paid, payments: movements };
    });
  } else if (previous.length > 1) {
    // Preservar a distribuição e o histórico das parcelas antigas.
    installments = previous.map((item) => ({ ...item, payments: [...(item.payments || [])] }));
    const previousIds = new Set(payableToAccount(original).receipts.map((payment) => payment.id));
    for (const payment of receipts.filter((item) => !previousIds.has(item.id))) {
      let remaining = cents(payment.amount);
      for (const item of installments) {
        const available = Math.max(0, cents(item.value) - cents(item.paid));
        const applied = Math.min(available, remaining);
        if (!applied) continue;
        item.paid = round(Number(item.paid || 0) + applied / 100);
        item.payments.push({ ...payment, amount: applied / 100 });
        remaining -= applied;
        if (!remaining) break;
      }
      if (remaining) throw new Error("O pagamento ultrapassa o saldo das parcelas existentes.");
    }
  } else {
    const paid = round(receipts.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    installments = [{
      due: account.due, value: round(Number(account.value) + Number(account.interest || 0)),
      paid, payments: receipts,
    }];
  }
  return {
    ...original,
    id: original?.id || newId(),
    title: account.title,
    description: account.title,
    notes: account.description || "",
    created: account.created,
    due: account.due,
    value: Number(account.value),
    interest: Number(account.interest || 0),
    paymentMethod: account.paymentMethod,
    creditInstallments: credit ? account.creditInstallments : [],
    installmentPrincipal: credit ? account.installmentPrincipal : null,
    payableReceipts: receipts,
    installments,
    category: original?.category || "Despesas gerais",
    truck: original?.truck || "",
  };
}

export function applyDuePayableCredit(expense, asOf) {
  if (!expense.creditInstallments?.length) return expense;
  const account = payableToAccount(expense);
  const updated = withDueCreditReceipts(account, asOf);
  if (updated === account) return expense;
  return accountToPayable(updated, expense);
}
