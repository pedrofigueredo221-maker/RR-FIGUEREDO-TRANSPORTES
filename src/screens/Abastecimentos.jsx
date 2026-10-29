import { useMemo, useState } from "react";
import AddRecordButton from "../components/AddRecordButton.jsx";
import FormDialog from "../components/FormDialog.jsx";
import PeriodRangeFilter from "../components/PeriodRangeFilter.jsx";
import RefreshButton from "../components/RefreshButton.jsx";
import { money, dateLabel, todayISO } from "../lib/formatters.js";
import "./Abastecimentos.css";

const id = () => globalThis.crypto?.randomUUID?.() || `fuel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const empty = () => ({ date: todayISO(), truckId: "", driverId: "", liters: "", amount: "", odometer: "", fullTank: true, location: "", station: "", notes: "" });
const cents = (value) => Math.round(Number(value) * 100) / 100;
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const truckLabel = (truck) => truck?.name || "Caminhão não encontrado";
const sorted = (items) => [...items].sort((a,b) => String(a.date).localeCompare(String(b.date)) || Number(a.odometer) - Number(b.odometer));

/** Média apenas entre tanques completos, somando litros de abastecimentos intermediários. */
export function consumptionAverage(items, entry) {
  const history = sorted(items.filter(item => String(item.truckId) === String(entry.truckId)));
  const index = history.findIndex(item => item.id === entry.id);
  if (index < 0 || !entry.fullTank || !positive(entry.odometer)) return null;
  let previous = index - 1;
  while (previous >= 0 && !history[previous].fullTank) previous--;
  if (previous < 0 || !positive(history[previous].odometer)) return null;
  const distance = Number(entry.odometer) - Number(history[previous].odometer);
  const liters = history.slice(previous + 1, index + 1).reduce((sum,item) => sum + Number(item.liters || 0),0);
  return distance > 0 && liters > 0 ? distance / liters : null;
}

export default function Abastecimentos({ data, onSave, readOnly, loading, version, onRefresh }) {
  const [form,setForm] = useState(null);
  const [editing,setEditing] = useState(null);
  const [formVersion,setFormVersion] = useState(version);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [truckFilter,setTruckFilter] = useState("");
  const [query,setQuery] = useState("");
  const [start,setStart] = useState("");
  const [end,setEnd] = useState("");
  const trucks = data.trucks || [];
  const drivers = (data.employees || []).filter(person => /motorista/i.test(String(person.role || person.function || "")));
  const records = data.fuelings || [];
  const filtered = useMemo(() => sorted(records.filter(item => (!truckFilter || String(item.truckId) === truckFilter) && (!start || item.date >= start) && (!end || item.date <= end) && (!query || [item.location,item.station,item.notes,drivers.find(d => String(d.id) === String(item.driverId))?.name,trucks.find(t => String(t.id) === String(item.truckId))?.name].some(value => String(value || "").toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))))).reverse(),[records,truckFilter,start,end,query,trucks,drivers]);
  const previewAverage = useMemo(() => {
    if (!form || !form.truckId || !form.date || !positive(form.odometer) || !positive(form.liters) || !form.fullTank) return null;
    const candidate = { ...form, id: editing || "__fueling_preview__", liters: Number(form.liters), odometer: Number(form.odometer) };
    const history = editing ? records.map(item => item.id === editing ? candidate : item) : [...records, candidate];
    return consumptionAverage(history, candidate);
  }, [form, editing, records]);
  const totalLiters = filtered.reduce((sum,item) => sum + Number(item.liters || 0),0);
  const totalAmount = filtered.reduce((sum,item) => sum + Number(item.amount || 0),0);
  const open = (record) => { setError("");setEditing(record?.id || null);setFormVersion(version);setForm(record ? { ...record, liters:String(record.liters), amount:String(record.amount), odometer:String(record.odometer || "") } : empty()); };
  const save = async (event) => {
    event.preventDefault();
    if (readOnly) return;
    const truck = trucks.find(item => String(item.id) === String(form.truckId));
    if (!truck || !form.date || !positive(form.liters) || !positive(form.amount) || (form.odometer !== "" && (!Number.isFinite(Number(form.odometer)) || Number(form.odometer) < 0))) { setError("Confira caminhão, data, litros, valor e quilometragem."); return; }
    const existing = records.find(item => item.id === editing);
    const oldExpense = (data.expenses || []).find(item => item.fuelingId === editing);
    if (oldExpense?.installments?.some(item => Number(item.paid || 0) > 0 || (item.payments || []).length)) {
      if (cents(oldExpense.value) !== cents(form.amount) || String(existing?.truckId) !== String(form.truckId) || existing?.date !== form.date) { setError("A despesa vinculada já tem pagamentos. Não é permitido alterar valor, caminhão ou data.");return; }
    }
    const fuelId = editing || id();
    const entry = { ...form, id:fuelId, truckId:String(truck.id), liters:Number(form.liters), amount:cents(form.amount), odometer:form.odometer === "" ? null : Number(form.odometer), fullTank:Boolean(form.fullTank), plate:truck.plate || "", driverId: String(form.driverId || "") };
    const expenseId = oldExpense?.id || id();
    const installment = { due:entry.date, value:entry.amount, paid:0, payments:[] };
    const expense = { ...(oldExpense || {}), id:expenseId, fuelingId:fuelId, created:entry.date, description:`Abastecimento · ${truck.name}`, category:"Combustível", truck:truck.name, supplier:entry.station, value:entry.amount, notes:entry.notes, installments:oldExpense?.installments?.some(i => Number(i.paid || 0)>0) ? oldExpense.installments : [installment] };
    setSaving(true);setError("");
    try {
      await onSave({ ...data, fuelings:editing ? records.map(item => item.id === editing ? entry : item) : [...records,entry], expenses:oldExpense ? data.expenses.map(item => item.id === oldExpense.id ? expense : item) : [...(data.expenses || []),expense] },formVersion);
      setForm(null);setEditing(null);
    } catch (e) { setError(e?.message || "Não foi possível salvar."); }
    finally { setSaving(false); }
  };
  const remove = async (entry) => {
    if (readOnly) return;
    const expense = (data.expenses || []).find(item => item.fuelingId === entry.id);
    if (expense?.installments?.some(item => Number(item.paid || 0)>0 || (item.payments || []).length)) { setError("Este abastecimento possui pagamentos vinculados. Não pode ser excluído.");return; }
    if (!window.confirm("Excluir abastecimento e sua despesa vinculada?")) return;
    setSaving(true);setError("");
    try { await onSave({ ...data, fuelings:records.filter(item => item.id !== entry.id), expenses:(data.expenses || []).filter(item => item.fuelingId !== entry.id) },version); }
    catch(e) { setError(e?.message || "Não foi possível excluir."); }
    finally { setSaving(false); }
  };
  return <section className="panel rr-fuelings">
    <div className="panel-heading"><h3>ABASTECIMENTOS</h3>{!readOnly && <AddRecordButton disabled={saving || loading} onClick={() => open(null)} title="Adicionar abastecimento" />}</div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="page-filters fueling-filters"><input aria-label="Buscar registros" placeholder="Buscar registros" value={query} onChange={e=>setQuery(e.target.value)} /><select aria-label="Filtrar caminhão" value={truckFilter} onChange={e=>setTruckFilter(e.target.value)}><option value="">Todos os caminhões</option>{trucks.map(t=><option key={t.id} value={String(t.id)}>{t.name}</option>)}</select><PeriodRangeFilter startDate={start} endDate={end} onStartDateChange={setStart} onEndDateChange={setEnd}/><button type="button" className="secondary-button" onClick={()=>{setQuery("");setTruckFilter("");setStart("");setEnd("");}}>Limpar filtros</button><RefreshButton onRefresh={onRefresh} loading={loading}/></div>
    <div className="fueling-summary"><div><span>Litros abastecidos</span><strong>{totalLiters.toLocaleString("pt-BR",{maximumFractionDigits:2})} L</strong></div><div><span>Valor total</span><strong>{money(totalAmount)}</strong></div><div><span>Preço médio por litro</span><strong>{totalLiters ? money(totalAmount/totalLiters) : "—"}</strong></div></div>
    <div className="table-scroll"><table><thead><tr><th>Data</th><th>Caminhão</th><th>Placa</th><th>Motorista</th><th>Cidade / Posto</th><th>Litros</th><th>Valor</th><th>R$/L</th><th>KM</th><th>Tanque completo</th><th>Média km/L</th>{!readOnly && <th>Ações</th>}</tr></thead><tbody>{filtered.map(entry=>{const truck=trucks.find(t=>String(t.id)===String(entry.truckId));const average=consumptionAverage(records,entry);return <tr key={entry.id} className={!readOnly?"editable-row":""} onClick={!readOnly?()=>open(entry):undefined}><td>{dateLabel(entry.date)}</td><td>{truckLabel(truck)}</td><td>{truck?.plate || entry.plate || "—"}</td><td>{drivers.find(d => String(d.id) === String(entry.driverId))?.name || "—"}</td><td>{[entry.location,entry.station].filter(Boolean).join(" · ") || "—"}</td><td>{Number(entry.liters).toLocaleString("pt-BR")}</td><td>{money(entry.amount)}</td><td>{money(entry.amount/entry.liters)}</td><td>{entry.odometer ?? "—"}</td><td>{entry.fullTank?"Sim":"Não"}</td><td>{average === null?"—":average.toFixed(2).replace(".",",")}</td>{!readOnly && <td><button type="button" className="secondary-button" onClick={e=>{e.stopPropagation();open(entry);}}>Editar</button> <button type="button" className="secondary-button" onClick={e=>{e.stopPropagation();remove(entry);}}>Excluir</button></td>}</tr>})}{!filtered.length && <tr><td colSpan={readOnly?11:12}>Nenhum abastecimento encontrado.</td></tr>}</tbody></table></div>
    {form && !readOnly && <FormDialog label={editing?"EDITAR ABASTECIMENTO":"ADICIONAR ABASTECIMENTO"} onClose={()=>setForm(null)}><form className="record-editor" onSubmit={save}><div className="editor-heading"><h3>{editing?"EDITAR ABASTECIMENTO":"ADICIONAR ABASTECIMENTO"}</h3><button type="button" className="secondary-button" onClick={()=>setForm(null)}>Cancelar</button></div><div className="editor-grid fueling-editor-grid">
    <label className="editor-field">Data *<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
    <label className="editor-field">Caminhão *<select required value={form.truckId} onChange={e=>setForm({...form,truckId:e.target.value})}><option value="">Selecione</option>{trucks.map(t=><option key={t.id} value={String(t.id)}>{t.name}</option>)}</select></label>
    <label className="editor-field">Placa<input disabled value={trucks.find(t=>String(t.id)===String(form.truckId))?.plate || ""}/></label>
    <label className="editor-field">Motorista<select value={form.driverId || ""} onChange={e=>setForm({...form,driverId:e.target.value})}><option value="">Selecione</option>{drivers.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}</select></label>
    <label className="editor-field">Cidade<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
    <label className="editor-field">Posto<input value={form.station} onChange={e=>setForm({...form,station:e.target.value})}/></label>
    <label className="editor-field">Litros *<input type="number" min="0.001" step="0.001" required value={form.liters} onChange={e=>setForm({...form,liters:e.target.value})}/></label>
    <label className="editor-field">Valor abastecido (R$) *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
    <label className="editor-field">Preço do diesel (R$/L)<input disabled value={positive(form.liters)&&positive(form.amount)?(Number(form.amount)/Number(form.liters)).toFixed(3):""}/></label>
    <label className="editor-field">Média (km/l)<input readOnly value={previewAverage === null ? "" : previewAverage.toFixed(2).replace(".",",")}/></label>
    <label className="editor-field">Quilometragem<input type="number" min="0" step="1" value={form.odometer ?? ""} onChange={e=>setForm({...form,odometer:e.target.value})}/></label>
    <label className="editor-field">Completou o tanque?<select value={form.fullTank?"sim":"nao"} onChange={e=>setForm({...form,fullTank:e.target.value==="sim"})}><option value="sim">Sim</option><option value="nao">Não</option></select></label>
    <label className="editor-field fueling-notes">Observações (Opcional)<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    </div><p className="fueling-help">O abastecimento gera uma despesa em Combustível. Não vincula automaticamente o custo a um frete.</p><div className="editor-actions"><button className="primary-button" disabled={saving} type="submit">{saving?"Salvando…":"SALVAR ABASTECIMENTO"}</button></div></form></FormDialog>}
  </section>;
}
