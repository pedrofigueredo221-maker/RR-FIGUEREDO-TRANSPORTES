import "../styles/add-record-button.css";

/** Ação primária de inclusão, reutilizada nas telas internas do ERP. */
export default function AddRecordButton({
  onClick,
  disabled = false,
  title = "Adicionar registro",
}) {
  return (
    <button
      type="button"
      className="rr-add-record-button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <span aria-hidden="true" className="rr-add-record-icon">+</span>
      <span>Adicionar</span>
    </button>
  );
}
