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
function Stage({ stage, title, update, loaded = false }) {
  const km = stage.kmStart !== "" && stage.kmEnd !== "" && n(stage.kmEnd) >= n(stage.kmStart) ? n(stage.kmEnd) - n(stage.kmStart) : null;
  const average = km !== null && n(stage.liters) > 0 ? km / n(stage.liters) : null;
  const price = stage.fuelTotal !== "" && n(stage.liters) > 0 ? n(stage.fuelTotal) / n(stage.liters) : null;
  const patch = (key) => (next) => update(key, next);
  return <section className="freight-stage">
    <h4>{title}</h4>
    <div className="freight-stage-grid">
      {inputField("Data", stage.date, patch("date"), { type: "date", required: true })}
      <MunicipalityField label="Origem" value={stage.origin} onChange={loaded ? () => {} : patch("origin")} required placeholder="Cidade - UF" />
      <MunicipalityField label="Destino" value={stage.destination} onChange={patch("destination")} required placeholder="Cidade - UF" />
      {inputField("KM inicial", stage.kmStart, patch("kmStart"), { type: "number", required: true, readOnly: loaded })}
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
  const patch = (key, next) => setValue((current) => {
    if (key === "received") return { ...current, received: next, currentBalance: next === "" || current.value === "" ? "" : Math.max(0, n(current.value) - n(next)).toFixed(2) };
    if (key === "currentBalance") return { ...current, currentBalance: next, received: next === "" || current.value === "" ? "" : Math.max(0, n(current.value) - n(next)).toFixed(2) };
    if (key === "value") return { ...current, value: next, currentBalance: next === "" || current.received === "" ? "" : Math.max(0, n(next) - n(current.received)).toFixed(2) };
    return { ...current, [key]: next };
  });
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
  const updateStage = (key) => (field, next) => setValue((current) => {
    const updated = { ...current, [key]: { ...current[key], [field]: next } };
    if (key === "emptyTrip" && field === "destination") {
      updated.loadedTrip = { ...current.loadedTrip, origin: next };
    }
    if (key === "emptyTrip" && field === "kmEnd") {
      updated.loadedTrip = { ...current.loadedTrip, kmStart: next };
    }
    return updated;
  });
  const truck = trucks.find((item) => item.name === value.truck);
  const totalFuel = stages.reduce((sum, item) => sum + n(value[item.key]?.fuelTotal), 0);
  const totalToll = stages.reduce((sum, item) => sum + n(value[item.key]?.toll), 0);
  // Em fretes antigos, as etapas podem estar vazias apesar de os custos totais já estarem salvos.
  // Até que as duas etapas sejam preenchidas, preservar os valores financeiros persistidos.
  const stagesHaveCosts = stages.every(({ key }) =>
    value[key] && String(value[key].fuelTotal ?? "").trim() !== "" && String(value[key].toll ?? "").trim() !== ""
  );
  const calculation = { ...value, fuelActual: stagesHaveCosts ? totalFuel : n(value.fuelActual), toll: stagesHaveCosts ? totalToll : n(value.toll) };
  const costStage = (key) => n(value[key]?.fuelTotal) + n(value[key]?.toll);
  const summary = [
    ["Custo viagem vazia", stagesHaveCosts ? costStage("emptyTrip") : null],
    ["Custo viagem carregada", stagesHaveCosts ? costStage("loadedTrip") : null],
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
  const matchingStageKm = String(value.loadedTrip?.kmStart ?? "") === String(value.emptyTrip?.kmEnd ?? "");
  const matchingStageCity = String(value.loadedTrip?.origin ?? "").trim() === String(value.emptyTrip?.destination ?? "").trim();
  const validDates = !value.emptyTrip?.date || !value.loadedTrip?.date || value.loadedTrip.date >= value.emptyTrip.date;
  const financialSummary = (className) => <section className={`freight-stage-summary ${className}`}><h4>RESUMO FINANCEIRO</h4><div className="freight-stage-summary-grid"><div><span>Valor do frete</span><strong>{money(n(value.value))}</strong></div><div><span>Adiantamento do cliente</span><strong>{money(n(value.received))}</strong></div>{summary.map(([label, amount]) => <div key={label}><span>{label}</span><strong className={label === "Custo total da viagem" ? "freight-stage-cost" : label === "Lucro estimado" ? "freight-stage-profit" : ""}>{amount === null ? "—" : money(amount)}</strong></div>)}</div></section>;
  return <form className="record-editor freight-editor freight-stages-editor" onSubmit={(e) => { e.preventDefault(); if (validStages && validDates && matchingStageKm && matchingStageCity) onSubmit(); }}>
    <div className="editor-heading"><h3>{editing ? "EDITAR FRETE" : "ADICIONAR FRETE"}</h3><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button></div>
    <div className="freight-stage-top">
      {inputField("Motorista", value.driver, selectDriver, { required: true, options: drivers })}
      {inputField("Valor do frete (R$)", value.value, (v) => patch("value", v), { type: "number", required: true })}
      {inputField("Caminhão", value.truck, (v) => patch("truck", v), { required: true, options: truckOptions })}
      {inputField("Placa", truck?.plate || "", () => {}, { readOnly: true })}
      {inputField("Custo total da viagem (R$)", validCostInputs(value) ? freightCost(calculation).toFixed(2) : "", () => {}, { readOnly: true })}
      {inputField("Descontos gerais (R$)", value.discount, (v) => patch("discount", v), { type: "number" })}
      {inputField("Tipo de comissão", value.commissionType, (v) => patch("commissionType", v), { required: true, options: [{ value: "percent", label: "Percentual" }, { value: "fixed", label: "Valor fixo" }] })}
      <div className="freight-stage-commission-toll">
        {inputField("Comissão", value.commission, (v) => patch("commission", v), { type: "number", required: true })}
        <label className="editor-field freight-stage-checkbox freight-stage-toll-inline"><span>Descontar<br />Pedágio</span><input type="checkbox" checked={Boolean(value.deductToll)} onChange={(e) => patch("deductToll", e.target.checked)} /></label>
      </div>
      {inputField("Bônus (R$)", value.bonus, (v) => patch("bonus", v), { type: "number" })}
      {inputField("Outros custos (R$)", value.otherCosts, (v) => patch("otherCosts", v), { type: "number" })}
      {inputField("Adiantamento do cliente (R$)", value.received, (v) => patch("received", v), { type: "number" })}
      {inputField("Saldo restante (R$)", value.currentBalance, (v) => patch("currentBalance", v), { type: "number" })}
      

    </div>
    <div className="freight-stages-pair">{stages.map(({ key, title }) => <Stage key={key} title={title} stage={value[key] || {}} update={updateStage(key)} loaded={key === "loadedTrip"} />)}</div>
    {!matchingStageCity && <p className="freight-stage-error">A origem da viagem carregada deve ser igual ao destino da viagem vazia.</p>}
    {!matchingStageKm && <p className="freight-stage-error">O KM inicial da viagem carregada deve ser igual ao KM final da viagem vazia.</p>}
    {!validDates && <p className="freight-stage-error">A data da viagem carregada não pode ser anterior à data da viagem vazia.</p>}
    {!stagesHaveCosts && editing && <p className="receipt-sync-note">Os custos totais exibidos no resumo são os valores já salvos neste frete. Preencha as duas etapas para atualizar o detalhamento sem perder os custos anteriores.</p>}
    {financialSummary("freight-stage-summary-inline")}
    <p className="receipt-sync-note">Uma operação, um recebível e uma comissão. Os custos das duas etapas são somados uma única vez.</p>
    <div className="editor-actions"><button type="submit" className="primary-button" disabled={saving || !validStages || !validDates || !matchingStageKm || !matchingStageCity}>{saving ? "Salvando…" : "Salvar frete"}</button></div>
  </form>;
}
