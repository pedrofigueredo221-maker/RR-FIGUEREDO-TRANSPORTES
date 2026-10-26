import "./../styles/freight-payment-status.css";
import FreightForm from "./FreightForm.jsx";
import { FREIGHT_LABELS } from "../lib/freightLabels.js";
import AddRecordButton from "../components/AddRecordButton.jsx";
import RouteDisplay from "../components/RouteDisplay.jsx";
import "../styles/freight-table-standard.css";
import FormDialog from "../components/FormDialog.jsx";
import FreightReceiptPanel from "../components/FreightReceiptPanel.jsx";
import { freightReceivableBalance } from "../domain/freightReceivables.js";
import { freightCommission, freightCost, freightProfit } from "../domain/freightCalculations.js";

export default function Fretes({ controller }) {
  const { data, readOnly, loading, saving, form, setForm, editingId, setEditingId, startCreate, startEdit, saveFreight, showError, toolbar, filteredFreights, dateLabel, money, Actions, remove, payment, setPayment, allFreights, number, commit, employees, trucks } = controller;
  const openReceipt = (freight) => {
    setForm(null);
    setEditingId(null);
    setPayment({ kind: "receive", record: freight });
  };
  return <section className="panel">
    <div className="panel-heading"><div><h3>VIAGENS</h3><p>Cadastre viagens e acompanhe custos, comissão e recebimentos.</p></div>{!readOnly && <AddRecordButton disabled={loading || saving} onClick={() => startCreate("freight")} title="Adicionar frete" />}</div>
    {showError}
    {!readOnly && form && <FormDialog label={editingId ? "Editar frete" : "Adicionar frete"} onClose={() => setForm(null)}><FreightForm value={form} setValue={setForm} saving={saving} onCancel={() => setForm(null)} onSubmit={saveFreight} employees={data.employees || []} trucks={data.trucks || []} editing={Boolean(editingId)} /></FormDialog>}
    {toolbar}
    <p className="freight-search-count" role="status">{filteredFreights.length} {filteredFreights.length === 1 ? "viagem encontrada" : "viagens encontradas"} nos filtros selecionados.</p>
    <div className="table-scroll"><table className="rr-freight-table"><thead><tr><th>{FREIGHT_LABELS.date}</th><th>{FREIGHT_LABELS.driver}</th><th>{FREIGHT_LABELS.route}</th><th>{FREIGHT_LABELS.value}</th><th>{FREIGHT_LABELS.totalCost}</th><th>{FREIGHT_LABELS.commission}</th><th>{FREIGHT_LABELS.profit}</th><th>{FREIGHT_LABELS.payment}</th>{!readOnly && <th>{FREIGHT_LABELS.actions}</th>}</tr></thead><tbody>
      {filteredFreights.map((freight) => {

        const balance = freightReceivableBalance(freight, number);
        return <tr key={freight.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar este frete" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; startEdit("freight", freight); } : undefined}>
          <td>{dateLabel(freight.date)}</td><td>{freight.driver || "—"}</td><td><RouteDisplay origin={freight.origin} destination={freight.destination} /></td>
          <td className="numeric">{money(freight.value)}</td><td className="numeric">{money(freightCost(freight))}</td><td className="numeric">{money(freightCommission(freight))}</td><td className="numeric">{money(freightProfit(freight))}</td><td className={`freight-payment-cell ${balance <= 0 ? "is-paid" : "is-pending"}`}>{balance <= 0 ? "Pagamento realizado" : `Saldo restante: ${money(balance)}`}</td>

          {!readOnly && <td className="freight-actions-cell"><div className="record-actions"><Actions onEdit={() => startEdit("freight", freight)} onDelete={() => remove("freights", freight)} />{freightReceivableBalance(freight, number) > 0 && <button className="secondary-button" type="button" disabled={saving} onClick={() => openReceipt(freight)} title="Registrar recebimento" aria-label="Registrar recebimento">▣</button>}</div></td>}
        </tr>;
      })}
    </tbody></table></div>
    {filteredFreights.length === 0 && <div className="empty-state">Nenhum frete encontrado para os filtros selecionados.</div>}
    {!readOnly && payment?.kind === "receive" && <FreightReceiptPanel freight={allFreights.find((item) => item.id === payment.record.id) || payment.record} data={data} number={number} money={money} saving={saving} onSave={(next) => commit(next)} onCancel={() => setPayment(null)} />}
  </section>;
}
