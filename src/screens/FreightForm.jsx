import "../styles/freight-required-fields.css";
import { freightProfit, freightCost, freightCommission, freightBase } from "../domain/freightCalculations.js";
import { money } from "../lib/formatters.js";
import { FREIGHT_LABELS } from "../lib/freightLabels.js";

const amount = (value) => Math.max(0, Number(value) || 0);

function FreightField({ label, value, onChange, type = "text", required = false, min, step, options, placeholder, readOnly = false, multiline = false, optional = false }) {
  return <label className={`editor-field ${type === "checkbox" ? "checkbox-field" : ""} ${required && String(value ?? "").trim() === "" ? "freight-required-empty" : ""}`}>
    <span>{label}{optional && <em className="freight-optional-label"> (Opcional)</em>}</span>
    {options ? <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={required} disabled={readOnly}>
      {options.map((item) => typeof item === "string" ? <option key={item} value={item}>{item}</option> : <option key={item.value} value={item.value}>{item.label}</option>)}
    </select> : type === "checkbox" ? <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} disabled={readOnly} /> :
    multiline ? <textarea rows={4} required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} /> : <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} required={required} min={min} step={step} placeholder={placeholder} readOnly={readOnly} onWheel={type === "number" ? (event) => event.currentTarget.blur() : undefined} />}
  </label>;
}

