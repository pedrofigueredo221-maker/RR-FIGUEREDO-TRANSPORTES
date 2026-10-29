export const pages = [
  { id: "dashboard", label: "Balanço Geral", symbol: "grid" },
  { id: "freights", label: "Fretes", symbol: "truck" },
  { id: "fuelings", label: "Abastecimentos", symbol: "fuel" },
  { id: "expenses", label: "Despesas e manutenção", symbol: "tool" },
  { id: "receivables", label: "Contas a receber", symbol: "arrow-down" },
  { id: "payments", label: "Contas a pagar", symbol: "arrow-up" },
  { id: "reports", label: "Relatórios", symbol: "chart" },
  { id: "cadastros", label: "Cadastros", symbol: "users" },
];

export const titles = Object.fromEntries(
  pages.map((page) => [page.id, page.label]),
);
