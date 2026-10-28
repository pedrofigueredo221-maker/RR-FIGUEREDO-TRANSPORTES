import RefreshButton from "../components/RefreshButton.jsx";
import RouteDisplay from "../components/RouteDisplay.jsx";
import "../styles/freight-table-standard.css";
import "../styles/corporate-table-headings.css";
import { useMemo, useState } from "react";
import { freightCommission, freightOperatingCosts, freightProfit } from "../domain/freightCalculations.js";
import { money, dateLabel, currentMonth } from "../lib/formatters.js";
import BalanceDetailDialog from "../components/BalanceDetailDialog.jsx";
import "../styles/balanco-geral.css";

function StatCard({ label, value, hint, tone = "" }) {
  return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>;
}

export default function PainelInicial({ data, onRefresh, loading, onOpenRecord }) {
  const [startDate, setStartDate] = useState(() => `${currentMonth()}-01`);
  const [endDate, setEndDate] = useState(() => { const [year, month] = currentMonth().split("-").map(Number); return `${currentMonth()}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`; });
  const validRange = Boolean(startDate && endDate && startDate <= endDate);
  const inRange = (date) => validRange && Boolean(date) && String(date).slice(0, 10) >= startDate && String(date).slice(0, 10) <= endDate;
  const [detail, setDetail] = useState(null);
  const summary = useMemo(() => {
    const freights = Array.isArray(data.freights) ? data.freights : [];
    const expenses = Array.isArray(data.expenses) ? data.expenses : [];
    const selected = freights.filter((f) => inRange(f.date));
    // Usa as funções financeiras do domínio React para manter os indicadores consistentes.
    const receivable = selected.reduce((sum, f) => sum + Math.max(0, Number(f.value || 0) - Number(f.received || 0)), 0);
    const payable = expenses.filter((exp) => inRange(exp.created)).reduce((sum, exp) => sum + Math.max(0,
      Number(exp.value || 0) - (Array.isArray(exp.installments)
        ? exp.installments.reduce((subtotal, item) => subtotal + Number(item.paid || 0), 0)
        : Number(exp.paid || 0))), 0);
    const expenseTotal = expenses.filter((exp) => inRange(exp.created))
      .reduce((sum, exp) => sum + Number(exp.value || 0), 0);
    return {
      selected, revenue: selected.reduce((sum, f) => sum + Number(f.value || 0), 0),
      profit: selected.reduce((sum, f) => sum + freightProfit(f), 0) - expenseTotal, receivable, payable,
      recent: [...selected].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 6)
    };
  }, [data, startDate, endDate]);
  return <>
    <section className="welcome-panel"><div><h2 className="balance-heading">PAINEL DA TRANSPORTADORA</h2></div>
      <div className="balance-range"><div className="balance-range-controls"><label className="balance-period-picker"><span className="balance-period-label">INÍCIO DO PERÍODO</span><span className="balance-period-input"><input aria-label="Início do período" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} /></span></label><label className="balance-period-picker"><span className="balance-period-label">FINAL DO PERÍODO</span><span className="balance-period-input"><input aria-label="Final do período" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} /></span></label></div>{!validRange && <span className="balance-range-error" role="alert">Selecione um período válido: a data final não pode ser anterior à inicial.</span>}</div></section>
    <div className="stats-grid">
      <button type="button" className="balance-stat-action" onClick={() => setDetail("revenue")} aria-label="Ver detalhamento do faturamento do mês"><StatCard label="Faturamento do período" value={money(summary.revenue)} /></button>
      <button type="button" className="balance-stat-action" onClick={() => setDetail("profit")} aria-label="Ver detalhamento do lucro estimado"><StatCard label="Lucro estimado do período" value={money(summary.profit)} tone="positive" /></button>
      <button type="button" className="balance-stat-action" onClick={() => setDetail("receivable")} aria-label="Ver detalhamento dos valores a receber"><StatCard label="Valores a receber" value={money(summary.receivable)} tone="attention" /></button>
      <button type="button" className="balance-stat-action" onClick={() => setDetail("payable")} aria-label="Ver detalhamento das contas a pagar"><StatCard label="Contas a pagar" value={money(summary.payable)} tone="negative" /></button>
    </div>
    <section className="panel"><div className="panel-heading"><div><h3>ÚLTIMAS VIAGENS</h3></div><RefreshButton onRefresh={onRefresh} loading={loading} /></div>
      {summary.recent.length === 0 ? <div className="empty-state"><strong>Nenhum frete encontrado</strong><p>Os fretes cadastrados no Supabase aparecerão aqui.</p></div> :
      <div className="table-scroll"><table className="rr-freight-table rr-balance-freight-table"><thead><tr><th>Data</th><th>Motorista</th><th>Trajeto</th><th>Valor</th><th>Custo total</th><th>Comissão</th><th>Lucro</th></tr></thead><tbody>
        {summary.recent.map((f, i) => <tr key={f.id ?? `${f.date}-${i}`} className="balance-data-row" title="Clique para abrir o frete" onClick={() => onOpenRecord?.("freights", f.id)}><td>{dateLabel(f.date)}</td><td>{f.driver || "—"}</td><td><RouteDisplay origin={f.origin} destination={f.destination} /></td><td className="numeric">{money(f.value)}</td><td className="numeric">{money(freightOperatingCosts(f))}</td><td className="numeric">{money(freightCommission(f))}</td><td className="numeric">{money(freightProfit(f))}</td></tr>)}
      </tbody></table></div>}
    </section>
    {detail && <BalanceDetailDialog type={detail} startDate={startDate} endDate={endDate} data={data} onOpenRecord={onOpenRecord} onClose={() => setDetail(null)} />}
  </>;
}


