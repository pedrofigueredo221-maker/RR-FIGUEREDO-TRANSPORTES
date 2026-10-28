import { createClient } from "@supabase/supabase-js";

/**
 * Configuração da aplicação obtida do script externo carregado pelo index.html.
 * Mantém o contrato histórico de window.APP_CONFIG e o modo demonstração.
 */
export const config = window.APP_CONFIG || {};
export const demoMode =
  new URLSearchParams(window.location.search).get("demo") === "1";

/**
 * Cliente compartilhado entre os módulos. A aplicação de demonstração não
 * estabelece conexão com o banco de produção.
 */
export const supabase =
  !demoMode && config.SUPABASE_URL && config.SUPABASE_ANON_KEY
    ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
