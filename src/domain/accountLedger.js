// Regras compartilhadas para baixas financeiras, sem arredondamento em ponto flutuante.
export const PAYMENT_METHODS = ["PIX", "Dinheiro", "TED", "Boleto", "Cartão de crédito", "Débito", "Crédito"];
export const cents = (value) => Math.round(Number(value) * 100);
export const amount = (value) => cents(value) / 100;

export function accountTotals(total, movements = []) {
  const totalCents = cents(total);
  const paidCents = movements.reduce((sum, item) => sum + cents(item.amount), 0);
  const balanceCents = totalCents - paidCents;

  return {
    total: totalCents / 100,
    paid: paidCents / 100,
    balance: Math.max(0, balanceCents) / 100,
    closed: totalCents > 0 && balanceCents === 0,
    status: balanceCents === 0 && totalCents > 0
      ? "Fechada"
      : paidCents > 0
        ? "Parcial"
        : "Pendente",
  };
}

export function addMovement(total, movements, entry) {
  const value = cents(entry.amount);
  const totals = accountTotals(total, movements);

  if (totals.closed) throw new Error("CONTA FECHADA — Não é possível alterar.");
  if (!PAYMENT_METHODS.includes(entry.method)) throw new Error("Selecione um meio de pagamento válido.");
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error("Informe a data da baixa.");
  if (!Number.isFinite(value) || value <= 0) throw new Error("Informe um valor de baixa maior que zero.");
  if (value > cents(totals.balance)) throw new Error("A baixa não pode ultrapassar o saldo restante.");

  return [...movements, { ...entry, amount: value / 100 }];
}

export function cardInstallments(total, count, startDate) {
  const totalCents = cents(total);
  if (!Number.isInteger(count) || count < 1 || count > 120 || totalCents < count) throw new Error("Quantidade de parcelas inválida.");

  const base = Math.floor(totalCents / count);

  return Array.from({ length: count }, (_, index) => {
    const due = new Date(startDate + "T12:00:00");
    if (Number.isNaN(due.getTime())) throw new Error("Data inválida.");

    const originalDay = due.getDate();
    due.setDate(1);
    due.setMonth(due.getMonth() + index);

    const lastDay = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
    due.setDate(Math.min(originalDay, lastDay));

    return {
      date: due.toISOString().slice(0, 10),
      amount: (base + (index === count - 1 ? totalCents - base * count : 0)) / 100,
      method: "Crédito",
    };
  });
}
