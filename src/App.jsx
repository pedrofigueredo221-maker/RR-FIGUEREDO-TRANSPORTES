import { useCallback, useEffect, useState } from "react";
import { config, demoMode, supabase } from "./services/supabaseRuntime.js";
import { normalizeAppState } from "./services/appState.js";
import PainelInicial from "./screens/PainelInicial.jsx";
import EditablePage from "./EditablePage.jsx";
import Relatorios from "./screens/Relatorios.jsx";
import { DEMO_DATA, DEMO_STORAGE_KEY } from "./demo/demoData.js";
import { pages, titles } from "./app/navigation.js";

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  truck: <><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  tool: <><path d="M14 6a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 3 3l5-5a5 5 0 0 0 6-6l-3 3-3-3z" /></>,
  "arrow-down": <><path d="M4 5h16M4 11h16M4 17h10M17 14v7m-3-3 3 3 3-3" /></>,
  "arrow-up": <><path d="M4 5h16M4 11h16M4 17h10M17 21v-7m-3 3 3-3 3 3" /></>,
  chart: <><path d="M4 20V4M4 20h16M8 16v-5M13 16V7M18 16V4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" /></>
};
function MenuIcon({ name }) {
  return <span className="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{iconPaths[name]}</svg></span>;
}
const screenComponents = {
  dashboard: PainelInicial,
  freights: EditablePage,
  expenses: EditablePage,
  receivables: EditablePage,
  payments: EditablePage,
  reports: Relatorios,
  cadastros: EditablePage
};

