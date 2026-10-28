/**
 * Pesquisa local reutilizável: ignora acentos, caixa e espaços repetidos.
 * Todas as palavras devem aparecer no mesmo registro, em qualquer campo.
 * Somente leitura: não altera dados nem consultas ao Supabase.
 */
export const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();

export function matchesRecordSearch(record, query, fields, extraValues = []) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (!words.length) return true;

  const searchable = normalizeSearch(
    [...fields.map((field) => record[field]), ...extraValues].join(" "),
  );

  return words.every((word) => searchable.includes(word));
}
