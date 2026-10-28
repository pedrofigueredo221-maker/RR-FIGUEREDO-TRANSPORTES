import "../styles/route-display.css";

/** Padrão visual único para origem e destino em qualquer tela interna. */
export default function RouteDisplay({ origin, destination, className = "" }) {
  const from = String(origin ?? "").trim();
  const to = String(destination ?? "").trim();

  return (
    <span className={["rr-route", className].filter(Boolean).join(" ")}>
      {from && <span className="rr-route-place">{from}</span>}
      {from && to && (
        <span className="rr-route-arrow" aria-label="para">→</span>
      )}
      {to && <span className="rr-route-place">{to}</span>}
      {!from && !to && "—"}
    </span>
  );
}
