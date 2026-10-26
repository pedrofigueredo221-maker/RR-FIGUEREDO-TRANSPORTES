import { useState } from "react";
import "../styles/accounts-standard.css";
import AccountActions from "../components/AccountActions.jsx";
import AddRecordButton from "../components/AddRecordButton.jsx";
import FreightReceiptPanel from "../components/FreightReceiptPanel.jsx";
import FreightForm from "./FreightForm.jsx";
import FormDialog from "../components/FormDialog.jsx";
import { freightReceivableBalance, freightReceivableStatus } from "../domain/freightReceivables.js";

export default function ContasAReceber({ controller }) {
  const [choosingFreight, setChoosingFreight] = useState(false);
  const { data, readOnly, loading, saving, showError, toolbar, filteredFreights, dateLabel, money, payment, setPayment, form, setForm, editingId, setEditingId, startEdit, saveFreight, allFreights, number, commit, remove } = controller;
  const openReceipt = (freight) => {
    setForm(null);
    setEditingId(null);
    setChoosingFreight(false);
    setPayment({ kind: "receive", record: freight });
  };
  return <section className="panel rr-accounts">
    <div className="panel-heading"><div><h3>Contas a receber</h3><p>Cada frete gera um recebível vinculado ao mesmo registro. O status é atualizado conforme os pagamentos.</p></div>{!readOnly && <AddRecordButton disabled={saving} onClick={() => setChoosingFreight(true)} title="Adicionar recebimento" />}</div>
    {!readOnly && choosingFreight && <FormDialog label="Selecionar frete para recebimento" onClose={() => setChoosingFreight(false)}><div className="rr-receivable-picker"><p>Selecione o frete que receberá o pagamento. Os valores serão registrados no histórico existente.</p>{allFreights.filter((freight) => freightReceivableBalance(freight, number) > 0).map((freight) => <button key={freight.id} type="button" className="secondary-button" onClick={() => openReceipt(freight)}>{dateLabel(freight.date)} — {freight.customer || freight.driver || "Sem cliente"} — {money(freightReceivableBalance(freight, number))} em aberto</button>)}{!allFreights.some((freight) => freightReceivableBalance(freight, number) > 0) && <p>Não há fretes com saldo em aberto.</p>}</div></FormDialog>}
    {showError}{!readOnly && form && <FormDialog label="Editar frete" onClose={() => { setForm(null); setEditingId(null); }}><FreightForm title={editingId ? "Editar frete" : "Adicionar frete"} value={form} setValue={setForm} saving={saving} onCancel={() => { setForm(null); setEditingId(null); }} onSubmit={saveFreight} employees={data.employees || []} trucks={data.trucks || []} editing={Boolean(editingId)} /></FormDialog>}{toolbar}
    <div className="table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Rota</th><th>Valor do frete</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly && <th>Ação</th>}</tr></thead><tbody>
      {filteredFreights.map((freight) => {
        const balance = freightReceivableBalance(freight, number);
        const status = freightReceivableStatus(freight, number);
        return <tr key={freight.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar este frete" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; startEdit("freight", freight); } : undefined}>
          <td>{dateLabel(freight.date)}</td><td>{freight.customer || "—"}</td><td>{[freight.origin, freight.destination].filter(Boolean).join(" → ") || "—"}</td>
          <td className="numeric">{money(freight.value)}</td><td className="numeric">{money(freight.received)}</td><td className="numeric">{money(balance)}</td>
          <td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>
          {!readOnly && <td><AccountActions onDelete={() => remove("freights", freight)} onEdit={() => startEdit("freight", freight)} onPayment={balance > 0 ? () => openReceipt(freight) : null} paymentLabel="Registrar recebimento parcial ou total" disabled={saving} /></td>}
        </tr>;
      })}
    </tbody></table></div>
    {filteredFreights.length === 0 && <div className="empty-state">Nenhuma conta a receber encontrada para os filtros selecionados.</div>}
    {!readOnly && payment?.kind === "receive" && <FormDialog label="Registrar recebimento" onClose={() => setPayment(null)}><FreightReceiptPanel freight={allFreights.find((item) => item.id === payment.record.id) || payment.record} data={data} number={number} money={money} saving={saving} onSave={(next) => commit(next)} onCancel={() => setPayment(null)} /></FormDialog>}
  </section>;
}
