# Plano de arquitetura React — RR-PROJETO-ANTIGO

## Referência recebida
- `main.jsx`: inicialização isolada com React 19 e StrictMode.
- `styles.css`: tokens e estilos globais; **não copiar estilos de Login/Menu Lateral**, pois estão congelados.
- `vite.config.js`: Vite com plugin React; a base `/RR-PROJETO-NOVO/` não é válida neste repositório.
- `package.json`: React, Vite, Supabase e testes Node já presentes.
- `index.html`: ponto de montagem; preservar `#react-root`, favicon, configuração externa do Supabase e redefinição de senha.

## Etapa 1 — Inicialização (esta PR)
- Separar o bootstrap em `src/app/bootstrap.jsx`.
- Manter `src/main.jsx` como entrypoint pequeno.
- Preservar ordem de CSS, StrictMode, ID do root e componente `src/App.jsx`.

## Estrutura-alvo incremental
```
src/
  app/             # bootstrap, composição e providers
  components/      # componentes compartilhados
  domain/          # cálculos e regras de negócio testáveis
  services/        # persistência, autenticação e Supabase
  screens/         # telas e seus componentes
  styles/          # estilos por escopo
  demo/            # dados de demonstração isolados
  main.jsx         # entrada
```

## Próximas PRs independentes
1. Isolar serviços de autenticação e persistência, com testes de leitura e escrita.
2. Dividir `App.jsx` em composição, navegação e estado, sem alterar Login ou Menu Lateral.
3. Refatorar Fretes e cálculos com testes de comissão, pedágio, descontos e bônus.
4. Separar Despesas, Contas, Cadastros, Balanço e Relatórios.
5. Modularizar CSS de telas não congeladas, validando responsividade.

## Critérios de aceite
- Não alterar `main` diretamente, nem realizar merge automático.
- Login e Menu Lateral permanecem visual e funcionalmente intactos.
- Manter Supabase, dados existentes, visitante somente leitura e URL do GitHub Pages.
- Executar `npm test` e `npm run build` no CI antes de aprovar.
- Revisar cada PR e suas diferenças antes de integrar.


## Revisão de redução estrutural — 28/10/2026 (PR #130)

**Critério obrigatório:** manter as funcionalidades, o visual e a ordem de carregamento de CSS; nenhuma alteração direta em `main`.

| Pasta | Diagnóstico | Decisão |
| --- | --- | --- |
| `src/screens` | `ContasAPagar.jsx` apenas encaminhava o mesmo `controller` para `Despesas`. | Importação intermediária removida de `EditablePage`; arquivo legado ainda precisa ser excluído após validação. |
| `src/components` | `StatCard.jsx` tem um único consumidor identificado, `PainelInicial`. | Implementação incorporada ao painel sem modificar JSX; arquivo legado ainda precisa ser excluído. |
| `src/styles` e `src/styles.css` | Regras distribuídas em arquivos globais e por tela. | Não concatenar sem análise da cascata e testes de regressão visual. |
| `imagens` | Logos SVG de login/menu, favicon e PNGs históricos. | Preservar até confirmar referências em HTML, CSS, JS, Vite e scripts; `logo-rr-simbolo.png` aparece em `redefinir-senha.html`. |
| `src/domain` e `tests` | Fórmulas e testes financeiros críticos. | Manter módulos e testes separados. |
| `src/services` e `src/app` | Configuração Supabase, normalização de estado, bootstrap e navegação. | Manter separação funcional; não recombinar módulos com responsabilidades distintas. |
| `banco-de-dados`, `supabase` | Configuração, migrações e rotinas de backup/segurança. | Preservar; exclusão exige auditoria de produção e recuperação de dados. |
| `.github`, `scripts`, `security` | Deploy, validações, proteção de login e auditoria. | Preservar mecanismos de segurança; atualizar testes quando houver reorganização. |
| `docs`, `src/design-system` | Documentação e histórico de auditorias. | Não impactam o bundle de produção; arquivar histórico separadamente em revisão posterior, sem apagar rastreabilidade. |
| Raiz | Entradas HTML, Vite, npm e recuperação de senha. | Preservar contratos de deploy, especialmente a página de redefinição. |

### Verificação antes de remover outros arquivos

1. Confirmar todas as referências estáticas e dinâmicas (inclusive `url(...)`, `import(...)`, `public` e cópias do Vite).
2. Executar `node scripts/check-project.mjs`, `npm test` e `npm run build`.
3. Comparar visualmente login, menu, Balanço Geral, Fretes, Despesas, Contas a Pagar/Receber e Cadastros, inclusive mobile.
4. Confirmar leitura/gravação Supabase, modo visitante, modo demonstração e recuperação de senha.
5. Remover somente os arquivos comprovadamente redundantes, registrando-os na mesma PR.

**Estado:** os dois componentes foram consolidados em seus consumidores, mas as exclusões físicas ainda não ocorreram porque a ferramenta de exclusão foi bloqueada. Esta PR não afirma redução na contagem de arquivos.
