import { useState } from "react";
import "../styles/accounts-standard.css";
import AccountActions from "../components/AccountActions.jsx";
import AddRecordButton from "../components/AddRecordButton.jsx";
import FreightReceiptPanel from "../components/FreightReceiptPanel.jsx";

import FormDialog from "../components/FormDialog.jsx";
import { freightReceivableBalance, freightReceivableStatus } from "../domain/freightReceivables.js";

export default function ContasAReceber({ controller }) {
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountNote, setAccountNote] = useState("");
  const { data, readOnly, loading, saving, showError, toolbar, filteredFreights, dateLabel, money, payment, setPayment, form, setForm, editingId, setEditingId, startEdit, saveFreight, allFreights, number, commit, remove } = controller;
  const openReceipt = (freight) => {
    setForm(null);
    setEditingId(null);
    setChoosingFreight(false);
    setPayment({ kind: "receive", record: freight });
  };
  return <section className="panel rr-accounts">
    <div className="panel-heading"><div><h3>Contas a receber</h3><p>Cada frete gera um recebível vinculado ao mesmo registro. O status é atualizado conforme os pagamentos.</p></div>{!readOnly && <AddRecordButton disabled={saving} onClick={() => {setEditingAccount({type:"new"});setAccountNote("");}} title="Adicionar conta a receber" />}</div>
    {!readOnly && editingAccount && <FormDialog label={editingAccount.type==="new"?"Nova conta a receber":"Editar conta a receber"} onClose={()=>setEditingAccount(null)}>
      <div className="record-editor"><h3>{editingAccount.type==="new"?"Nova conta a receber":"Dados da conta a receber"}</h3>
        <p>{editingAccount.type==="new"?"Para registrar uma conta independente de frete, utilize o cadastro financeiro manual quando disponível.":"Esta conta foi gerada automaticamente pelo frete. O valor e os dados da viagem permanecem protegidos."}</p>
        {editingAccount.type==="freight" && <><label className="editor-field">Observações financeiras<textarea value={accountNote} onChange={e=>setAccountNote(e.target.value)} rows={3}/></label><div className="editor-actions"><button type="button" className="primary-button" disabled={saving} onClick={()=>{commit({...data,freights:allFreights.map(item=>item.id===editingAccount.record.id?{...item,receivableNotes:accountNote}:item)});setEditingAccount(null);}}>Salvar observações</button></div></>}
        <button type="button" className="secondary-button" onClick={()=>setEditingAccount(null)}>Cancelar</button>
      </div>
    </FormDialog>}
    {showError}{toolbar}
    <div className="table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Rota</th><th>Valor do frete</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly && <th>Ação</th>}</tr></thead><tbody>
      {filteredFreights.map((freight) => {
        const balance = freightReceivableBalance(freight, number);
        const status = freightReceivableStatus(freight, number);
        return <tr key={freight.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar este frete" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; setEditingAccount({type:"freight",record:freight});setAccountNote(freight.receivableNotes||""); } : undefined}>
          <td>{dateLabel(freight.date)}</td><td>{freight.customer || "—"}</td><td>{[freight.origin, freight.destination].filter(Boolean).join(" → ") || "—"}</td>
          <td className="numeric">{money(freight.value)}</td><td className="numeric">{money(freight.received)}</td><td className="numeric">{money(balance)}</td>
          <td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>
          {!readOnly && <td><AccountActions onDelete={null} onEdit={() => {setEditingAccount({type:"freight",record:freight});setAccountNote(freight.receivableNotes||"");}} onPayment={balance > 0 ? () => openReceipt(freight) : null} paymentLabel="Registrar recebimento parcial ou total" disabled={saving} /></td>}
        </tr>;
      })}
    </tbody></table></div>
    {filteredFreights.length === 0 && <div className="empty-state">Nenhuma conta a receber encontrada para os filtros selecionados.</div>}
    {!readOnly && payment?.kind === "receive" && <FormDialog label="Registrar recebimento" onClose={() => setPayment(null)}><FreightReceiptPanel freight={allFreights.find((item) => item.id === payment.record.id) || payment.record} data={data} number={number} money={money} saving={saving} onSave={(next) => commit(next)} onCancel={() => setPayment(null)} /></FormDialog>}
  </section>;
}
