import { useState } from "react";
import FormDialog from "./FormDialog.jsx";
import { PAYMENT_METHODS, accountTotals, addMovement } from "../domain/accountLedger.js";
import "../styles/accounts-standard.css";

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
    <FormDialog label={account ? "Editar conta a receber" : "Nova conta a receber"} onClose={onCancel}>
      <form className="record-editor" onSubmit={save}>
        <h3>{account ? "Editar conta a receber" : "Nova conta a receber"}</h3>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <div className="editor-grid">
          <label className="editor-field">
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
        <div className="rr-account-ledger">
          <h4>Resumo financeiro</h4>
          <p>Valor total: {money(Number(draft.value) || 0)}</p>
          <p>Recebido: <strong style={{ color: "#188453" }}>{money(totals.paid)}</strong></p>
          <p>Saldo pendente: <strong style={{ color: "#b63232" }}>{money(totals.balance)}</strong></p>
          {freightLinked && <p>Conta vinculada ao frete: o valor total e a data da viagem são controlados no cadastro do frete.</p>}
          <h4>Lançamentos recebidos</h4>
          {legacyPaid > 0 && <p>Recebimentos anteriores ao histórico detalhado: {money(legacyPaid)}</p>}
          {draft.receipts.length === 0 ? (
            <p>Nenhum lançamento registrado.</p>
          ) : (
            draft.receipts.map((receipt, index) => (
              <p key={receipt.id || index}>
                {dateLabel(receipt.date)} · {receipt.method} · {money(receipt.amount)}
              </p>
            ))
          )}
          {totals.balance > 0 && (
            <>
              <h4>Novo lançamento</h4>
              <div className="editor-grid">
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
              </div>
              <button type="button" className="secondary-button" disabled={saving} onClick={addEntry}>
                Adicionar lançamento
              </button>
            </>
          )}
        </div>
        <label className="editor-field">
          Descrição (Opcional)
          <textarea rows={4} value={draft.description} onChange={(event) => change("description", event.target.value)} />
        </label>
        <div className="editor-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar conta a receber"}</button>
        </div>
      </form>
    </FormDialog>
  );
}
