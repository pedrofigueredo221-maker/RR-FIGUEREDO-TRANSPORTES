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
