/**
 * Cartão de indicador dos relatórios.
 * Mantém as classes visuais usadas pelos cartões do Balanço Geral.
 */
export default function StatCard({ label, value, hint, tone = "" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
