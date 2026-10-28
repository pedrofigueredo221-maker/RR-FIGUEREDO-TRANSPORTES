import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const failures = [];

const requiredFiles = [
  "package.json",
  "vite.config.js",
  "index.html",
  "redefinir-senha.html",
  "src/main.jsx",
  "src/app/bootstrap.jsx",
  "src/app/navigation.js",
  "reset-main.jsx",
  "src/App.jsx",
  "src/PasswordReset.jsx",
  "src/styles.css",
  "src/styles/screens.css",
  "src/domain/freightCalculations.js",
  "src/domain/freightCalculations.test.js",
  "banco-de-dados/supabase/app-config.js"
];

for (const path of requiredFiles) {
  if (!existsSync(new URL(path, root))) failures.push(`Arquivo React necessário ausente: ${path}`);
}

const mainHtml = read("index.html");
const resetHtml = read("redefinir-senha.html");
const vite = read("vite.config.js");
const app = read("src/App.jsx");
const main = read("src/main.jsx");
const bootstrap = read("src/app/bootstrap.jsx");
const navigation = read("src/app/navigation.js");
const resetMain = read("reset-main.jsx");
const globalStyles = read("src/styles.css");
const screenStyles = read("src/styles/screens.css");
const freightForm = read("src/screens/FreightForm.jsx");
const editablePage = read("src/EditablePage.jsx");

if (!mainHtml.includes('src="/src/main.jsx"')) failures.push("A entrada principal não carrega src/main.jsx.");
if (!resetHtml.includes("./reset-main.jsx")) failures.push("A página de recuperação não carrega reset-main.jsx.");
if (!main.includes("./app/bootstrap.jsx") || !main.includes("mountApplication")) failures.push("A entrada React deve delegar a montagem ao bootstrap.");
if (!bootstrap.includes("../styles.css") || !bootstrap.includes("../styles/screens.css")) failures.push("O bootstrap React deve importar os dois arquivos CSS na ordem original.");
if (!bootstrap.includes("../App.jsx") || !bootstrap.includes("StrictMode")) failures.push("O bootstrap deve montar App em StrictMode.");
if (!app.includes("./app/navigation.js") || !navigation.includes("export const pages") || !navigation.includes("export const titles")) failures.push("A navegação deve ser importada do módulo compartilhado.");
if (!resetMain.includes("./src/styles.css") || !resetMain.includes("./src/styles/screens.css")) failures.push("A página de recuperação não compartilha os estilos React.");
if (!vite.includes('"redefinir-senha.html"')) failures.push("O build Vite não inclui a página React de recuperação.");
if (!app.includes("redefinir-senha.html")) failures.push("O fluxo de recuperação de senha não aponta para a página React publicada.");

// Guardas contra o retorno das duplicidades visuais encontradas na auditoria.
if (globalStyles.includes("freight-summary")) failures.push("O resumo financeiro do frete deve ter estilos apenas em styles/screens.css.");
if (/\.freight-editor \.freight-fields\s*\{[^}]*grid-template-columns:\s*repeat\(3/.test(screenStyles)) failures.push("A grade base de campos do frete deve ter uma única definição em styles.css.");
if (screenStyles.includes(".freight-editor .freight-fields, .fuel-grid")) failures.push("A regra mobile de combustível deve usar o seletor completo .freight-editor .fuel-grid.");
if ((screenStyles.match(/\.freight-editor \.freight-summary \{/g) || []).length !== 1) failures.push("O resumo financeiro deve possuir exatamente um bloco CSS base.");
if (globalStyles.includes("!important") || screenStyles.includes("!important")) failures.push("Evite !important nos estilos React; corrija a cascata na regra responsável.");
if (freightForm.includes("Intl.NumberFormat")) failures.push("FreightForm deve reutilizar o formatador de moeda compartilhado.");
if (editablePage.includes("Intl.NumberFormat") || editablePage.includes("const dateLabel =")) failures.push("EditablePage deve reutilizar os formatadores compartilhados.");
if (!freightForm.includes("freightCost(calculationInput)")) failures.push("O resumo de frete deve usar a função de domínio freightCost.");

const legacyPaths = [
  "react-app",
  "app.js",
  "sync.js",
  "styles.css",
  "config.js",
  "js/core/startup.js",
  "js/core/utils.js",
  "banco-de-dados/supabase/config.js"
];
for (const path of legacyPaths) {
  if (existsSync(new URL(path, root))) failures.push(`Arquivo legado ainda presente: ${path}`);
}

if (failures.length) {
  console.error("Falhas na auditoria estrutural React:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Auditoria estrutural React OK: ${requiredFiles.length} arquivos essenciais presentes, entradas verificadas e ${legacyPaths.length} caminhos legados ausentes.`);
}
