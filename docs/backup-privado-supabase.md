# Backup criptografado do Supabase no próprio projeto R&R

## Arquitetura
- Banco principal: Supabase PostgreSQL (online, leitura e gravação pelo ERP).
- Backup: artefato **criptografado** de cada execução do GitHub Actions no **mesmo repositório** `RR-PROJETO-ANTIGO`.
- Agendamento: a cada 2 horas, no minuto 17 UTC; execuções do GitHub Actions podem atrasar ou falhar.
- Retenção: 30 dias por artefato, sujeita às políticas e limites da conta GitHub.
- Os backups ficam em **Actions → Backup criptografado do Supabase no projeto R&R → execução → Artifacts**, não em arquivos versionados na `main`.
- GitHub não é um banco PostgreSQL ativo nem uma cópia local no computador. Os backups são arquivos restauráveis.

## Preparação obrigatória
1. **Torne o repositório privado antes de habilitar o workflow.** Atenção: confira se a publicação do site via GitHub Pages continuará disponível e adequada ao plano GitHub após a mudança de visibilidade. Uma aplicação estática publicada na internet não se torna privada só porque o código está privado.
2. Em **Settings → Secrets and variables → Actions**, crie:
   - `SUPABASE_DB_URL`: URL de conexão PostgreSQL com permissão suficiente para `pg_dump` e SSL habilitado.
   - `BACKUP_ENCRYPTION_PASSPHRASE`: senha exclusiva, forte, guardada também fora do GitHub.
3. Aprove a PR. Depois execute **Actions → Backup criptografado do Supabase no projeto R&R → Run workflow**.
4. Confirme que foi produzido um artefato `supabase-backup-<run_id>` e realize uma restauração de teste.

## Teste de restauração (não usar banco de produção)
Baixe o artefato criptografado de uma execução do Actions e, em um ambiente seguro com GPG e PostgreSQL:
```bash
gpg --batch --pinentry-mode loopback --decrypt supabase.dump.gpg > supabase.dump
pg_restore --list supabase.dump
# Restaurar em um banco de testes isolado para confirmar integridade.
```
Não compartilhe segredos nem dumps descriptografados no chat, PRs ou logs. O dump não necessariamente inclui configurações externas ao PostgreSQL, como chaves e arquivos do Supabase Storage.

## Governança
O workflow não faz commit nem push na `main` ou em qualquer outra branch; usa artefatos do próprio repositório, respeitando a exigência de alterações de código somente por PR. O acesso aos backups deve ser restrito. Para redundância real contra perda da conta GitHub, mantenha outra cópia em armazenamento independente.
