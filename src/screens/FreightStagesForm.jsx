import MunicipalityField from "../components/MunicipalityField.jsx";
import { freightCommission, freightCost, freightProfit } from "../domain/freightCalculations.js";
import { money } from "../lib/formatters.js";
import "../styles/freight-stages.css";

const n = (v) => Math.max(0, Number(v) || 0);
const stages = [{ key: "emptyTrip", title: "Viagem Vazia" }, { key: "loadedTrip", title: "Viagem Carregada" }];
function inputField(label, value, change, { type = "text", required = false, readOnly = false, options, placeholder } = {}) {
  return <label className={`editor-field ${required && String(value ?? "").trim() === "" ? "freight-required-empty" : ""}`}>
    <span>{label}{required ? " *" : ""}</span>
    {options ? <select value={value ?? ""} onChange={(e) => change(e.target.value)} required={required}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      : <input type={type} value={value ?? ""} onChange={(e) => change(e.target.value)} placeholder={placeholder} required={required} readOnly={readOnly} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} onWheel={type === "number" ? (e) => e.currentTarget.blur() : undefined} />}
  </label>;
}
function Stage({ stage, title, update }) {
  const km = stage.kmStart !== "" && stage.kmEnd !== "" && n(stage.kmEnd) >= n(stage.kmStart) ? n(stage.kmEnd) - n(stage.kmStart) : null;
  const average = km !== null && n(stage.liters) > 0 ? km / n(stage.liters) : null;
  const price = stage.fuelTotal !== "" && n(stage.liters) > 0 ? n(stage.fuelTotal) / n(stage.liters) : null;
  const patch = (key) => (next) => update(key, next);
  return <section className="freight-stage">
    <h4>{title}</h4>
    <div className="freight-stage-grid">
      {inputField("Data", stage.date, patch("date"), { type: "date", required: true })}
      <MunicipalityField label="Origem" value={stage.origin} onChange={patch("origin")} required placeholder="Cidade - UF" />
      <MunicipalityField label="Destino" value={stage.destination} onChange={patch("destination")} required placeholder="Cidade - UF" />
      {inputField("KM inicial", stage.kmStart, patch("kmStart"), { type: "number", required: true })}
      {inputField("KM final", stage.kmEnd, patch("kmEnd"), { type: "number", required: true })}
      {inputField("KM rodado", km === null ? "" : String(km), () => {}, { readOnly: true })}
      {inputField("Diesel (litros)", stage.liters, patch("liters"), { type: "number", required: true })}
      {inputField("Valor abastecido (R$)", stage.fuelTotal, patch("fuelTotal"), { type: "number", required: true })}
      {inputField("Média (km/L)", average === null ? "" : average.toFixed(2), () => {}, { readOnly: true })}
      {inputField("Pedágio (R$)", stage.toll, patch("toll"), { type: "number", required: true })}
      {inputField("Preço do diesel (R$/L)", price === null ? "" : price.toFixed(2), () => {}, { readOnly: true })}
      {inputField(title === "Viagem Carregada" ? "Custo Viagem Carregada" : "Custo Viagem Vazia", stage.fuelTotal === "" || stage.toll === "" ? "" : (n(stage.fuelTotal) + n(stage.toll)).toFixed(2), () => {}, { readOnly: true })}
    </div>
    {stage.kmStart !== "" && stage.kmEnd !== "" && n(stage.kmEnd) < n(stage.kmStart) && <p className="freight-stage-error">O KM final não pode ser menor que o inicial.</p>}
  </section>;
}
function validCostInputs(value) {
  return ["emptyTrip", "loadedTrip"].every((key) => value[key] && value[key].fuelTotal !== "" && value[key].toll !== "")
    && value.value !== "" && value.commissionType !== "" && value.commission !== "";
}
export default function FreightStagesForm({ value, setValue, onSubmit, onCancel, saving, employees = [], trucks = [], editing = false }) {
  const patch = (key, next) => setValue((current) => ({ ...current, [key]: next }));
  const selectDriver = (driverName) => {
    const employee = employees.find((item) => item.name === driverName && item.role === "Motorista");
    setValue((current) => ({
      ...current,
      driver: driverName,
      commissionType: employee?.commissionType === "percent" || employee?.commissionType === "fixed" ? employee.commissionType : "",
      commission: employee?.commissionValue === "" || employee?.commissionValue == null ? "" : String(employee.commissionValue),
      deductToll: employee?.deductToll === true
    }));
  };
  const updateStage = (key) => (field, next) => setValue((current) => ({ ...current, [key]: { ...current[key], [field]: next } }));
  const truck = trucks.find((item) => item.name === value.truck);
  const totalFuel = stages.reduce((sum, item) => sum + n(value[item.key]?.fuelTotal), 0);
  const totalToll = stages.reduce((sum, item) => sum + n(value[item.key]?.toll), 0);
  const calculation = { ...value, fuelActual: totalFuel, toll: totalToll };
  const costStage = (key) => n(value[key]?.fuelTotal) + n(value[key]?.toll);
  const summary = [
    ["Custo viagem vazia", costStage("emptyTrip")],
    ["Custo viagem carregada", costStage("loadedTrip")],
    ["Comissão estimada", freightCommission(calculation)],
    ["Bônus", n(value.bonus)],
    ["Total motorista", freightCommission(calculation) + n(value.bonus)],
    ["Saldo a receber", Math.max(0, n(value.value) - n(value.received))],
    ["Custo total da viagem", freightCost(calculation)],
    ["Lucro estimado", freightProfit(calculation)]
  ];
  const drivers = employees.filter((e) => e.role === "Motorista" && e.active !== false).map((e) => ({ value: e.name, label: e.name }));
  const truckOptions = trucks.filter((t) => t.active !== false).map((t) => ({ value: t.name, label: t.name }));
  const validStages = stages.every(({ key }) => {
    const s = value[key] || {};
    return ["date", "origin", "destination", "kmStart", "kmEnd", "liters", "fuelTotal", "toll"].every((field) => String(s[field] ?? "").trim() !== "")
      && n(s.kmEnd) >= n(s.kmStart) && n(s.liters) > 0;
  });
  const validDates = !value.emptyTrip?.date || !value.loadedTrip?.date || value.loadedTrip.date >= value.emptyTrip.date;
  return <form className="record-editor freight-editor freight-stages-editor" onSubmit={(e) => { e.preventDefault(); if (validStages && validDates) onSubmit(); }}>
    <div className="editor-heading"><h3>{editing ? "EDITAR FRETE" : "ADICIONAR FRETE"}</h3><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button></div>
    <div className="freight-stage-top">
      {inputField("Motorista", value.driver, selectDriver, { required: true, options: drivers })}
      {inputField("Valor do frete (R$)", value.value, (v) => patch("value", v), { type: "number", required: true })}
      {inputField("Caminhão", value.truck, (v) => patch("truck", v), { required: true, options: truckOptions })}
      {inputField("Placa", truck?.plate || "", () => {}, { readOnly: true })}
    </div>
    <div className="freight-stages-pair">{stages.map(({ key, title }) => <Stage key={key} title={title} stage={value[key] || {}} update={updateStage(key)} />)}</div>
    {!validDates && <p className="freight-stage-error">A data da viagem carregada não pode ser anterior à data da viagem vazia.</p>}
    <section className="freight-stage-finance"><h4>Dados financeiros</h4><div className="freight-stage-finance-grid">
      {inputField("Custo total da viagem (R$)", validCostInputs(value) ? freightCost(calculation).toFixed(2) : "", () => {}, { readOnly: true })}
      {inputField("Descontos gerais (R$)", value.discount, (v) => patch("discount", v), { type: "number" })}
      {inputField("Tipo de comissão", value.commissionType, (v) => patch("commissionType", v), { required: true, options: [{ value: "percent", label: "Percentual" }, { value: "fixed", label: "Valor fixo" }] })}
      {inputField("Comissão (% ou R$)", value.commission, (v) => patch("commission", v), { type: "number", required: true })}
      {inputField("Bônus (R$)", value.bonus, (v) => patch("bonus", v), { type: "number" })}
      {inputField("Outros custos (R$)", value.otherCosts, (v) => patch("otherCosts", v), { type: "number" })}
      {inputField("Adiantamento do cliente (R$)", value.received, (v) => patch("received", v), { type: "number", required: true })}
      {inputField("Saldo restante (R$)", value.value === "" || value.received === "" ? "" : Math.max(0, n(value.value) - n(value.discount) - n(value.received)).toFixed(2), () => {}, { readOnly: true })}
      <label className="editor-field freight-stage-checkbox"><span>Descontar pedágio da base da comissão</span><input type="checkbox" checked={Boolean(value.deductToll)} onChange={(e) => patch("deductToll", e.target.checked)} /></label>
    </div></section>
    <section className="freight-stage-summary"><h4>RESUMO FINANCEIRO</h4><div className="freight-stage-summary-top"><div><span>Valor do frete</span><strong>{money(n(value.value))}</strong></div><div><span>Adiantamento do cliente</span><strong>{money(n(value.received))}</strong></div></div><div className="freight-stage-summary-grid">{summary.map(([label, amount]) => <div key={label}><span>{label}</span><strong className={label === "Custo total da viagem" ? "freight-stage-cost" : label === "Lucro estimado" ? "freight-stage-profit" : ""}>{money(amount)}</strong></div>)}</div></section>
    <p className="receipt-sync-note">Uma operação, um recebível e uma comissão. Os custos das duas etapas são somados uma única vez.</p>
    <div className="editor-actions"><button type="submit" className="primary-button" disabled={saving || !validStages || !validDates}>{saving ? "Salvando…" : "Salvar frete"}</button></div>
  </form>;
}
