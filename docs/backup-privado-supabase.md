# Backup privado do Supabase — R&R Figueredo Transportes

## Arquitetura
- Produção: Supabase PostgreSQL. Continua sendo a única origem de gravação do ERP.
- Cópia: repositório **privado** `pedrofigueredo221-maker/RR-FIGUEREDO-BACKUP`, branch `automated-backups`, snapshots `*.dump.gpg` criptografados.
- Frequência: a cada 6 horas (GitHub Actions pode atrasar execuções). Mantém até 30 snapshots na branch; histórico Git ainda pode conter versões antigas.
- Não é um segundo banco PostgreSQL ativo, nem substitui um backup externo independente do GitHub.

## Configuração manual obrigatória
1. Crie o repositório **privado** `RR-FIGUEREDO-BACKUP` no GitHub (não adicione dados reais ao repositório público).
2. Em **RR-PROJETO-ANTIGO → Settings → Secrets and variables → Actions**, configure:
   - `SUPABASE_DB_URL`: conexão PostgreSQL do Supabase, com usuário de leitura suficiente para dump e SSL habilitado. **Nunca publicar a URL ou senha no chat/PR.**
   - `BACKUP_REPO_TOKEN`: token de acesso com permissão de escrita **somente** no repositório privado de backup.
   - `BACKUP_ENCRYPTION_PASSPHRASE`: senha forte e exclusiva para criptografar os snapshots; guarde fora do GitHub também.
3. Aprove a PR, confira os checks e execute manualmente `Backup criptografado do Supabase para repositório privado` em **Actions → Run workflow**.
4. Confirme que a branch `automated-backups` contém `snapshots/*.dump.gpg`. O backup só está operacional após um teste de restauração.

## Restauração de teste (fora da produção)
```bash
gpg --batch --pinentry-mode loopback --decrypt snapshots/ARQUIVO.dump.gpg > supabase.dump
pg_restore --list supabase.dump
# Restaurar somente em banco PostgreSQL descartável de teste, nunca diretamente na produção.
```
A restauração completa deve ser testada periodicamente e pode exigir ajustes de extensões, papéis, autenticação e versão PostgreSQL.

## Proteções
O workflow só lê o Supabase e não executa gravações nele. O destino é a branch `automated-backups` do repositório privado, **nunca a main**. Não mexe no Login, Menu Lateral ou nos formulários. Se um segredo estiver ausente, o job falha sem publicar backup. Não expor backups em logs ou artifacts.
