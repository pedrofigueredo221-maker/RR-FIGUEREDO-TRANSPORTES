import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../App.jsx";
import "../styles.css";
import "../styles/screens.css";

/**
 * Bootstrap isolado da aplicação.
 * Mantém o contrato de montagem e a ordem dos estilos existentes.
 * Não altera autenticação, telas protegidas ou persistência.
 */
export function mountApplication(element) {
  if (!element) {
    throw new Error('Elemento raiz do React "#react-root" não encontrado.');
  }

  createRoot(element).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
