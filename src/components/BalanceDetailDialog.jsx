import { useEffect } from "react";
import { money, dateLabel } from "../lib/formatters.js";
import { freightCommission, freightOperatingCosts, freightProfit } from "../domain/freightCalculations.js";
import "../styles/balanco-geral.css";

const amount = (value) => Number(value) || 0;
const paidExpense = (expense) => Array.isArray(expense.installments)
  ? expense.installments.reduce((total, installment) => total + amount(installment.paid), 0)
  : amount(expense.paid);
const titles = {
  revenue: "Faturamento do período",
  profit: "Lucro estimado do período",
  receivable: "Valores a receber",
  payable: "Contas a pagar"
};
export default function BalanceDetailDialog({ type, startDate, endDate, data, onClose, onOpenRecord }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const inRange = (date) => Boolean(startDate && endDate && startDate <= endDate && date && String(date).slice(0, 10) >= startDate && String(date).slice(0, 10) <= endDate);
  const freights = Array.isArray(data.freights) ? data.freights : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const selectedFreights = freights.filter((f) => inRange(f.date));
  const selectedExpenses = expenses.filter((e) => inRange(e.created));
  const rows = type === "revenue" ? selectedFreights.map((f, i) => ({
    id: f.id || i, sourceId: f.id, sourcePage: "freights", date: f.date, description: [f.driver, f.origin && f.destination ? f.origin + " → " + f.destination : f.origin || f.destination].filter(Boolean).join(" · "),
    detail: "Valor do frete", value: amount(f.value)
  })) : type === "profit" ? [
    ...selectedFreights.map((f, i) => ({ id: "f" + (f.id || i), sourceId: f.id, sourcePage: "freights", date: f.date, description: [f.driver, f.origin && f.destination ? f.origin + " → " + f.destination : ""].filter(Boolean).join(" · "),
      detail: "Frete " + money(f.value) + " · Custos " + money(freightOperatingCosts(f)) + " · Comissão " + money(freightCommission(f)), value: freightProfit(f) })),
    ...selectedExpenses.map((e, i) => ({ id: "e" + (e.id || i), sourceId: e.id, sourcePage: "expenses", date: e.created, description: e.description || e.category || "Despesa", detail: "Despesa do mês deduzida do lucro", value: -amount(e.value) }))
  ] : type === "receivable" ? selectedFreights.map((f, i) => ({
    id: f.id || i, date: f.date, description: [f.driver, f.origin && f.destination ? f.origin + " → " + f.destination : ""].filter(Boolean).join(" · "),
    detail: "Frete " + money(f.value) + " · Recebido " + money(f.received), value: Math.max(0, amount(f.value) - amount(f.received))
  })).filter((r) => r.value > 0) : selectedExpenses.map((e, i) => ({
    id: e.id || i, sourceId: e.id, sourcePage: "expenses", date: e.created, description: e.description || e.category || "Despesa",
    detail: "Total " + money(e.value) + " · Pago " + money(paidExpense(e)), value: Math.max(0, amount(e.value) - paidExpense(e))
  })).filter((r) => r.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const periodLabel = `Período: ${dateLabel(startDate)} - ${dateLabel(endDate)}`;
  return <div className="balance-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="balance-dialog" role="dialog" aria-modal="true" aria-labelledby="balance-dialog-title">
      <header className="balance-dialog-header"><div><p className="balance-dialog-kicker">BALANÇO GERAL · DETALHAMENTO</p><h2 id="balance-dialog-title">{titles[type]}</h2><p>{periodLabel}</p></div><button type="button" className="balance-close" onClick={onClose} aria-label="Fechar relatório">×</button></header>
      <div className="balance-dialog-total"><span>Total do indicador</span><strong>{money(total)}</strong><small>{rows.length} registro(s) compondo o valor</small></div>
      <div className="table-scroll"><table><thead><tr><th>Data</th><th>Origem dos dados</th><th>Composição</th><th>Valor</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className={r.sourceId ? "balance-data-row" : undefined} title={r.sourceId ? "Clique para abrir o registro" : undefined} onClick={() => { if (r.sourceId && onOpenRecord) { onClose(); onOpenRecord(r.sourcePage, r.sourceId); } }}><td>{dateLabel(r.date)}</td><td>{r.description || "Não informado"}</td><td>{r.detail}</td><td className="numeric">{money(r.value)}</td></tr>)}</tbody></table></div>
      {rows.length === 0 && <p className="balance-empty">Nenhum lançamento encontrado para este indicador.</p>}
      <footer className="balance-dialog-footer"><span>Consulta somente leitura. Valores calculados a partir dos registros atuais.</span><button type="button" className="secondary-button" onClick={onClose}>Fechar</button></footer>
    </section>
  </div>;
}
