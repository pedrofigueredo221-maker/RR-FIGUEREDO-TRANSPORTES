/**
 * Tabela de consulta para relatórios gerenciais.
 * As colunas podem fornecer um renderizador para valores calculados.
 */
export function DataTable({ columns, rows, emptyLabel = "Nenhum registro encontrado." }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.numeric ? "numeric" : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyLabel}</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id ?? index}>
                {columns.map((column) => (
                  <td key={column.key} className={column.numeric ? "numeric" : undefined}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
