# Refatoração progressiva no repositório original

**Repositório de trabalho definitivo:** `RR-PROJETO-ANTIGO`.

## Regras inegociáveis
- Preservar todos os campos, cálculos, cadastros, dados, pagamentos, relatórios e fluxos atuais.
- Preservar esquema Supabase, IDs, registros reais e histórico de pagamentos.
- Nunca alterar `main` diretamente; sempre branch e PR detalhada, sem merge automático.
- Login e Menu Lateral permanecem congelados; autorização específica antes de alterar código, CSS ou dependências com impacto nessas telas.
- Cada refatoração deve incluir testes de equivalência e comprovação de build antes da aprovação.

## Ordem proposta
1. **Domínio financeiro:** separar fórmulas puras, manter exports, contratos e resultados existentes.
2. **Persistência:** extrair acesso Supabase, tratamento de erros, sincronização e controle de versão; preservar dados reais.
3. **Componentes compartilhados:** modais, tabelas, formulários, filtros e botões reutilizáveis.
4. **Fretes:** decompor tela, formulário, cálculos, histórico e recebimentos sem mudar comportamento.
5. **Contas a Pagar e Receber:** separar operações, extrato, parcelas e pagamentos.
6. **Despesas e Manutenção:** decompor edição, categorias, parcelas e vínculos.
7. **Cadastros, Balanço e Relatórios:** isolar regras, seletores, consultas e visualização.
8. **CSS interno:** remover duplicidade somente após verificar equivalência visual; sem tocar nas telas protegidas.
9. **Validação integral:** `npm test`, `npm run build`, navegação, mobile, RLS e comparação com dados anonimizados.

## Primeira PR
Refatoração interna de `src/domain/freightCalculations.js`:
- mantidas as oito funções exportadas e as assinaturas;
- mantidas as fórmulas e ordem das operações, inclusive a semântica histórica de `freightNet`;
- extraído utilitário privado `valueOf` para reduzir repetições;
- adicionados comentários sobre regras de comissão, bônus, pedágio e custos.

**Importante:** nenhuma tela foi alterada. O restante do projeto ainda precisa ser reescrito em PRs sucessivas. Build e testes automatizados devem ser verificados antes do merge.