function Login({ onLogin, onReset, busy, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  return <main className="login-page"><form className="login-card" onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }}>
    <img className="login-logo" src="./imagens/logo-oficial-rr.svg" alt="R&R Figueredo Transportes" />
    <h1>TELA DE LOGIN</h1>
    <label htmlFor="login-username">Usuário</label><input id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Digite seu usuário" required />
    <label htmlFor="login-password">Senha</label><input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Digite sua senha" required />
    {error && <p className="error-message" role="alert">{error}</p>}
    <button className="primary-button login-submit" type="submit" disabled={busy || (!supabase && !demoMode)}>{busy ? "Entrando…" : "Entrar"}</button>
    <button className="secondary-button login-submit" type="button" disabled={busy || resetBusy || !supabase} onClick={async () => {
      setResetMessage("");
      setResetBusy(true);
      try {
        await onReset(username);
        setResetMessage("Se a solicitação for aceita, você receberá um e-mail. Confira também a pasta de spam.");
      } catch (resetError) {
        setResetMessage(resetError?.message || "Não foi possível solicitar a recuperação de senha.");
      } finally { setResetBusy(false); }
    }}>{resetBusy ? "Solicitando…" : "Esqueci minha senha"}</button>
    {resetMessage && <p className="reset-message" role="status">{resetMessage}</p>}
    {!supabase && !demoMode && <p className="error-message">Configuração do Supabase não encontrada. Confira banco-de-dados/supabase/app-config.js.</p>}
    <small className="muted login-note">Acesso protegido pelo Supabase.</small>
  </form></main>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState({ freights: [], expenses: [], receivables: [], employees: [], trucks: [], categories: [] });
  const [version, setVersion] = useState(0);
  const [dataError, setDataError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [recordNavigation, setRecordNavigation] = useState(null);
  const openRecord = (page, recordId) => {
    if (!recordId || !["freights", "expenses"].includes(page)) return;
    setRecordNavigation({ page, recordId, requestId: Date.now() });
    setActivePage(page);
  };
  const [menuOpen, setMenuOpen] = useState(false);

  const email = session?.user?.email?.trim().toLowerCase() || "";
  const visitor = String(config.USER_EMAILS?.VISITANTES || config.USER_EMAILS?.VISITANTE || "").trim().toLowerCase();
  const readOnly = Boolean(visitor && email === visitor);

  useEffect(() => {
    if (demoMode) { setSession({ user: { email: "demo@local.test" } }); setAuthReady(true); return undefined; }
    if (!supabase) { setAuthReady(true); return undefined; }
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setAuthReady(true); }
    });
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active) return;
      if (error) setAuthError("Não foi possível restaurar a sessão. Entre novamente.");
      setSession(result?.session || null); setAuthReady(true);
    }).catch(() => { if (active) { setAuthError("Não foi possível verificar a sessão do Supabase."); setAuthReady(true); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const loadData = useCallback(async () => {
    if ((!supabase && !demoMode) || !session) return;
    setLoadingData(true); setDataError("");
    try {
      if (demoMode) {
        const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
        const demoData = saved ? JSON.parse(saved) : DEMO_DATA;
        setData({ ...DEMO_DATA, ...demoData });
        setVersion(Number(window.localStorage.getItem(`${DEMO_STORAGE_KEY}:version`)) || 0);
        return;
      }
      const { data: row, error } = await supabase.from("app_state").select("data,version").eq("id", 1).maybeSingle();
      if (error) throw error;
      if (!row || !row.data || typeof row.data !== "object") throw new Error("O registro public.app_state (id=1) não foi encontrado ou não está visível pelas políticas RLS. Nenhum dado foi criado ou sobrescrito.");
      setVersion(Number(row.version) || 0);
      setData(normalizeAppState(row.data));
    } catch (error) { setDataError(error?.message || "Não foi possível carregar os dados do Supabase."); }
    finally { setLoadingData(false); }
  }, [session, demoMode]);

  useEffect(() => { if (session) loadData(); else { setDataError(""); setVersion(0); setData({ freights: [], expenses: [], receivables: [], employees: [], trucks: [], categories: [] }); } }, [session, loadData]);

  useEffect(() => {
    if (!session || demoMode) return undefined;
    const refresh = () => { if (!document.hidden) loadData(); };
    const interval = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [session, loadData, demoMode]);

  // Escrita otimista por versão: se outro computador salvar primeiro, recusamos
  // a gravação local e recarregamos os dados em vez de sobrescrever silenciosamente.
  const saveData = useCallback(async (nextData, formVersion = version) => {
    if (readOnly) throw new Error("Perfil visitante: alterações não são permitidas.");
    if (!session) throw new Error("Sua sessão expirou. Entre novamente antes de salvar.");
    const next = {
      ...data,
      ...nextData,
      freights: Array.isArray(nextData.freights) ? nextData.freights : [],
      expenses: Array.isArray(nextData.expenses) ? nextData.expenses : [],
      receivables: Array.isArray(nextData.receivables) ? nextData.receivables : [],
      employees: Array.isArray(nextData.employees) ? nextData.employees : [],
      trucks: Array.isArray(nextData.trucks) ? nextData.trucks : [],
      categories: Array.isArray(nextData.categories) ? nextData.categories : []
    };
    if (formVersion !== version) {
      await loadData();
      throw new Error("Os dados mudaram em outro computador. Atualizei a consulta e fechei o formulário para evitar sobrescrever alterações; abra o registro novamente e confira os valores.");
    }
    const expectedVersion = version;
    if (demoMode) {
      const nextVersion = expectedVersion + 1;
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(`${DEMO_STORAGE_KEY}:version`, String(nextVersion));
      setData(next); setVersion(nextVersion); setDataError("");
      return;
    }
    if (!supabase) throw new Error("Configuração do Supabase não encontrada.");
    const { data: updated, error } = await supabase.from("app_state")
      .update({ data: next, version: expectedVersion + 1 })
      .eq("id", 1)
      .eq("version", expectedVersion)
      .select("version");
    if (error) throw new Error("O Supabase recusou a gravação. Nenhuma alteração foi confirmada: " + error.message);
    if (!updated || updated.length === 0) {
      await loadData();
      throw new Error("Outro computador alterou os dados primeiro. Atualizei a consulta e fechei o formulário; abra o registro novamente para conferir os valores.");
    }
    setData(next);
    setVersion(Number(updated[0].version) || expectedVersion + 1);
    setDataError("");
  }, [session, version, loadData, data, demoMode, readOnly]);

  const resetPassword = async (username) => {
    if (!supabase) throw new Error("Configuração do Supabase não encontrada.");
    const email = config.USER_EMAILS?.[String(username || "").trim().toUpperCase()];
    if (typeof email !== "string" || !email.trim()) throw new Error("Digite um usuário válido antes de solicitar a recuperação.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://pedrofigueredo221-maker.github.io/RR-FIGUEREDO-TRANSPORTES/redefinir-senha.html"
    });
    if (error) throw new Error("Não foi possível solicitar a recuperação. Confira as configurações de e-mail do Supabase.");
  };

  const login = async (username, password) => {
    if (demoMode) { setSession({ user: { email: "demo@local.test" } }); setActivePage("dashboard"); setAuthReady(true); return; }
    if (!supabase) return;
    setBusy(true); setAuthError("");
    try {
      const email = config.USER_EMAILS?.[String(username || "").trim().toUpperCase()];
      if (typeof email !== "string" || !email.trim()) throw new Error("Usuário não configurado. Confira o nome informado.");
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) {
      setAuthError(error?.message === "Invalid login credentials" ? "Usuário ou senha incorretos." : error?.message || "Não foi possível entrar.");
    } finally { setBusy(false); }
  };
  const logout = async () => {
    if (demoMode) { setSession(null); setActivePage("dashboard"); return; }
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError("Não foi possível encerrar a sessão. Tente novamente.");
    else setActivePage("dashboard");
  };


  if (!authReady) return <main className="loading-page"><span className="spinner" /><p>Verificando sessão segura…</p></main>;
  if (!session) return <Login onLogin={login} onReset={resetPassword} busy={busy} error={authError} />;

  return <div className={`app-shell ${readOnly ? "read-only" : ""}`}>
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}><div className="sidebar-brand"><img src="./imagens/logo-menu-rr.svg" alt="R&R Figueredo Transportes" /></div>
      <p className="nav-label">MENU PRINCIPAL</p><nav aria-label="Menu principal">{pages.map((p) => <button key={p.id} className={`nav-item ${activePage === p.id ? "active" : ""}`} onClick={() => { setRecordNavigation(null); setActivePage(p.id); setMenuOpen(false); }}><MenuIcon name={p.symbol} />{p.label}</button>)}</nav>
      <div className="sidebar-bottom"><span className="sidebar-user-email" title={session.user?.email}>{session.user?.email}</span><button type="button" className="sidebar-logout" onClick={logout}>Sair</button></div>
    </aside>
    {menuOpen && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area"><header className="topbar"><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir ou fechar menu">☰</button>
      <div><p className="eyebrow">R&amp;R FIGUEREDO TRANSPORTES</p><h1>{titles[activePage]}</h1></div>

    </header>
    {demoMode && <div className="demo-notice" role="status"><strong>Modo de demonstração.</strong> Dados fictícios salvos somente neste navegador; nenhuma alteração é enviada ao Supabase da empresa.</div>}
    {readOnly && <div className="read-only-notice" role="status">Modo visitante: consulta somente leitura. Não há ações de cadastro nesta versão.</div>}
    <div className="content-area">
      {dataError && <div className="error-banner" role="alert"><strong>Não foi possível carregar os dados.</strong><p>{dataError}</p><button className="secondary-button" onClick={loadData} disabled={loadingData}>Tentar novamente</button></div>}
      {loadingData && !dataError && <div className="inline-loading"><span className="spinner" />Carregando dados compartilhados…</div>}
      {(() => { const Screen = screenComponents[activePage] || PainelInicial; return <Screen page={activePage} data={data} onRefresh={loadData} loading={loadingData} onSave={saveData} readOnly={readOnly} version={version} onOpenRecord={openRecord} recordNavigation={recordNavigation} />; })()}
      <footer className="app-footer">Sistema de gestão · Dados compartilhados com controle de gravação.</footer>
    </div></main>
  </div>;
}
