export default function AccountActions({ onEdit, onPayment, onDelete, paymentLabel = "Registrar movimentação", disabled = false }) {
  return <div className="record-actions rr-account-actions">
    <button className="secondary-button" type="button" title="Editar lançamento" aria-label="Editar lançamento" disabled={disabled} onClick={onEdit}>✎</button>
    <button className="secondary-button" type="button" title={paymentLabel} aria-label={paymentLabel} disabled={disabled || !onPayment} onClick={onPayment}>▣</button>
    {onDelete && <button className="danger-button" type="button" title="Excluir lançamento" aria-label="Excluir lançamento" disabled={disabled} onClick={onDelete}>▤</button>}
  </div>;
}
