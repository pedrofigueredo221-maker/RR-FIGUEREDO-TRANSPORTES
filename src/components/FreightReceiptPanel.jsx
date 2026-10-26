import { useState } from "react";
import { freightReceivableBalance, applyFreightReceipt } from "../domain/freightReceivables.js";
import { todayISO } from "../lib/formatters.js";

export default function FreightReceiptPanel({ freight, data, number, money, saving, onSave, onCancel }) {
  const balance = freightReceivableBalance(freight, number);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("PIX");
  const [error, setError] = useState("");

  const submit = () => {
    const current = (data.freights || []).find((item) => item.id === freight.id);
    if (!current) { setError("Este frete não foi encontrado. Atualize a tela e tente novamente."); return; }
    const open = freightReceivableBalance(current, number);
    const receivedAmount = Number(amount);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) { setError("Informe um valor recebido maior que zero."); return; }
    if (receivedAmount > open + 0.009) { setError("O valor informado ultrapassa o saldo em aberto. Confira o saldo antes de salvar."); return; }
    if (!date) { setError("Informe a data do recebimento."); return; }

    const receipt = { id: globalThis.crypto?.randomUUID?.() || `receipt-${Date.now()}`, date, amount: Math.round(receivedAmount * 100) / 100, method };
    try {
      const freights = applyFreightReceipt(data.freights || [], current.id, receipt, number);
      onSave({ ...data, freights });
    } catch (saveError) {
      setError(saveError?.message || "Não foi possível vincular o recebimento ao frete.");
    }
  };

  return <section className="record-editor receipt-editor" aria-label="Registrar recebimento do frete">
    <div className="editor-heading"><div><h3>Recebimento do frete</h3><p>{freight.customer || "Cliente"} · saldo em aberto: <strong>{money(balance)}</strong></p></div><button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button></div>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <div className="editor-grid receipt-fields">
      <label className="editor-field">Valor recebido (R$)<input aria-label="Valor recebido em reais" type="number" min="0.01" max={balance.toFixed(2)} step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} required /></label>
      <label className="editor-field">Data do recebimento<input aria-label="Data do recebimento" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <label className="editor-field">Forma de recebimento<select aria-label="Forma de recebimento" value={method} onChange={(event) => setMethod(event.target.value)}><option>PIX</option><option>Dinheiro</option><option>Crédito</option><option>Débito</option><option>TED</option><option>Boleto</option></select></label>
    </div>
    <p className="receipt-sync-note">Ao salvar, o recebimento será vinculado a este frete. Quando o saldo chegar a zero, o status do frete também será atualizado para Pago.</p>
    <div className="editor-actions"><button className="primary-button" type="button" disabled={saving || balance <= 0} onClick={submit}>{saving ? "Salvando…" : balance > 0 && Number(amount) >= balance ? "Confirmar pagamento total" : "Salvar recebimento"}</button></div>
  </section>;
}
