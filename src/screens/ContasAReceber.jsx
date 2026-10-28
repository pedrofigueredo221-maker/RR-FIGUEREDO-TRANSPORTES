import { useState } from "react";
import "../styles/accounts-standard.css";
import AccountActions from "../components/AccountActions.jsx";
import AddRecordButton from "../components/AddRecordButton.jsx";
import { applyFreightReceipt } from "../domain/freightReceivables.js";

import ReceivableAccountDialog from "../components/ReceivableAccountDialog.jsx";
import { freightReceivableBalance, freightReceivableStatus } from "../domain/freightReceivables.js";

export default function ContasAReceber({ controller }) {
  const [manualEditor, setManualEditor] = useState(undefined);
  const [freightEditor, setFreightEditor] = useState(null);
  const [accountStatusFilter,setAccountStatusFilter]=useState("Todos");
  const [accountOriginFilter,setAccountOriginFilter]=useState("Todas");
  const [paidNotes,setPaidNotes]=useState("");
  const { data, readOnly, saving, showError, toolbar, filteredFreights, dateLabel, money, allFreights, number, commit, remove } = controller;
  const openFreightEditor = (freight) => setFreightEditor(freight);
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
    {!readOnly && freightEditor && (
      <ReceivableAccountDialog
        key={freightEditor.id}
        account={freightEditor}
        freightLinked
        saving={saving}
        money={money}
        dateLabel={dateLabel}
        onCancel={() => setFreightEditor(null)}
        onSave={async (record) => {
          const current = allFreights.find((item) => item.id === freightEditor.id);
          if (!current) throw new Error("Frete não encontrado. Atualize a tela.");
          const previousIds = new Set((current.receipts || []).map((receipt) => receipt.id));
          const additions = record.receipts.filter((receipt) => !previousIds.has(receipt.id));
          let freights = allFreights;
          for (const receipt of additions) {
            freights = applyFreightReceipt(freights, current.id, receipt, number);
          }
          freights = freights.map((item) => item.id === current.id ? {
            ...item,
            receivableTitle: record.title,
            receivableNotes: record.description,
            receivableDue: record.due,
            receivablePaymentMethod: record.paymentMethod,
          } : item);
          await commit({ ...data, freights });
          setFreightEditor(null);
        }}
      />
    )}
    {showError}{toolbar}
    <div className="rr-account-filter-bar"><label>Situação <select value={accountStatusFilter} onChange={event=>setAccountStatusFilter(event.target.value)}>{["Todos","Pendente","Parcial","Fechada"].map(value=><option key={value}>{value}</option>)}</select></label><label>Origem <select value={accountOriginFilter} onChange={event=>setAccountOriginFilter(event.target.value)}>{["Todas","Fretes","Manuais"].map(value=><option key={value}>{value}</option>)}</select></label></div>
    <div className="table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Rota</th><th>Valor do frete</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly && <th>Ação</th>}</tr></thead><tbody>
      {(accountOriginFilter==="Manuais"?[]:filteredFreights).filter(freight=>{const balance=freightReceivableBalance(freight,number);const status=balance<=0?"Fechada":number(freight.received)>0?"Parcial":"Pendente";return accountStatusFilter==="Todos"||accountStatusFilter===status;}).map((freight) => {
        const balance = freightReceivableBalance(freight, number);
        const status = freightReceivableStatus(freight, number);
        return <tr key={freight.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar apenas os dados financeiros desta conta" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; if(balance<=0){window.alert("CONTA FECHADA — Não é possível alterar.");return;}openFreightEditor(freight); } : undefined}>
          <td>{dateLabel(freight.date)}</td><td>{freight.customer || "—"}</td><td>{[freight.origin, freight.destination].filter(Boolean).join(" → ") || "—"}</td>
          <td className="numeric">{money(freight.value)}</td><td className="numeric">{money(freight.received)}</td><td className="numeric">{money(balance)}</td>
          <td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>
          {!readOnly && <td><AccountActions onDelete={null} onEdit={balance <= 0 ? null : () => {openFreightEditor(freight);}} onPayment={balance > 0 ? () => openFreightEditor(freight) : null} paymentLabel="Registrar recebimento parcial ou total" disabled={saving} /></td>}
        </tr>;
      })}
    </tbody></table></div>
    {accountOriginFilter!=="Fretes"&&<><h4>Contas a receber manuais</h4><div className="table-scroll"><table><thead><tr><th>Data</th><th>Título</th><th>Vencimento</th><th>Valor</th><th>Recebido</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly&&<th>Ações</th>}</tr></thead><tbody>{(data.receivables||[]).filter(item=>(!controller.query||[item.title,item.description,item.id].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(controller.query.toLocaleLowerCase("pt-BR"))))&&(!controller.startDate||item.created>=controller.startDate)&&(!controller.endDate||item.created<=controller.endDate)).filter(item=>{const balance=Math.max(0,number(item.value)-number(item.received));const status=balance<=0?"Fechada":number(item.received)>0?"Parcial":"Pendente";return accountStatusFilter==="Todos"||accountStatusFilter===status;}).map(item=>{const balance=Math.max(0,number(item.value)-number(item.received));const status=balance===0?"Recebida":number(item.received)>0?"Parcial":"Pendente";return <tr key={item.id} onClick={balance<=0?()=>window.alert("CONTA FECHADA — Não é possível alterar."):undefined}><td>{dateLabel(item.created)}</td><td>{item.title || item.description}</td><td>{dateLabel(item.due)}</td><td>{money(item.value)}</td><td>{money(item.received)}{(item.receipts||[]).length>0&&<details className="rr-payment-history"><summary>Histórico ({item.receipts.length})</summary>{item.receipts.map((receipt,index)=><div key={receipt.id||index}>{dateLabel(receipt.date)} · {receipt.method||"Não informado"} · {money(receipt.amount)}</div>)}</details>}</td><td>{money(balance)}</td><td className={`rr-account-status rr-account-status-${status.toLocaleLowerCase("pt-BR")}`}>{status}</td>{!readOnly&&<td><AccountActions onEdit={balance<=0?null:()=>setManualEditor(item)} onPayment={balance>0?()=>setManualEditor(item):null} onDelete={balance<=0||number(item.received)>0||(item.receipts||[]).length>0?null:()=>remove("receivables",item)} paymentLabel="Registrar recebimento" disabled={saving}/></td>}</tr>})}</tbody></table></div></>}
    {filteredFreights.length === 0 && <div className="empty-state">Nenhuma conta a receber encontrada para os filtros selecionados.</div>}
  </section>;
}
