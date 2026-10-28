/**
 * Cálculos puros de fretes.
 *
 * Contrato de compatibilidade:
 * - Campos e assinaturas exportadas permanecem inalterados.
 * - Comissão percentual incide sobre o frete menos descontos gerais;
 *   pedágio só reduz a base quando deductToll está marcado.
 * - Comissão fixa substitui o percentual.
 * - Bônus é somado ao pagamento do motorista, nunca à base da comissão.
 * - Pedágio, combustível real e outros custos continuam sendo da empresa.
 *
 * A ordem das operações foi mantida para preservar os resultados históricos.
 */
const valueOf = (freight, field) => Number(freight[field] || 0);

/** Valor que serve de base à comissão percentual. */
export function freightBase(freight = {}) {
  const tollDeduction = freight.deductToll ? valueOf(freight, "toll") : 0;

  return Math.max(
    0,
    valueOf(freight, "value") - valueOf(freight, "discount") - tollDeduction
  );
}

/** Comissão do motorista, percentual ou fixa. */
export function freightCommission(freight = {}) {
  const base = freightBase(freight);

  return freight.commissionType === "fixed"
    ? valueOf(freight, "commission")
    : base * valueOf(freight, "commission") / 100;
}

/** Bônus não altera a base da comissão. */
export function freightBonus(freight = {}) {
  return valueOf(freight, "bonus");
}

/** Custo operacional que pertence à empresa, sem comissão e bônus. */
export function freightOperatingCosts(freight = {}) {
  return valueOf(freight, "toll")
    + valueOf(freight, "fuelActual")
    + valueOf(freight, "otherCosts");
}

/** Total que cabe ao motorista, sem salários. */
export function freightDriverPayment(freight = {}) {
  return freightCommission(freight) + freightBonus(freight);
}

/** Custo total do frete, incluindo motorista e operação. */
export function freightCost(freight = {}) {
  return freightCommission(freight)
    + freightBonus(freight)
    + valueOf(freight, "toll")
    + valueOf(freight, "fuelActual")
    + valueOf(freight, "otherCosts");
}

/** Resultado estimado da empresa após descontos e custos. */
export function freightProfit(freight = {}) {
  return valueOf(freight, "value")
    - valueOf(freight, "discount")
    - valueOf(freight, "toll")
    - valueOf(freight, "fuelActual")
    - freightCommission(freight)
    - freightBonus(freight)
    - valueOf(freight, "otherCosts");
}

/**
 * Cálculo líquido histórico.
 * Não substituir por lucro ou saldo a receber: possui semântica própria.
 */
export function freightNet(freight = {}) {
  const tollDeduction = freight.deductToll ? valueOf(freight, "toll") : 0;

  return valueOf(freight, "value")
    - valueOf(freight, "discount")
    - freightCommission(freight)
    - tollDeduction
    + freightBonus(freight);
}