export default function FreightForm({ value, setValue, onSubmit, onCancel, saving, employees = [], trucks = [], editing = false }) {
  const patch = (key, next) => setValue((current) => ({ ...current, [key]: next }));
  const estimatedFuel = amount(value.liters) * amount(value.dieselPrice);
  const fuelAverage = amount(value.liters) > 0 && String(value.km ?? "").trim() !== ""
    ? `${(amount(value.km) / amount(value.liters)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`
    : "—";
  const calculationInput = { ...value, value: amount(value.value), discount: amount(value.discount), toll: amount(value.toll), commission: amount(value.commission), bonus: amount(value.bonus), fuelActual: amount(value.fuelActual) };
  const summary = [
    [FREIGHT_LABELS.value, money(value.value)],
    ["Base da comissão", money(freightBase(calculationInput))],
    [FREIGHT_LABELS.commission, money(freightCommission(calculationInput))],
    ["Saldo pendente", money(Math.max(0, amount(value.value) - amount(value.received)))],
    ["Custo do combustível", money(amount(value.fuelActual))],
    ["Saldo atual do frete", money(value.currentBalance === "" || value.currentBalance == null
      ? Math.max(0, amount(value.value) - amount(value.advance) - amount(value.discount))
      : amount(value.currentBalance))],
    [FREIGHT_LABELS.totalCost, money(freightCost(calculationInput))],
    [FREIGHT_LABELS.profit, money(freightProfit(calculationInput))]
  ];
  const fields = [
    { key: "date", label: FREIGHT_LABELS.date, type: "date", required: true },
    { key: "customer", label: "Cliente", placeholder: "Nome do cliente", optional: true },
    { key: "driver", label: FREIGHT_LABELS.driver, required: true, options: [{ value: "", label: "Selecione o motorista" }, ...employees.filter((employee) => employee.role === "Motorista" && employee.active !== false).map((employee) => ({ value: employee.name, label: employee.name }))] },
    { key: "truck", label: "Caminhão", required: true, options: [{ value: "", label: "Selecione o caminhão" }, ...trucks.filter((truck) => truck.active !== false).map((truck) => ({ value: truck.name, label: truck.name }))] },
    { key: "origin", label: "Origem", required: true, placeholder: "Cidade de origem" },
    { key: "destination", label: "Destino", required: true, placeholder: "Cidade de destino" },
    { key: "value", label: `${FREIGHT_LABELS.value} (R$)`, type: "number", min: "0", step: "0.01", required: true },
    { key: "discount", label: "Descontos gerais (R$)", type: "number", min: "0", step: "0.01", optional: true },
    { key: "toll", label: "Pedágio (R$)", type: "number", min: "0", step: "0.01", required: true },
    { key: "commissionType", label: "Tipo de comissão", options: [{ value: "percent", label: "Percentual", required: true }, { value: "fixed", label: "Valor fixo" }] },
    { key: "commission", label: `${FREIGHT_LABELS.commission} (% ou R$)`, type: "number", min: "0", step: "0.01", required: true },
    { key: "bonus", label: "Bônus (R$)", type: "number", min: "0", step: "0.01", optional: true },
    { key: "otherCosts", label: "Outros custos (R$)", type: "number", min: "0", step: "0.01", optional: true },
    { key: "currentBalance", label: "Saldo atual (R$)", type: "number", min: "0", step: "0.01", required: true },
    { key: "received", label: "Valor de adiantamento (R$)", type: "number", min: "0", step: "0.01", readOnly: editing, required: true },
    { key: "notes", label: "Observações", placeholder: "Informações adicionais", multiline: true, optional: true }
  ];
  return <form className="record-editor freight-editor" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className="editor-heading"><h3>FRETE</h3><button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button></div>
    <div className="editor-grid freight-fields">{fields.map((field) => <div key={field.key} className={field.key === "notes" ? "freight-notes-field" : "freight-grid-field"}><FreightField {...field} value={value[field.key]} onChange={(next) => patch(field.key, next)} /></div>)}</div>
    <p className="receipt-sync-note">{editing ? "Recebimentos do cliente são exibidos para consulta e alterados apenas pelo histórico de recebimentos, preservando registros anteriores." : "O valor de adiantamento recebido do cliente na criação será registrado no histórico de recebimentos."}</p>
    <section className="fuel-section" aria-labelledby="fuel-section-title">
      <div className="fuel-section-heading"><h4 id="fuel-section-title">Combustível</h4><p>Estimativa automática a partir dos litros e do preço por litro.</p></div>
      <div className="fuel-grid">
        <FreightField label="Quilometragem (km)" required type="number" min="0" step="1" value={value.km} onChange={(next) => patch("km", next)} />
        <FreightField label="Média (km/L)" value={fuelAverage} readOnly />
        <FreightField label="Litros estimados" required type="number" min="0" step="0.01" value={value.liters} onChange={(next) => patch("liters", next)} />
        <FreightField label="Preço do diesel (R$/L)" required type="number" min="0" step="0.01" value={value.dieselPrice} onChange={(next) => patch("dieselPrice", next)} />
        <FreightField label="Gasto estimado (R$)" value={money(estimatedFuel)} readOnly />
        <FreightField label="Gasto real do combustível (R$)" required type="number" min="0" step="0.01" value={value.fuelActual} onChange={(next) => patch("fuelActual", next)} />
      </div>
    </section>
    <div className="toll-checkbox-row">
      <FreightField label="Descontar o pedágio da base da comissão" type="checkbox" value={value.deductToll} onChange={(next) => patch("deductToll", next)} />
      <p>Quando marcado, o pedágio reduz a base usada para calcular a comissão</p>
    </div>
    <section className="freight-summary" aria-label="Resumo financeiro estimado">
      <div className="freight-summary-heading"><h4>Resumo financeiro</h4><span>Valores calculados automaticamente</span></div>
      <div className="freight-summary-grid">{summary.map(([label, total]) => <div className={`freight-summary-item ${label === FREIGHT_LABELS.totalCost ? "freight-summary-cost" : label === FREIGHT_LABELS.profit ? "freight-summary-profit" : ""}`} key={label}><span>{label}</span><strong>{total}</strong></div>)}</div>
    </section>
    <p className="receipt-sync-note">Os custos informados neste frete já entram no lucro estimado. Não lance o mesmo gasto novamente em Despesas para evitar contá-lo duas vezes.</p>
    <div className="editor-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar frete"}</button></div>
  </form>;
}
