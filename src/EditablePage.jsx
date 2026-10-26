import { matchesRecordSearch } from "./lib/recordSearch.js";
import RefreshButton from "./components/RefreshButton.jsx";
import PeriodRangeFilter from "./components/PeriodRangeFilter.jsx";
import "./styles/corporate-table-headings.css";
import { useEffect, useState } from "react";
import { money as formatMoney, dateLabel, todayISO as today } from "./lib/formatters.js";
import Fretes from "./screens/Fretes.jsx";
import Despesas from "./screens/Despesas.jsx";
import ContasAReceber from "./screens/ContasAReceber.jsx";
import ContasAPagar from "./screens/ContasAPagar.jsx";
import Cadastros from "./screens/Cadastros.jsx";

const uid = () => globalThis.crypto?.randomUUID?.() || `rr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const number = (value) => Math.max(0, Number(value) || 0);
const money = (value) => formatMoney(number(value));
const defaultCategories = ["Combustível", "Pedágio", "Óleo e lubrificantes", "Mecânico", "Oficina", "Pneus", "Elétrica", "Peças", "Documentação", "Seguro", "Lavagem", "Manutenção", "Despesas gerais", "Outros"];
const blankStage = () => ({ date: "", origin: "", destination: "", kmStart: "", kmEnd: "", liters: "", fuelTotal: "", toll: "" });
const blankFreight = () => ({ emptyTrip: blankStage(), loadedTrip: blankStage(), date: "", customer: "", driver: "", truck: "", origin: "", destination: "", value: "", discount: "", toll: "", deductToll: false, commissionType: "", commission: "", bonus: "", km: "", liters: "", dieselPrice: "", fuelActual: "", otherCosts: "", notes: "", received: "", advance: "", currentBalance: "" });
const blankReceivable = () => ({ created: today(), description: "", category: "Outros", truck: "", value: "", due: today(), installmentsCount: "1", notes: "" });
const blankExpense = () => ({ created: today(), description: "", category: "Despesas gerais", truck: "", supplier: "", value: "", due: today(), installmentsCount: "1", notes: "" });
const blankEmployee = () => ({ name: "", role: "Motorista", phone: "", commissionType: "percent", commissionValue: "", deductToll: false, active: true });
const blankTruck = () => ({ name: "", plate: "", driverId: "", active: true });

function Field({ label, value, onChange, type = "text", required = false, min, step, options, placeholder }) {
  return <label className="editor-field">{label}
    {options ? <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required}>
      {options.map((item) => typeof item === "string" ? <option key={item} value={item}>{item}</option> : <option key={item.value} value={item.value}>{item.label}</option>)}
    </select> : <input type={type} value={type === "checkbox" ? undefined : (value ?? "")} checked={type === "checkbox" ? Boolean(value) : undefined} onChange={(e) => onChange(type === "checkbox" ? e.target.checked : e.target.value)} required={required} min={min} step={step} placeholder={placeholder} />}
  </label>;
}

function RecordForm({ title, fields, value, setValue, onSubmit, onCancel, saving }) {
  return <form className="record-editor" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className="editor-heading"><h3>{title}</h3><button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button></div>
    <div className="editor-grid">{fields.map((field) => <Field key={field.key} {...field} value={value[field.key]} onChange={(next) => setValue((old) => ({ ...old, [field.key]: next }))} />)}</div>
    <div className="editor-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button></div>
  </form>;
}

function Actions({ onEdit, onDelete }) {
  return <div className="record-actions"><button className="secondary-button" type="button" title="Editar registro" aria-label="Editar registro" onClick={onEdit}>✎</button><button className="danger-button" type="button" title="Excluir registro" aria-label="Excluir registro" onClick={onDelete}>▤</button></div>;
}

export default function EditablePage({ page, data, onSave, readOnly, loading, version, onRefresh, recordNavigation }) {
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formVersion, setFormVersion] = useState(version);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(() => `${today().slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(() => { const d = today(); const [y, m] = d.slice(0, 7).split("-").map(Number); return `${d.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`; });
  const inRange = (date) => {
    if (!startDate && !endDate) return true;
    if (startDate && endDate && startDate > endDate) return false;
    const day = String(date || "").slice(0, 10);
    return Boolean(day) && (!startDate || day >= startDate) && (!endDate || day <= endDate);
  };
  const [tab, setTab] = useState("employees");
  const [payment, setPayment] = useState(null);
  // Ao navegar entre telas, retornar sempre à consulta, sem formulário herdado.
  useEffect(() => {
    setForm(null);
    setEditingId(null);
    setPayment(null);
    setError("");
  }, [page]);


  const startCreate = (kind) => {
    if (readOnly) return;
    setError(""); setEditingId(null); setFormVersion(version); setForm(kind === "freight" ? blankFreight() : kind === "expense" ? blankExpense() : kind === "receivable" ? blankReceivable() : kind === "employee" ? blankEmployee() : kind === "truck" ? blankTruck() : { name: "" });
  };
  const startEdit = (kind, record) => {
    if (readOnly) return;
    setError(""); setEditingId(record.id); setFormVersion(version); setForm(kind === "freight" ? { ...blankFreight(), ...record, value: String(record.value ?? ""), discount: String(record.discount ?? 0), toll: String(record.toll ?? 0), bonus: String(record.bonus ?? 0), commission: String(record.commission ?? 13), received: String(record.received ?? 0), advance: String(record.advance ?? ""), currentBalance: String(record.currentBalance ?? "") } : (kind === "expense" || kind === "receivable") ? { ...(kind === "expense" ? blankExpense() : blankReceivable()), ...record, value: String(record.value ?? ""), installmentsCount: String((record.installments || []).length || 1) } : { ...record });
  };
  // Ao chegar por duplo clique em outra tela, localiza o registro original
  // e abre o mesmo formulário de edição já utilizado pela listagem.
  useEffect(() => {
    if (!recordNavigation || recordNavigation.page !== page) return;
    const key = page === "freights" ? "freights" : page === "expenses" ? "expenses" : null;
    const kind = page === "freights" ? "freight" : "expense";
    const record = key && (data[key] || []).find((item) => String(item.id) === String(recordNavigation.recordId));
    if (!record) { setError("Registro não encontrado."); return; }
    setQuery("");
    setStartDate(""); setEndDate("");
    if (!readOnly) startEdit(kind, record);
  // O requestId muda apenas em uma nova navegação solicitada pelo usuário.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordNavigation?.requestId, page]);

  const commit = async (next, expectedVersion = (form ? formVersion : version)) => {
    if (readOnly) { setError("Perfil visitante: alterações não são permitidas."); return; }
    setSaving(true); setError("");
    try { await onSave(next, expectedVersion); setForm(null); setEditingId(null); setPayment(null); }
    catch (e) { const message = e?.message || "Não foi possível salvar. Os dados locais foram preservados."; setError(message); if (message.includes("mudaram") || message.includes("alterou os dados")) { setForm(null); setEditingId(null); setPayment(null); } }
    finally { setSaving(false); }
  };
  const remove = async (key, record) => {
    if (readOnly) { setError("Perfil visitante: exclusões não são permitidas."); return; }
    if (key === "freights" && (number(record.received) > 0 || (record.receipts || []).length > 0)) {
      setError("Este frete já possui recebimentos registrados. Preserve o histórico financeiro; não é possível excluí-lo por esta tela.");
      return;
    }
    if (key === "expenses" && (record.installments || []).some((item) => number(item.paid) > 0 || (item.payments || []).length > 0)) {
      setError("Esta despesa já possui pagamentos registrados. Preserve o histórico financeiro; não é possível excluí-la por esta tela.");
      return;
    }
    if (!window.confirm("Confirma excluir este registro? Esta ação será salva no banco compartilhado.")) return;
    await commit({ ...data, [key]: data[key].filter((item) => item.id !== record.id) });
  };
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filter = (rows, fields) => rows.filter((row) => (!normalizedQuery || fields.some((key) => String(row[key] ?? "").toLocaleLowerCase("pt-BR").includes(normalizedQuery))) && inRange(row.date));
  const allFreights = data.freights || [];
  const allExpenses = data.expenses || [];
  const filteredFreights = allFreights.filter((row) => matchesRecordSearch(row, query, ["customer", "driver", "truck", "origin", "destination", "notes", "id"], [dateLabel(row.date), row.date, money(row.value)]) && inRange(row.date));
  const filteredExpenses = allExpenses.filter((row) => (!normalizedQuery || ["description", "category", "truck", "supplier", "notes"].some((key) => String(row[key] || "").toLocaleLowerCase("pt-BR").includes(normalizedQuery))) && (inRange(row.created) || (row.installments || []).some((i) => inRange(i.due))));
  const categories = data.categories?.length ? data.categories : defaultCategories;
  const employees = (data.employees || []).filter((row) => !normalizedQuery || ["name", "role", "phone"].some((key) => String(row[key] || "").toLocaleLowerCase("pt-BR").includes(normalizedQuery)));
  const trucks = (data.trucks || []).filter((row) => !normalizedQuery || ["name", "plate"].some((key) => String(row[key] || "").toLocaleLowerCase("pt-BR").includes(normalizedQuery)));

  const saveFreight = () => {
    const original = editingId ? allFreights.find((freight) => freight.id === editingId) : null;
    const hasStages = Boolean(form.emptyTrip && form.loadedTrip);
    if (hasStages) {
      const trips = [form.emptyTrip, form.loadedTrip];
      const invalid = trips.some((s) => !["date", "origin", "destination", "kmStart", "kmEnd", "liters", "fuelTotal", "toll"].every((k) => String(s[k] ?? "").trim() !== "") || number(s.kmEnd) < number(s.kmStart) || number(s.liters) <= 0);
      if (invalid || form.loadedTrip.date < form.emptyTrip.date) { setError("Confira as datas, quilômetros e abastecimentos das duas viagens."); return; }
      if (!form.driver || !form.truck || !form.commissionType || form.commission === "" || form.value === "" || form.received === "") { setError("Preencha todos os campos financeiros obrigatórios."); return; }
    }
    const freightValue = number(form.value);
    const receivedAtTrip = original ? number(original.received) : number(form.received);
    if (receivedAtTrip > freightValue + 0.009) {
      setError("O valor do frete não pode ficar abaixo do total já recebido.");
      return;
    }
    const value = { ...form, id: editingId || uid(), value: freightValue, discount: number(form.discount), toll: number(form.toll), bonus: number(form.bonus), commission: number(form.commission), received: receivedAtTrip, km: number(form.km), liters: number(form.liters), dieselPrice: number(form.dieselPrice), fuelActual: number(form.fuelActual), otherCosts: number(form.otherCosts), advance: form.advance === "" || form.advance == null ? null : number(form.advance), currentBalance: form.currentBalance === "" || form.currentBalance == null ? null : number(form.currentBalance) };
    if (hasStages) {
      value.date = form.loadedTrip.date;
      value.origin = form.emptyTrip.origin;
      value.destination = form.loadedTrip.destination;
      value.km = [form.emptyTrip, form.loadedTrip].reduce((sum, s) => sum + number(s.kmEnd) - number(s.kmStart), 0);
      value.liters = number(form.emptyTrip.liters) + number(form.loadedTrip.liters);
      value.fuelActual = number(form.emptyTrip.fuelTotal) + number(form.loadedTrip.fuelTotal);
      value.toll = number(form.emptyTrip.toll) + number(form.loadedTrip.toll);
      value.dieselPrice = value.liters > 0 ? value.fuelActual / value.liters : 0;
    }
    if (hasStages) value.currentBalance = Math.max(0, freightValue - number(form.discount) - receivedAtTrip);
    value.fuelEstimated = number(value.liters) * number(value.dieselPrice);
    if (original) {
      value.receipts = Array.isArray(original.receipts) ? original.receipts : [];
    } else {
      value.receipts = receivedAtTrip > 0 ? [{ id: uid(), date: value.date || today(), amount: receivedAtTrip, method: "Lançamento na viagem" }] : [];
    }
    return commit({ ...data, freights: editingId ? allFreights.map((f) => f.id === editingId ? value : f) : [value, ...allFreights] });
  };
  const saveExpense = () => {
    const value = number(form.value);
    const count = Math.max(1, Math.min(120, Math.floor(number(form.installmentsCount) || 1)));
    const old = allExpenses.find((e) => e.id === editingId);
    let installments = old?.installments || [];
    if (!editingId || count !== installments.length || value !== number(old?.value)) {
      const part = Math.round((value / count) * 100) / 100;
      let assigned = 0;
      installments = Array.from({ length: count }, (_, index) => {
        const due = new Date(`${form.due || today()}T12:00:00`);
        due.setMonth(due.getMonth() + index);
        const amount = index === count - 1 ? Math.round((value - assigned) * 100) / 100 : part;
        assigned += amount;
        return { due: due.toISOString().slice(0, 10), value: amount, paid: 0, payments: [] };
      });
      if (old?.installments?.some((i) => number(i.paid) > 0)) {
        setError("Esta despesa já tem pagamentos. Para preservar o histórico, edite a descrição/categoria sem alterar valor ou quantidade de parcelas.");
        return;
      }
    }
    const expense = { ...form, id: editingId || uid(), value, installments, installmentsCount: undefined };
    delete expense.due; delete expense.installmentsCount;
    return commit({ ...data, expenses: editingId ? allExpenses.map((e) => e.id === editingId ? expense : e) : [expense, ...allExpenses] });
  };

  const saveReceivable = () => {
    const value = number(form.value);
    if (!form.description?.trim() || value <= 0 || !form.created || !form.due) { setError("Preencha descrição, valor e datas da conta a receber."); return; }
    const count = Math.max(1, Math.min(120, Math.floor(number(form.installmentsCount) || 1)));
    const records = data.receivables || [];
    const old = records.find((item) => item.id === editingId);
    let installments = old?.installments || [];
    if (!old || count !== installments.length || value !== number(old.value)) {
      if (old?.installments?.some((item) => number(item.paid) > 0 || (item.payments || []).length > 0)) { setError("Esta conta já possui recebimentos. Não altere o valor ou o parcelamento."); return; }
      const part = Math.round(value / count * 100) / 100;
      let assigned = 0;
      installments = Array.from({length:count}, (_,index) => {
        const due = new Date(`${form.due}T12:00:00`);
        due.setMonth(due.getMonth() + index);
        const amount = index === count-1 ? Math.round((value-assigned)*100)/100 : part;
        assigned += amount;
        return {due:due.toISOString().slice(0,10),value:amount,paid:0,payments:[]};
      });
    }
    const record = {...form,id:editingId||uid(),value,installments};
    delete record.due; delete record.installmentsCount;
    return commit({...data,receivables:editingId?records.map(item=>item.id===editingId?record:item):[record,...records]});
  };

  const toolbar = <div className="page-filters"><input aria-label="Buscar registros" placeholder="Buscar registros" value={query} onChange={(e) => setQuery(e.target.value)} /><PeriodRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} /><button className="secondary-button" onClick={() => { setQuery(""); setStartDate(""); setEndDate(""); }} type="button">Limpar filtros</button><RefreshButton onRefresh={onRefresh} loading={loading} /></div>;
  const showError = error && <div className="error-banner" role="alert">{error}</div>;

  const controller = {
    page, data, readOnly, loading, saving, form, setForm, editingId, setEditingId,
    startCreate, startEdit, saveFreight, saveExpense, saveReceivable, showError, toolbar,
    filteredFreights, filteredExpenses, dateLabel, money, Actions, RecordForm, Field,
    remove, payment, setPayment, allFreights, allExpenses, number, commit, setError,
    categories, employees, trucks, tab, setTab, query, uid, today
  };
  if (page === "freights") return <Fretes controller={controller} />;
  if (page === "expenses") return <Despesas controller={controller} />;
  if (page === "payments") return <ContasAPagar controller={controller} />;
  if (page === "receivables") return <ContasAReceber controller={controller} />;
  if (page === "cadastros") return <Cadastros controller={controller} />;
  return <section className="panel"><h3>Área não editável</h3><p>Esta área é apenas para consulta nesta etapa.</p></section>;
}
