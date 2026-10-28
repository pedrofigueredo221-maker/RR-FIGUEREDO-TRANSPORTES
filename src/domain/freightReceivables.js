export function freightReceivableBalance(
  freight = {},
  number = (value) => Math.max(0, Number(value) || 0),
) {
  return Math.max(
    0,
    Math.round((number(freight.value) - number(freight.received)) * 100) / 100,
  );
}

export function freightReceivableStatus(
  freight = {},
  number = (value) => Math.max(0, Number(value) || 0),
) {
  const total = Math.max(0, number(freight.value));
  const received = Math.max(0, number(freight.received));

  if (total > 0 && freightReceivableBalance(freight, number) === 0) return "Pago";
  if (received > 0) return "Parcial";
  return "Pendente";
}

export function applyFreightReceipt(
  freights = [],
  freightId,
  receipt,
  number = (value) => Math.max(0, Number(value) || 0),
) {
  const current = freights.find((freight) => freight.id === freightId);
  if (!current) throw new Error("Frete não encontrado para vincular o recebimento.");
  if (!receipt || !receipt.id) throw new Error("O recebimento precisa de um identificador.");

  const receipts = Array.isArray(current.receipts) ? current.receipts : [];
  if (receipts.some((item) => item.id === receipt.id)) return freights;

  const balance = freightReceivableBalance(current, number);
  const amount = Number(receipt.amount);

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("O valor recebido deve ser maior que zero.");
  if (amount > balance + 0.009) throw new Error("O recebimento não pode ultrapassar o saldo do frete.");

  const received = Math.round((number(current.received) + amount) * 100) / 100;

  return freights.map((freight) =>
    freight.id === freightId
      ? { ...freight, received, receipts: [...receipts, receipt] }
      : freight,
  );
}
