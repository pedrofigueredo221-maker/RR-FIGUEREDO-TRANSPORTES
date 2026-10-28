import { useState } from "react";
import FormDialog from "./FormDialog.jsx";
import { PAYMENT_METHODS, accountTotals, addMovement } from "../domain/accountLedger.js";
import "../styles/accounts-standard.css";
import "../styles/receivable-dialog.css";

const today = () => new Date().toISOString().slice(0, 10);
const emptyAccount = () => ({
  title: "",
  description: "",
  value: "",
  created: today(),
  due: today(),
  paymentMethod: "PIX",
  receipts: [],
});

export default function ReceivableAccountDialog({
  account,
  freightLinked = false,
  saving,
  money,
  dateLabel,
  onCancel,
  onSave,
}) {
  const [draft, setDraft] = useState(() => ({
    ...emptyAccount(),
    ...account,
    value: account ? String(account.value) : "",
    title: account?.title || account?.receivableTitle || account?.description || account?.customer || "",
    description: account?.description || account?.receivableNotes || "",
    due: account?.receivableDue || account?.due || account?.date || today(),
    created: account?.created || account?.date || today(),
    paymentMethod: account?.paymentMethod || account?.receivablePaymentMethod || "PIX",
    receipts: [...(account?.receipts || [])],
  }));
  const [entry, setEntry] = useState({ date: today(), method: "PIX", amount: "" });
  const [error, setError] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const existingPaid = freightLinked ? Math.round(Number(account?.received || 0) * 100) / 100 : 0;
  const receiptSum = draft.receipts.reduce((sum, receipt) => sum + Math.round(Number(receipt.amount || 0) * 100), 0) / 100;
  const legacyPaid = freightLinked ? Math.max(0, Math.round((existingPaid - (account?.receipts || []).reduce((sum, receipt) => sum + Math.round(Number(receipt.amount || 0) * 100), 0) / 100) * 100) / 100) : 0;
  const totals = freightLinked
    ? { paid: Math.round((legacyPaid + receiptSum) * 100) / 100, balance: Math.max(0, Math.round((Number(draft.value || 0) - legacyPaid - receiptSum) * 100) / 100) }
    : accountTotals(Number(draft.value) || 0, draft.receipts);
  const change = (field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setError("");
  };

  const addEntry = () => {
    try {
      const receipts = addMovement(Number(draft.value) - legacyPaid, draft.receipts, {
        id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
        date: entry.date,
        method: entry.method,
        amount: Number(entry.amount),
      });
      setDraft((previous) => ({ ...previous, receipts }));
      setEntry({ date: today(), method: "PIX", amount: "" });
      setEntryOpen(false);
      setError("");
    } catch (cause) {
      setError(cause.message);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    const value = Number(draft.value);
    if (!draft.title.trim() || !Number.isFinite(value) || value <= 0 || !draft.created || !draft.due) {
      setError("Informe título, valor total positivo, data e vencimento.");
      return;
    }
    if (!PAYMENT_METHODS.includes(draft.paymentMethod)) {
      setError("Selecione um meio de pagamento válido.");
      return;
    }
    if (totals.paid > value) {
      setError("O valor total não pode ser inferior aos lançamentos já recebidos.");
      return;
    }
    try {
      await onSave({
        ...draft,
        value,
        received: totals.paid,
        receipts: draft.receipts,
      });
    } catch (cause) {
      setError(cause.message || "Não foi possível salvar a conta.");
    }
  };

  return (
    <FormDialog label="Conta a Receber" onClose={onCancel}>
      <form className="record-editor rr-receivable-dialog" onSubmit={save}>
        <h3 className="rr-receivable-heading">Conta a Receber</h3>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <div className="editor-grid rr-receivable-fields">
          <label className="editor-field rr-receivable-title">
            Título da conta a receber
            <input required value={draft.title} onChange={(event) => change("title", event.target.value)} />
          </label>
          <label className="editor-field">
            Valor total (R$)
            <input required type="number" min="0.01" step="0.01" disabled={freightLinked} value={draft.value} onChange={(event) => change("value", event.target.value)} />
          </label>
          <label className="editor-field">
            Data da conta
            <input required type="date" disabled={freightLinked} value={draft.created} onChange={(event) => change("created", event.target.value)} />
          </label>
          <label className="editor-field">
            Vencimento
            <input required type="date" value={draft.due} onChange={(event) => change("due", event.target.value)} />
          </label>
          <label className="editor-field">
            Meio de pagamento
            <select value={draft.paymentMethod} onChange={(event) => change("paymentMethod", event.target.value)}>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
        </div>
        <div className="rr-account-ledger rr-receivable-ledger">
          <h4>RESUMO FINANCEIRO</h4>
          <div className="rr-receivable-summary">
            <div className="rr-receivable-metric"><span>Valor total</span><strong>{money(Number(draft.value) || 0)}</strong></div>
            <div className="rr-receivable-metric"><span>Recebido</span><strong className="rr-receivable-paid">{money(totals.paid)}</strong></div>
            <div className="rr-receivable-metric"><span>Saldo pendente</span><strong className="rr-receivable-balance">{money(totals.balance)}</strong></div>
          </div>
          {freightLinked && <p className="rr-receivable-linked-note">Conta vinculada ao frete: o valor total e a data da viagem são controlados no cadastro do frete.</p>}
          <div className="rr-receivable-history-heading"><h4>LANÇAMENTOS RECEBIDOS</h4><span>{draft.receipts.length} lançamento(s)</span></div>
          {legacyPaid > 0 && <p className="rr-receivable-legacy-note">Recebimentos anteriores ao histórico detalhado: {money(legacyPaid)}</p>}
          <div className="rr-receivable-history">
            <table>
              <thead><tr><th>Data</th><th>Meio</th><th>Valor</th></tr></thead>
              <tbody>
                {draft.receipts.length === 0 ? (
                  <tr><td colSpan={3}>Nenhum lançamento registrado.</td></tr>
                ) : draft.receipts.map((receipt, index) => (
                  <tr key={receipt.id || index}>
                    <td>{dateLabel(receipt.date)}</td>
                    <td>{receipt.method || "Não informado"}</td>
                    <td className="numeric">{money(receipt.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totals.balance > 0 && (
            <>
              <button type="button" className="primary-button rr-receivable-add" disabled={saving} aria-expanded={entryOpen} onClick={() => { setEntryOpen((open) => !open); setError(""); }}>
                {entryOpen ? "Cancelar lançamento" : "+ Adicionar lançamento"}
              </button>
              {entryOpen && <div className="editor-grid rr-receivable-entry-fields">
                <label className="editor-field">
                  Data do lançamento
                  <input type="date" value={entry.date} onChange={(event) => setEntry((previous) => ({ ...previous, date: event.target.value }))} />
                </label>
                <label className="editor-field">
                  Meio de pagamento do lançamento
                  <select value={entry.method} onChange={(event) => setEntry((previous) => ({ ...previous, method: event.target.value }))}>
                    {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </label>
                <label className="editor-field">
                  Valor do lançamento (R$)
                  <input type="number" min="0.01" step="0.01" value={entry.amount} onChange={(event) => setEntry((previous) => ({ ...previous, amount: event.target.value }))} />
                </label>
              </div>}
              {entryOpen && <button type="button" className="secondary-button rr-receivable-confirm" disabled={saving} onClick={addEntry}>
                Confirmar lançamento
              </button>}
            </>
          )}
        </div>
        <div className="editor-actions rr-receivable-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="primary-button rr-receivable-save" disabled={saving}>{saving ? "Salvando…" : "Salvar Conta"}</button>
        </div>
      </form>
    </FormDialog>
  );
}
