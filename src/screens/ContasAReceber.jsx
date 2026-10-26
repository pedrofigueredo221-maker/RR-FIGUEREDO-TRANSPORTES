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
  const [manual, setManual] = useState({description:"",value:"",created:new Date().toISOString().slice(0,10),due:new Date().toISOString().slice(0,10)});
  const [manualError,setManualError]=useState("");
  const [manualPayment,setManualPayment]=useState(null);
  const [paidAmount,setPaidAmount]=useState("");
  const [paidDate,setPaidDate]=useState(new Date().toISOString().slice(0,10));
  const { data, readOnly, loading, saving, showError, toolbar, filteredFreights, dateLabel, money, payment, setPayment, form, setForm, editingId, setEditingId, startEdit, saveFreight, allFreights, number, commit, remove } = controller;
  const openReceipt = (freight) => {
    setForm(null);
    setEditingId(null);
    setChoosingFreight(false);
    setPayment({ kind: "receive", record: freight });
  };
  return <section className="panel rr-accounts">
    <div className="panel-heading"><div><h3>Contas a receber</h3><p>Cada frete gera um recebível vinculado ao mesmo registro. O status é atualizado conforme os pagamentos.</p></div>{!readOnly && <AddRecordButton disabled={saving} onClick={() => {setEditingAccount({type:"new"});setManual({description:"",value:"",created:new Date().toISOString().slice(0,10),due:new Date().toISOString().slice(0,10)});setManualError("");}} title="Adicionar conta a receber" />}</div>
    {!readOnly && editingAccount && <FormDialog label={editingAccount.type==="new"?"Nova conta a receber":"Editar conta a receber"} onClose={()=>setEditingAccount(null)}>
      <div className="record-editor"><h3>{editingAccount.type==="new"?"Nova conta a receber":"Editar conta a receber"}</h3>
        {(editingAccount.type==="new"||editingAccount.type==="manual") && <><p>Cadastre uma conta a receber independente de frete.</p>{manualError&&<p className="error-banner" role="alert">{manualError}</p>}<div className="editor-grid">{[{key:"description",label:"Descrição",type:"text"},{key:"value",label:"Valor total (R$)",type:"number"},{key:"created",label:"Data do lançamento",type:"date"},{key:"due",label:"Vencimento",type:"date"}].map(field=><label className="editor-field" key={field.key}>{field.label}<input required type={field.type} min={field.key==="value"?"0.01":undefined} step={field.key==="value"?"0.01":undefined} value={manual[field.key]} onChange={e=>setManual({...manual,[field.key]:e.target.value})}/></label>)}</div><button type="button" className="primary-button" disabled={saving} onClick={()=>{const value=Number(manual.value);if(!manual.description.trim()||!Number.isFinite(value)||value<=0||!manual.created||!manual.due){setManualError("Informe descrição, valor positivo e datas.");return;}const existing=editingAccount.type==="manual"?editingAccount.record:null;if(existing&&number(existing.received)>value){setManualError("O valor da conta não pode ficar abaixo do total já recebido.");return;}const id=existing?.id||(globalThis.crypto?.randomUUID?.()||String(Date.now()));const record={...existing,...manual,id,value,received:existing?.received||0,receipts:existing?.receipts||[]};commit({...data,receivables:existing?(data.receivables||[]).map(x=>x.id===id?record:x):[...(data.receivables||[]),record]});setEditingAccount(null);}}>Salvar conta a receber</button></>}
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
    <h4>Contas a receber manuais</h4><div className="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly&&<th>Ações</th>}</tr></thead><tbody>{(data.receivables||[]).filter(item=>(!controller.query||[item.description,item.id].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(controller.query.toLocaleLowerCase("pt-BR"))))&&(!controller.startDate||item.created>=controller.startDate)&&(!controller.endDate||item.created<=controller.endDate)).map(item=>{const balance=Math.max(0,number(item.value)-number(item.received));const status=balance===0?"Recebida":number(item.received)>0?"Parcial":"Pendente";return <tr key={item.id}><td>{dateLabel(item.created)}</td><td>{item.description}</td><td>{money(item.value)}</td><td>{money(item.received)}</td><td>{money(balance)}</td><td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>{!readOnly&&<td><AccountActions onEdit={()=>{setEditingAccount({type:"manual",record:item});setManual({description:item.description,value:String(item.value),created:item.created,due:item.due});setManualError("");}} onPayment={balance>0?()=>{setManualError("");setManualPayment(item);setPaidAmount(String(balance));setPaidDate(new Date().toISOString().slice(0,10));}:null} onDelete={()=>number(item.received)>0||(item.receipts||[]).length>0?setManualError("Não é permitido excluir contas com recebimentos registrados."):remove("receivables",item)} paymentLabel="Registrar recebimento" disabled={saving}/></td>}</tr>})}</tbody></table></div>
    {!readOnly&&manualPayment&&<FormDialog label="Registrar recebimento" onClose={()=>setManualPayment(null)}><div className="record-editor"><h3>Registrar recebimento</h3><p>{manualPayment.description}</p>{manualError&&<p className="error-banner">{manualError}</p>}<div className="editor-grid"><label className="editor-field">Valor recebido (R$)<input type="number" min="0.01" step="0.01" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/></label><label className="editor-field">Data do recebimento<input type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)}/></label></div><button className="primary-button" type="button" disabled={saving} onClick={()=>{const value=Number(paidAmount);const current=(data.receivables||[]).find(x=>x.id===manualPayment.id);const balance=current?Math.max(0,number(current.value)-number(current.received)):0;if(!Number.isFinite(value)||value<=0||value>balance||!paidDate){setManualError("Valor inválido ou maior que o saldo disponível.");return;}commit({...data,receivables:(data.receivables||[]).map(x=>x.id===current.id?{...x,received:Math.round((number(x.received)+value)*100)/100,receipts:[...(x.receipts||[]),{date:paidDate,amount:value,method:"Não informado"}]}:x)});setManualPayment(null);}}>Salvar recebimento</button></div></FormDialog>}
    {filteredFreights.length === 0 && <div className="empty-state">Nenhuma conta a receber encontrada para os filtros selecionados.</div>}
    {!readOnly && payment?.kind === "receive" && <FormDialog label="Registrar recebimento" onClose={() => setPayment(null)}><FreightReceiptPanel freight={allFreights.find((item) => item.id === payment.record.id) || payment.record} data={data} number={number} money={money} saving={saving} onSave={(next) => commit(next)} onCancel={() => setPayment(null)} /></FormDialog>}
  </section>;
}
