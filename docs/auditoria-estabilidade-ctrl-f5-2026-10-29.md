# Auditoria de estabilidade — recarga forçada (Ctrl+F5)

Data: 29/10/2026. Revisão estática, sem reproduzir o problema em navegador real.

## Evidências verificadas

- `src/App.jsx`: ao restaurar sessão, `onAuthStateChange` e `getSession()` podem atualizar o mesmo estado em sequência; `loadData()` é disparado quando `session` muda.
- `src/App.jsx`: `loadData()` faz leitura integral de `public.app_state`, normaliza o JSON e atualiza estado de toda a aplicação.
- `src/App.jsx`: um intervalo de 15 segundos e o evento `visibilitychange` podem solicitar nova leitura integral, sem controle explícito de requisições simultâneas.
- `src/app/bootstrap.jsx`: `StrictMode` está ativo; em desenvolvimento pode reexecutar efeitos para identificar problemas, mas isso não prova que seja a causa em produção.
- `src/EditablePage.jsx`: alterações no estado central provocam nova renderização das telas; não foi medida a duração.

## Diagnóstico

A breve pausa no Ctrl+F5 **não foi reproduzida** e não há evidência suficiente para atribuir a causa a um ponto único. A leitura completa do banco durante a inicialização e a ausência de deduplicação das leituras são possíveis fatores de instabilidade. O Ctrl+F5 também ignora cache local, o que naturalmente aumenta o trabalho de rede e carregamento.

## Correções propostas para PR posterior, condicionadas à autorização

1. Deduplicar leituras `loadData()` em andamento, evitando sobreposição do carregamento inicial com o refresh periódico.
2. Impedir que respostas antigas sobrescrevam dados mais novos (sequenciamento de requisições).
3. Evitar atualizar estado quando `version` e conteúdo não mudaram, preservando a atualização periódica e a proteção otimista contra conflitos.
4. Verificar no navegador a duração de download dos assets, tempo de restauração da sessão e tempo da consulta Supabase, com e sem cache.
5. Garantir que nenhum ajuste altere a lógica visual ou de autenticação do Login, nem o Menu Lateral.

## Governança

O fluxo de carregamento está em `src/App.jsx`, arquivo que também implementa a tela de Login congelada. **Nenhuma modificação foi feita nesse arquivo nesta auditoria.** Antes de editar seu código, solicitar autorização explícita e verificar o check de integridade do Login. Nenhum dado de produção foi alterado.
