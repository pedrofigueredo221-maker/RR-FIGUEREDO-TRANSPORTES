import { useState } from "react";
import "../styles/accounts-standard.css";
import AccountActions from "../components/AccountActions.jsx";
import AddRecordButton from "../components/AddRecordButton.jsx";
import FreightReceiptPanel from "../components/FreightReceiptPanel.jsx";

import FormDialog from "../components/FormDialog.jsx";
import ReceivableAccountDialog from "../components/ReceivableAccountDialog.jsx";
import { freightReceivableBalance, freightReceivableStatus } from "../domain/freightReceivables.js";
import { PAYMENT_METHODS, addMovement, accountTotals } from "../domain/accountLedger.js";

export default function ContasAReceber({ controller }) {
  const [editingAccount, setEditingAccount] = useState(null);
  const [manualEditor, setManualEditor] = useState(undefined);
  const [accountNote, setAccountNote] = useState("");
  const [accountDue,setAccountDue]=useState("");
  const [manual, setManual] = useState({description:"",value:"",created:new Date().toISOString().slice(0,10),due:new Date().toISOString().slice(0,10)});
  const [manualError,setManualError]=useState("");
  const [manualPayment,setManualPayment]=useState(null);
  const [paidAmount,setPaidAmount]=useState("");
  const [paidDate,setPaidDate]=useState(new Date().toISOString().slice(0,10));
  const [paidMethod,setPaidMethod]=useState("PIX");
  const [accountStatusFilter,setAccountStatusFilter]=useState("Todos");
  const [accountOriginFilter,setAccountOriginFilter]=useState("Todas");
  const [paidNotes,setPaidNotes]=useState("");
  const { data, readOnly, loading, saving, showError, toolbar, filteredFreights, dateLabel, money, payment, setPayment, form, setForm, editingId, setEditingId, startEdit, saveFreight, allFreights, number, commit, remove } = controller;
  const openReceipt = (freight) => {
    setForm(null);
    setEditingId(null);
    setPayment({ kind: "receive", record: freight });
  };
  return <section className="panel rr-accounts">
    <div className="panel-heading"><div><h3>Contas a receber</h3><p>Cada frete gera um recebível vinculado ao mesmo registro. O status é atualizado conforme os pagamentos.</p></div>{!readOnly && <AddRecordButton disabled={saving} onClick={() => setManualEditor(null)} title="Adicionar conta a receber" />}</div>
    {!readOnly && manualEditor !== undefined && (
      <ReceivableAccountDialog
        key={manualEditor?.id || "new"}
        account={manualEditor}
        saving={saving}
        money={money}
        dateLabel={dateLabel}
        onCancel={() => setManualEditor(undefined)}
        onSave={async (record) => {
          const id = manualEditor?.id || (globalThis.crypto?.randomUUID?.() || String(Date.now()));
          const next = { ...record, id };
          await commit({
            ...data,
            receivables: manualEditor
              ? (data.receivables || []).map((item) => item.id === id ? next : item)
              : [...(data.receivables || []), next],
          });
          setManualEditor(undefined);
        }}
      />
    )}
    {!readOnly && editingAccount?.type === "freight" && (
      <FormDialog label="Editar conta a receber" onClose={() => setEditingAccount(null)}>
        <div className="record-editor">
          <h3>Editar conta a receber vinculada ao frete</h3>
        {editingAccount.type==="freight" && <><p>Conta vinculada ao frete. O valor original é controlado no frete; vencimento e observações são financeiros.</p><label className="editor-field">Vencimento da conta<input type="date" value={accountDue} onChange={event=>setAccountDue(event.target.value)}/></label><label className="editor-field">Observações financeiras<textarea value={accountNote} onChange={e=>setAccountNote(e.target.value)} rows={3}/></label><div className="editor-actions"><button type="button" className="primary-button" disabled={saving} onClick={()=>{commit({...data,freights:allFreights.map(item=>item.id===editingAccount.record.id?{...item,receivableNotes:accountNote,receivableDue:accountDue}:item)});setEditingAccount(null);}}>Salvar observações</button></div></>}
        {editingAccount.type==="freight"&&<div className="rr-account-ledger"><h4>Movimentações do recebível</h4><p>Recebido: {money(editingAccount.record.received)} · Saldo: {money(freightReceivableBalance(editingAccount.record,number))}</p>{(editingAccount.record.receipts||[]).map((entry,index)=><p key={entry.id||index}>{dateLabel(entry.date)} · {entry.method||"Não informado"} · {money(entry.amount)}</p>)}<button type="button" className="secondary-button" onClick={()=>{setEditingAccount(null);openReceipt(editingAccount.record);}}>Registrar nova baixa</button></div>}
        {editingAccount.type==="manual"&&<div className="rr-account-ledger"><h4>Movimentações da conta</h4><p>Recebido: {money(editingAccount.record.received)} · Saldo: {money(Math.max(0,number(editingAccount.record.value)-number(editingAccount.record.received)))}</p>{(editingAccount.record.receipts||[]).map((receipt,index)=><p key={receipt.id||index}>{dateLabel(receipt.date)} · {receipt.method} · {money(receipt.amount)}</p>)}<div className="editor-grid"><label className="editor-field">Valor da baixa (R$)<input type="number" min="0.01" step="0.01" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/></label><label className="editor-field">Data da baixa<input type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)}/></label><label className="editor-field">Meio de recebimento<select value={paidMethod} onChange={e=>setPaidMethod(e.target.value)}>{PAYMENT_METHODS.map(method=><option key={method}>{method}</option>)}</select></label></div><label className="editor-field">Observações (Opcional)<textarea rows={2} value={paidNotes} onChange={e=>setPaidNotes(e.target.value)}/></label><button className="primary-button" type="button" disabled={saving} onClick={()=>{try{const current=(data.receivables||[]).find(x=>x.id===editingAccount.record.id);if(!current)throw new Error("Conta não encontrada.");const receipts=addMovement(current.value,current.receipts||[],{date:paidDate,method:paidMethod,amount:Number(paidAmount),notes:paidNotes});const totals=accountTotals(current.value,receipts);commit({...data,receivables:(data.receivables||[]).map(x=>x.id===current.id?{...x,receipts,received:totals.paid}:x)});setEditingAccount(null);}catch(error){setManualError(error.message);}}}>Salvar nova baixa</button></div>}

          <button type="button" className="secondary-button" onClick={() => setEditingAccount(null)}>Cancelar</button>
        </div>
      </FormDialog>
    )}
    {showError}{toolbar}
    <div className="rr-account-filter-bar"><label>Situação <select value={accountStatusFilter} onChange={event=>setAccountStatusFilter(event.target.value)}>{["Todos","Pendente","Parcial","Fechada"].map(value=><option key={value}>{value}</option>)}</select></label><label>Origem <select value={accountOriginFilter} onChange={event=>setAccountOriginFilter(event.target.value)}>{["Todas","Fretes","Manuais"].map(value=><option key={value}>{value}</option>)}</select></label></div>
    <div className="table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Rota</th><th>Valor do frete</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly && <th>Ação</th>}</tr></thead><tbody>
      {(accountOriginFilter==="Manuais"?[]:filteredFreights).filter(freight=>{const balance=freightReceivableBalance(freight,number);const status=balance<=0?"Fechada":number(freight.received)>0?"Parcial":"Pendente";return accountStatusFilter==="Todos"||accountStatusFilter===status;}).map((freight) => {
        const balance = freightReceivableBalance(freight, number);
        const status = freightReceivableStatus(freight, number);
        return <tr key={freight.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar apenas os dados financeiros desta conta" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; if(balance<=0){window.alert("CONTA FECHADA — Não é possível alterar.");return;}setEditingAccount({type:"freight",record:freight});setAccountNote(freight.receivableNotes||"");setAccountDue(freight.receivableDue||freight.date||"");setAccountDue(freight.receivableDue||freight.date||""); } : undefined}>
          <td>{dateLabel(freight.date)}</td><td>{freight.customer || "—"}</td><td>{[freight.origin, freight.destination].filter(Boolean).join(" → ") || "—"}</td>
          <td className="numeric">{money(freight.value)}</td><td className="numeric">{money(freight.received)}{(freight.receipts||[]).length>0&&<details className="rr-payment-history"><summary>Histórico ({freight.receipts.length})</summary>{freight.receipts.map((receipt,index)=><div key={receipt.id||index}>{dateLabel(receipt.date)} · {receipt.method||"Não informado"} · {money(receipt.amount)}</div>)}</details>}</td><td className="numeric">{money(balance)}</td>
          <td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>
          {!readOnly && <td><AccountActions onDelete={null} onEdit={balance <= 0 ? null : () => {setEditingAccount({type:"freight",record:freight});setAccountNote(freight.receivableNotes||"");setAccountDue(freight.receivableDue||freight.date||"");}} onPayment={balance > 0 ? () => openReceipt(freight) : null} paymentLabel="Registrar recebimento parcial ou total" disabled={saving} /></td>}
        </tr>;
      })}
    </tbody></table></div>
    {accountOriginFilter!=="Fretes"&&<><h4>Contas a receber manuais</h4><div className="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly&&<th>Ações</th>}</tr></thead><tbody>{(data.receivables||[]).filter(item=>(!controller.query||[item.description,item.id].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(controller.query.toLocaleLowerCase("pt-BR"))))&&(!controller.startDate||item.created>=controller.startDate)&&(!controller.endDate||item.created<=controller.endDate)).filter(item=>{const balance=Math.max(0,number(item.value)-number(item.received));const status=balance<=0?"Fechada":number(item.received)>0?"Parcial":"Pendente";return accountStatusFilter==="Todos"||accountStatusFilter===status;}).map(item=>{const balance=Math.max(0,number(item.value)-number(item.received));const status=balance===0?"Recebida":number(item.received)>0?"Parcial":"Pendente";return <tr key={item.id} onClick={balance<=0?()=>window.alert("CONTA FECHADA — Não é possível alterar."):undefined}><td>{dateLabel(item.created)}</td><td>{item.description}</td><td>{dateLabel(item.due)}</td><td>{money(item.value)}</td><td>{money(item.received)}{(item.receipts||[]).length>0&&<details className="rr-payment-history"><summary>Histórico ({item.receipts.length})</summary>{item.receipts.map((receipt,index)=><div key={receipt.id||index}>{dateLabel(receipt.date)} · {receipt.method||"Não informado"} · {money(receipt.amount)}</div>)}</details>}</td><td>{money(balance)}</td><td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>{!readOnly&&<td><AccountActions onEdit={balance<=0?null:()=>setManualEditor(item)} onPayment={balance>0?()=>setManualEditor(item):null} onDelete={balance<=0||number(item.received)>0||(item.receipts||[]).length>0?null:()=>remove("receivables",item)} paymentLabel="Registrar recebimento" disabled={saving}/></td>}</tr>})}</tbody></table></div></>}
    {filteredFreights.length === 0 && <div className="empty-state">Nenhuma conta a receber encontrada para os filtros selecionados.</div>}
    {!readOnly && payment?.kind === "receive" && <FormDialog label="Registrar recebimento" onClose={() => setPayment(null)}><FreightReceiptPanel freight={allFreights.find((item) => item.id === payment.record.id) || payment.record} data={data} number={number} money={money} saving={saving} onSave={(next) => commit(next)} onCancel={() => setPayment(null)} /></FormDialog>}
  </section>;
}
