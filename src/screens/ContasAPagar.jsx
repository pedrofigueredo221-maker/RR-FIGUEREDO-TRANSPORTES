import { useEffect, useRef, useState } from "react";
import AddRecordButton from "../components/AddRecordButton.jsx";
import AccountActions from "../components/AccountActions.jsx";
import ReceivableAccountDialog from "../components/ReceivableAccountDialog.jsx";
import { payableToAccount, accountToPayable, applyDuePayableCredit } from "../domain/payableAccounts.js";
import "../styles/accounts-standard.css";

const sumPaid = (expense) => (expense.installments || []).reduce((total, item) => total + Number(item.paid || 0), 0);
const expenseTotal = (expense) => Number(expense.value || 0) + Number(expense.interest || 0);
const statusOf = (expense) => {
  const paid = sumPaid(expense);
  return paid >= expenseTotal(expense) - 0.009 ? "Fechada" : paid > 0 ? "Parcial" : "Pendente";
};

export default function ContasAPagar({ controller }) {
  const { data, readOnly, saving, showError, toolbar, filteredExpenses, money, dateLabel, commit, remove } = controller;
  const [editor, setEditor] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const syncing = useRef(false);

  // Mesmo vencimento automático do crédito de Contas a Receber, mas como SAÍDA
  // registrada nas despesas; nunca altera fretes ou recebíveis.
  useEffect(() => {
    if (readOnly || saving || syncing.current) return;
    const asOf = new Date().toLocaleDateString("en-CA");
    const expenses = (data.expenses || []).map((expense) => applyDuePayableCredit(expense, asOf));
    if (!expenses.some((item, index) => item !== data.expenses[index])) return;
    syncing.current = true;
    Promise.resolve(commit({ ...data, expenses }))
      .catch((error) => console.error("Falha ao registrar parcelas de crédito vencidas em Contas a Pagar:", error))
      .finally(() => { syncing.current = false; });
  }, [data, readOnly, saving, commit]);

  const rows = filteredExpenses.filter((expense) => statusFilter === "Todos" || statusOf(expense) === statusFilter);
  return <section className="panel rr-accounts">
    <div className="panel-heading">
      <div><h3>CONTROLE DE PAGAMENTOS</h3><p>Controle de contas e pagamentos da empresa.</p></div>
      {!readOnly && <AddRecordButton disabled={saving} onClick={() => setEditor(null)} title="Adicionar conta a pagar" />}
    </div>
    {!readOnly && editor !== undefined && <ReceivableAccountDialog
      key={editor?.id || "new-payable"}
      payable
      account={payableToAccount(editor)}
      saving={saving}
      money={money}
      dateLabel={dateLabel}
      onCancel={() => setEditor(undefined)}
      onSave={async (account) => {
        const expense = accountToPayable(account, editor);
        await commit({
          ...data,
          expenses: editor
            ? (data.expenses || []).map((item) => item.id === editor.id ? expense : item)
            : [expense, ...(data.expenses || [])],
        });
        setEditor(undefined);
      }}
    />}
    {showError}
    {toolbar}
    <div className="rr-account-filter-bar">
      <label>Situação <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        {["Todos", "Pendente", "Parcial", "Fechada"].map((value) => <option key={value}>{value}</option>)}
      </select></label>
    </div>
    <div className="table-scroll">
      <table>
        <thead><tr><th>Data</th><th>Título</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Saldo em aberto</th><th>Situação</th>{!readOnly && <th>Ações</th>}</tr></thead>
        <tbody>{rows.map((expense) => {
          const total = expenseTotal(expense);
          const paid = sumPaid(expense);
          const balance = Math.max(0, total - paid);
          const closed = balance <= 0.009;
          const edit = () => setEditor(expense);
          return <tr key={expense.id} className={!readOnly && !closed ? "editable-row" : undefined}
            onClick={!readOnly ? (event) => {
              if (event.target.closest("button, a, input, select, textarea, [role=button]")) return;
              if (closed) { window.alert("CONTA FECHADA — Não é possível alterar."); return; }
              edit();
            } : undefined}>
            <td>{dateLabel(expense.created)}</td>
            <td>{expense.title || expense.description || "—"}</td>
            <td>{dateLabel(expense.due || expense.installments?.[0]?.due)}</td>
            <td className="numeric">{money(total)}</td>
            <td className="numeric">{money(paid)}</td>
            <td className="numeric balance-negative">{money(balance)}</td>
            <td className={`rr-account-status rr-account-status-${statusOf(expense).toLocaleLowerCase("pt-BR")}`}>{statusOf(expense)}</td>
            {!readOnly && <td><AccountActions
              onEdit={closed ? null : edit}
              onPayment={closed ? null : edit}
              paymentLabel="Registrar pagamento parcial ou total"
              onDelete={closed || paid > 0 ? null : () => remove("expenses", expense)}
              disabled={saving}
            /></td>}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {rows.length === 0 && <div className="empty-state">Nenhuma conta a pagar encontrada para os filtros selecionados.</div>}
  </section>;
}
