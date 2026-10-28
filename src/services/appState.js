/**
 * Normaliza as coleções persistidas sem descartar campos adicionais do JSON.
 * Não modifica o objeto original nem cria dados no Supabase.
 */
export function normalizeAppState(data) {
  return {
    ...data,
    freights: Array.isArray(data.freights) ? data.freights : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    receivables: Array.isArray(data.receivables) ? data.receivables : [],
    employees: Array.isArray(data.employees) ? data.employees : [],
    trucks: Array.isArray(data.trucks) ? data.trucks : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}
