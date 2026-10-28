import "../styles/period-range-filter.css";

/** Filtro de intervalo diário reutilizado nas telas internas. */
export default function PeriodRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div className="rr-period-range">
      <div className="rr-period-range-fields">
        <label>
          INÍCIO DO PERÍODO
          <input
            aria-label="Início do período"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </label>
        <label>
          FINAL DO PERÍODO
          <input
            aria-label="Final do período"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </label>
      </div>
      {startDate && endDate && startDate > endDate && (
        <span className="rr-period-range-error" role="alert">
          Data final anterior à inicial.
        </span>
      )}
    </div>
  );
}
