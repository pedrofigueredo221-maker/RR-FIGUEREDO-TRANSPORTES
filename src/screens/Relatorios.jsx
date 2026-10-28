import RefreshButton from "../components/RefreshButton.jsx";
import PeriodRangeFilter from "../components/PeriodRangeFilter.jsx";
import "../styles/corporate-table-headings.css";
import { useMemo, useState } from "react";
import { freightCommission, freightProfit } from "../domain/freightCalculations.js";
import { money, currentMonth, dateLabel } from "../lib/formatters.js";
import { DataTable } from "../components/DataTable.jsx";
import StatCard from "../components/StatCard.jsx";

export default function Relatorios({ data, onRefresh, loading }) {
  const [startDate, setStartDate] = useState(() => `${currentMonth()}-01`);
  const [endDate, setEndDate] = useState(() => { const [year, month] = currentMonth().split("-").map(Number); return `${currentMonth()}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`; });
  const inRange = (date) => { const day = String(date || "").slice(0, 10); return Boolean(day) && (!startDate || day >= startDate) && (!endDate || day <= endDate) && (!startDate || !endDate || startDate <= endDate); };
  const monthFreights = useMemo(() => (data.freights || []).filter((f) => inRange(f.date)), [data.freights, startDate, endDate]);
  const periodExpenses = (data.expenses || []).filter((expense) => inRange(expense.created));
  const expensesPaid = (expense) => (expense.installments || []).reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const expensesOpen = (expense) => Math.max(0, Number(expense.value || 0) - expensesPaid(expense));
  const expensePaymentsInMonth = (data.expenses || []).flatMap((expense) => (expense.installments || []).flatMap((item) => item.payments || []))
    .filter((payment) => inRange(payment.date)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return <><div className="rr-refresh-control"><RefreshButton onRefresh={onRefresh} loading={loading} /></div><div className="welcome-panel"><div><p className="eyebrow">RELATÓRIOS GERENCIAIS</p><h2>Resumo de {startDate ? dateLabel(startDate) : "—"} - {endDate ? dateLabel(endDate) : "—"}</h2><p>Indicadores calculados a partir dos dados já registrados.</p></div><div className="page-filters rr-report-period"><PeriodRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} /></div></div>
    <div className="stats-grid"><StatCard label="Faturamento" value={money(monthFreights.reduce((s,f)=>s+Number(f.value||0),0))} hint={`${monthFreights.length} frete(s)`} /><StatCard label="Recebido de clientes" value={money(monthFreights.reduce((s,f)=>s+Number(f.received||0),0))} hint="Recebimentos dos fretes do período" tone="positive" /><StatCard label="Despesas pagas no período" value={money(expensePaymentsInMonth)} hint="Pagamentos registrados no período" tone="negative" /><StatCard label="Contas a pagar em aberto" value={money(periodExpenses.reduce((s,e)=>s+expensesOpen(e),0))} hint="Saldo das parcelas pendentes" tone="attention" /></div>
    <section className="panel"><div className="panel-heading"><div><h3>RESULTADO POR MOTORISTA</h3><p>Fretes do período selecionado.</p></div></div><DataTable columns={[
      {key:"driver",label:"Motorista"},
      {key:"count",label:"Fretes",numeric:true,render:(r)=>r.freights.length},
      {key:"revenue",label:"Faturamento",numeric:true,render:(r)=>money(r.freights.reduce((s,f)=>s+Number(f.value||0),0))},
      {key:"commission",label:"Comissão",numeric:true,render:(r)=>money(r.freights.reduce((s,f)=>s+freightCommission(f),0))},
      {key:"profit",label:"Lucro estimado",numeric:true,render:(r)=>money(r.freights.reduce((s,f)=>s+freightProfit(f),0))}
    ]} rows={[...new Set(monthFreights.map((f)=>f.driver||"Não informado"))].sort().map((driver)=>({id:driver,driver,freights:monthFreights.filter((f)=>(f.driver||"Não informado")===driver)}))} emptyLabel="Sem fretes neste período." /></section>
    <section className="panel"><div className="panel-heading"><div><h3>DESPESAS POR CATEGORIA</h3><p>Valores totais, pagos e pendentes.</p></div></div><DataTable columns={[
      {key:"category",label:"Categoria"},
      {key:"total",label:"Total",numeric:true,render:(e)=>money(e.expenses.reduce((s,x)=>s+Number(x.value||0),0))},
      {key:"paid",label:"Pago",numeric:true,render:(e)=>money(e.expenses.reduce((s,x)=>s+expensesPaid(x),0))},
      {key:"open",label:"Em aberto",numeric:true,render:(e)=>money(e.expenses.reduce((s,x)=>s+expensesOpen(x),0))}
    ]} rows={[...new Set(periodExpenses.map((e)=>e.category||"Sem categoria"))].sort().map((category)=>({id:category,category,expenses:periodExpenses.filter((e)=>(e.category||"Sem categoria")===category)}))} emptyLabel="Sem despesas cadastradas." /></section></>;
}
