import "../styles/employee-modal-unified.css";

function EmployeeField({ field, value, onChange }) {
  return (
    <label className={`editor-field ${field.type === "checkbox" ? "employee-checkbox-field" : ""}`}>
      <span>{field.label}</span>
      {field.options ? (
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        >
          {field.options.map((option) =>
            typeof option === "string" ? (
              <option key={option} value={option}>{option}</option>
            ) : (
              <option key={option.value} value={option.value}>{option.label}</option>
            ),
          )}
        </select>
      ) : field.type === "checkbox" ? (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      ) : (
        <input
          type={field.type || "text"}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          min={field.min}
          step={field.step}
          placeholder={field.placeholder}
        />
      )}
    </label>
  );
}

export default function FormularioFuncionario({
  title,
  fields,
  value,
  setValue,
  onSubmit,
  onCancel,
  saving,
}) {
  const patch = (key, next) => setValue((current) => ({ ...current, [key]: next }));

  return (
    <section className="employee-modal" aria-labelledby="employee-form-title">
      <header className="employee-modal-header">
        <div>
          <p className="eyebrow">CADASTROS DA EMPRESA</p>
          <h2 id="employee-form-title">{title}</h2>
          <p>Preencha os dados do funcionário e confira as informações antes de salvar.</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={onCancel}
          aria-label="Fechar cadastro"
        >
          ✕
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="editor-grid employee-form-grid">
          {fields.map((field) => (
            <EmployeeField
              key={field.key}
              field={field}
              value={value[field.key]}
              onChange={(next) => patch(field.key, next)}
            />
          ))}
        </div>
        <footer className="employee-modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar funcionário"}
          </button>
        </footer>
      </form>
    </section>
  );
}
