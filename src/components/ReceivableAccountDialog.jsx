import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FormDialog from "./FormDialog.jsx";
import { PAYMENT_METHODS, accountTotals, addMovement, cents } from "../domain/accountLedger.js";
import { createCreditPlan, creditPlanTotals, validateCreditPlan, installmentPaid, isCredit, withDueCreditReceipts } from "../domain/creditInstallments.js";
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
  const [draft, setDraft] = useState(() => withDueCreditReceipts({
    ...emptyAccount(),
    ...account,
    value: account ? String(account.value) : "",
    title: account?.title || account?.receivableTitle || account?.description || account?.customer || "",
    description: account?.description || account?.receivableNotes || "",
    due: account?.receivableDue || account?.due || account?.date || today(),
    created: account?.created || account?.date || today(),
    paymentMethod: account?.paymentMethod || account?.receivablePaymentMethod || "PIX",
    receipts: [...(account?.receipts || [])],
    creditInstallments: [...(account?.creditInstallments || account?.receivableCreditInstallments || [])],
    installmentPrincipal: account?.installmentPrincipal ?? account?.receivableInstallmentPrincipal ?? null,
  }));
  const [entry, setEntry] = useState({ date: today(), method: "PIX", amount: "" });
  const [error, setError] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(() => account?.creditInstallments?.length || account?.receivableCreditInstallments?.length || 1);
  const [adjustFutureInstallments, setAdjustFutureInstallments] = useState(false);
  const [recalculateInstallments, setRecalculateInstallments] = useState(false);
  const existingPaid = freightLinked ? Math.round(Number(account?.received || 0) * 100) / 100 : 0;
  const receiptSum = draft.receipts.reduce((sum, receipt) => sum + Math.round(Number(receipt.amount || 0) * 100), 0) / 100;
  const legacyPaid = freightLinked ? Math.max(0, Math.round((existingPaid - (account?.receipts || []).reduce((sum, receipt) => sum + Math.round(Number(receipt.amount || 0) * 100), 0) / 100) * 100) / 100) : 0;
  const paid = Math.round((legacyPaid + receiptSum) * 100) / 100;
  const hasCreditPlan = isCredit(draft.paymentMethod) && draft.creditInstallments.length > 1;
  const outstandingPrincipal = Math.max(0, (cents(draft.value || 0) - cents(paid)) / 100);
  const planPrincipal = draft.installmentPrincipal == null ? outstandingPrincipal : Number(draft.installmentPrincipal);
  const planTotals = hasCreditPlan ? creditPlanTotals(planPrincipal, draft.creditInstallments) : { planned: 0, interest: 0, interestPercent: 0 };
  const effectiveTotal = (cents(draft.value || 0) + cents(planTotals.interest)) / 100;
  const totals = freightLinked
    ? { paid, balance: Math.max(0, (cents(effectiveTotal) - cents(paid)) / 100) }
    : accountTotals(effectiveTotal, draft.receipts);
  const setCreditCount = (count) => {
    setError("");
    if (count === 1) {
      if (draft.creditInstallments.some((item) => installmentPaid(item, draft.receipts))) {
        setError("Não é possível remover parcelas que já foram recebidas.");
        return;
      }
      setInstallmentCount(1);
      setAdjustFutureInstallments(false);
      setDraft((previous) => ({ ...previous, creditInstallments: [], installmentPrincipal: null }));
      return;
    }
    if (draft.creditInstallments.some((item) => installmentPaid(item, draft.receipts))) {
      setError("Não é possível alterar a quantidade após receber uma parcela.");
      return;
    }
    try {
      const principal = outstandingPrincipal;
      const items = createCreditPlan(principal, count, draft.due);
      setInstallmentCount(count);
      setAdjustFutureInstallments(false);
      setDraft((previous) => ({ ...previous, creditInstallments: items, installmentPrincipal: principal }));
    } catch (cause) {
      setError(cause.message);
    }
  };
  const updateInstallment = (id, field, value) => {
    setRecalculateInstallments(false);
    setDraft((previous) => {
      const first = previous.creditInstallments[0];
      const propagate = adjustFutureInstallments && field === "amount" && first?.id === id;
      return {
        ...previous,
        creditInstallments: previous.creditInstallments.map((item, index) => {
          if (installmentPaid(item, previous.receipts)) return item;
          if (item.id === id || (propagate && index > 0)) return { ...item, [field]: value };
          return item;
        }),
      };
    });
    setError("");
  };
  const toggleRecalculateInstallments = (checked) => {
    if (!checked) { setRecalculateInstallments(false); return; }
    if (draft.creditInstallments.some((item) => installmentPaid(item, draft.receipts))) {
      setError("Não é possível recalcular parcelas que já possuem recebimentos.");
      return;
    }
    try {
      const amounts = createCreditPlan(planPrincipal, draft.creditInstallments.length, draft.creditInstallments[0]?.due || draft.due);
      setDraft((previous) => ({ ...previous, creditInstallments: previous.creditInstallments.map((item, index) => ({ ...item, amount: amounts[index].amount })) }));
      setAdjustFutureInstallments(false);
      setRecalculateInstallments(true);
      setError("");
    } catch (cause) { setError(cause.message); }
  };
  const toggleAdjustFutureInstallments = (checked) => {
    if (checked && draft.creditInstallments[0] && !installmentPaid(draft.creditInstallments[0], draft.receipts)) {
      const firstAmount = draft.creditInstallments[0].amount;
      setDraft((previous) => ({
        ...previous,
        creditInstallments: previous.creditInstallments.map((item, index) =>
          index > 0 && !installmentPaid(item, previous.receipts) ? { ...item, amount: firstAmount } : item
        ),
      }));
    }
    setAdjustFutureInstallments(checked);
    setError("");
  };
  const change = (field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setError("");
  };

  const changeEntryMethod = (method) => {
    setEntry((previous) => ({ ...previous, method }));
    if (!isCredit(method)) return;
    if (outstandingPrincipal <= 0) {
      setError("Não há saldo pendente para parcelar no cartão.");
      return;
    }
    try {
      const count = draft.creditInstallments.length > 1 ? draft.creditInstallments.length : 2;
      const installments = createCreditPlan(outstandingPrincipal, count, entry.date || draft.due);
      setDraft((previous) => ({
        ...previous,
        paymentMethod: method,
        creditInstallments: installments,
        installmentPrincipal: outstandingPrincipal,
      }));
      setInstallmentCount(count);
      setAdjustFutureInstallments(false);
      setEntryOpen(false);
      setError("");
    } catch (cause) {
      setError(cause.message);
    }
  };
  const addEntry = () => {
    try {
      if (hasCreditPlan) throw new Error("Parcelas de crédito são recebidas automaticamente no vencimento.");
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
    if (hasCreditPlan) {
      try {
        validateCreditPlan(planPrincipal, draft.creditInstallments);
      } catch (cause) {
        setError(cause.message);
        return;
      }
      if (freightLinked && planTotals.interest > 0) {
        setError("Juros em conta vinculada ao frete exigem ajuste do valor no cadastro do frete.");
        return;
      }
    }
    if (totals.paid > effectiveTotal) {
      setError("O valor total não pode ser inferior aos lançamentos já recebidos.");
      return;
    }
    try {
      await onSave({
        ...draft,
        value,
        received: totals.paid,
        receipts: draft.receipts,
        interest: planTotals.interest,
        creditInstallments: hasCreditPlan ? draft.creditInstallments : [],
        installmentPrincipal: hasCreditPlan ? planPrincipal : null,
      });
    } catch (cause) {
      setError(cause.message || "Não foi possível salvar a conta.");
    }
  };

  const dialogFormRef = useRef(null);
  const sidebarRef = useRef(null);
  const [sidebarAvailable, setSidebarAvailable] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1500);
  useLayoutEffect(() => {
    const form = dialogFormRef.current;
    const panel = sidebarRef.current;
    if (!form || !panel || !sidebarAvailable) return undefined;
    const dialog = form.closest(".form-dialog");
    if (!dialog) return undefined;
    const position = () => {
      const rect = dialog.getBoundingClientRect();
      panel.style.top = `${Math.max(8, rect.top)}px`;
      panel.style.left = `${rect.right}px`;
      panel.style.width = `${Math.min(360, Math.max(0, window.innerWidth - rect.right - 12))}px`;
      panel.style.maxHeight = `${Math.max(180, window.innerHeight - Math.max(8, rect.top) - 12)}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(dialog);
    window.addEventListener("resize", position);
    return () => { observer.disconnect(); window.removeEventListener("resize", position); };
  }, [sidebarAvailable]);
  useLayoutEffect(() => {
    const onResize = () => setSidebarAvailable(window.innerWidth >= 1500);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const financialSidebar = (        <div className="rr-account-ledger rr-receivable-ledger">
          <h4>RESUMO FINANCEIRO</h4>
          <div className={`rr-receivable-summary${freightLinked ? " rr-receivable-summary-freight" : ""}`}>
            <div className="rr-receivable-metric"><span>Valor total</span><strong>{money(Number(draft.value) || 0)}</strong></div>
            <div className="rr-receivable-metric"><span>Recebido</span><strong className="rr-receivable-paid">{money(totals.paid)}</strong></div>
            <div className="rr-receivable-metric"><span>Saldo pendente</span><strong className="rr-receivable-balance">{money(totals.balance)}</strong></div>
            {freightLinked && <p className="rr-receivable-linked-note">Conta vinculada ao frete: o valor total e a data da viagem são controlados no cadastro do frete.</p>}
          </div>
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
        </div>);
  return (
    <FormDialog label="Conta a Receber" onClose={onCancel}>
      <form ref={dialogFormRef} className="record-editor rr-receivable-dialog" onSubmit={save}>
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
            <select value={draft.paymentMethod} onChange={(event) => {
                const method = event.target.value;
                if (!isCredit(method) && draft.creditInstallments.some((item) => installmentPaid(item, draft.receipts))) {
                  setError("Não é possível remover um parcelamento com parcelas recebidas.");
                  return;
                }
                setInstallmentCount(isCredit(method) ? (draft.creditInstallments.length || 1) : 1);
                setAdjustFutureInstallments(false);
                setDraft((previous) => ({ ...previous, paymentMethod: method, creditInstallments: isCredit(method) ? previous.creditInstallments : [], installmentPrincipal: isCredit(method) ? previous.installmentPrincipal : null }));
                setError("");
              }}>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
        </div>
        {isCredit(draft.paymentMethod) && <section className="rr-credit-plan">
          <div className="rr-credit-plan-heading"><h4>PARCELAMENTO NO CRÉDITO</h4>
          <label className="editor-field rr-credit-count">
            <span>Quantidade de<br/>parcelas</span>
            <select value={installmentCount} onChange={(event) => setCreditCount(Number(event.target.value))}>
              {Array.from({ length: 18 }, (_, index) => index + 1).map((count) =>
                <option key={count} value={count}>{count}x</option>
              )}
            </select>
          </label>
          {hasCreditPlan && <div className="rr-credit-table-actions">
            <label className="rr-credit-adjust-future"><input type="checkbox" checked={adjustFutureInstallments} disabled={installmentPaid(draft.creditInstallments[0], draft.receipts)} onChange={(event) => toggleAdjustFutureInstallments(event.target.checked)} /><span>Ajustar<br/>Parcelas</span></label>
            <label className="rr-credit-adjust-future"><input type="checkbox" checked={recalculateInstallments} disabled={draft.creditInstallments.some((item) => installmentPaid(item, draft.receipts))} onChange={(event) => toggleRecalculateInstallments(event.target.checked)} /><span>Recalcular<br/>Parcelas</span></label>
          </div>}
          </div>
          {installmentCount === 1 && <p>Pagamento em 1x: utilize o lançamento normal de data e valor.</p>}
          {hasCreditPlan && <div className="rr-credit-layout">
            <div className="rr-credit-table-side">
            <div className="rr-credit-list-heading"><span>PARCELA</span><span>VENCIMENTO</span><span>VALOR</span></div>
            <div className="rr-credit-rows">
              {draft.creditInstallments.map((item, index) => {
                const received = installmentPaid(item, draft.receipts);
                return <div className="rr-credit-row" key={item.id}>
                  <strong className="rr-credit-index">{String(index + 1).padStart(2, "0")} / {String(draft.creditInstallments.length).padStart(2, "0")}</strong>
                  <label className="editor-field" aria-label={`Vencimento da parcela ${index + 1}`}>
                    <input aria-label={`Vencimento da parcela ${index + 1}`} type="date" value={item.due} disabled={received} onChange={(event) => updateInstallment(item.id, "due", event.target.value)} />
                  </label>
                  <div className="rr-credit-amount-cell"><label className="editor-field" aria-label={`Valor da parcela ${index + 1}`}>
                    <input aria-label={`Valor da parcela ${index + 1}`} type="number" min="0.01" step="0.01" value={item.amount} disabled={received} onChange={(event) => updateInstallment(item.id, "amount", event.target.value)} />
                  </label>
                  </div>
                </div>;
              })}
            </div>
            </div>
            <div className="rr-credit-totals">
              <span>VALOR ORIGINAL <strong>{money(planPrincipal)}</strong></span>
              <span>TOTAL PARCELADO <strong>{money(planTotals.planned)}</strong></span>
              <span className={planTotals.interest > 0 ? "rr-credit-interest" : ""}>JUROS <strong>{money(planTotals.interest)} ({planTotals.interestPercent.toFixed(2).replace(".", ",")}%)</strong></span>
            </div>
            {freightLinked && planTotals.interest > 0 && <p className="error-banner">Em fretes vinculados, registre primeiro o acréscimo no valor do frete para permitir o recebimento com juros.</p>}
          </div>}
        </section>}
        {!sidebarAvailable && financialSidebar}
        <div className="rr-receivable-entry-section">
          <>
              {!hasCreditPlan && <button type="button" className="primary-button rr-receivable-add" disabled={saving} aria-expanded={entryOpen} onClick={() => { setEntryOpen((open) => !open); setError(""); }}>
                {entryOpen ? "Cancelar lançamento" : "+ Adicionar lançamento"}
              </button>}
              {!hasCreditPlan && entryOpen && <div className="editor-grid rr-receivable-entry-fields">
                <label className="editor-field">
                  Data do lançamento
                  <input type="date" value={entry.date} onChange={(event) => setEntry((previous) => ({ ...previous, date: event.target.value }))} />
                </label>
                <label className="editor-field">
                  Meio de pagamento do lançamento
                  <select value={entry.method} onChange={(event) => changeEntryMethod(event.target.value)}>
                    {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </label>
                <label className="editor-field">
                  Valor do lançamento (R$)
                  <input type="number" min="0.01" step="0.01" value={entry.amount} onChange={(event) => setEntry((previous) => ({ ...previous, amount: event.target.value }))} />
                </label>
              </div>}

          </>

        </div>
        <div className="editor-actions rr-receivable-actions">
          <button type="button" className="secondary-button rr-receivable-cancel" onClick={onCancel}>CANCELAR</button>
          {!hasCreditPlan && entryOpen && <button type="button" className="secondary-button rr-receivable-confirm" disabled={saving} onClick={addEntry}>CONFIRMAR LANÇAMENTO</button>}
          <button type="submit" className="primary-button rr-receivable-save" disabled={saving}>{saving ? "SALVANDO…" : "SALVAR CONTA"}</button>
        </div>
      </form>
      {sidebarAvailable && createPortal(<aside ref={sidebarRef} className="rr-receivable-detached-panel" aria-label="Resumo financeiro e lançamentos recebidos">{financialSidebar}</aside>, document.body)}
    </FormDialog>
  );
}
