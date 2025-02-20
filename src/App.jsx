// src/App.js
import { useAuth } from "react-oidc-context";
import Dashboard from "./pages/DashBoard";
import { useEffect } from "react";

function App() {
  const auth = useAuth();

  useEffect(() => {
    // Se a autenticação não estiver carregando e o usuário não estiver autenticado, redirecione para o login
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth]);

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  // Enquanto não estiver autenticado (ou durante o redirecionamento), exibe uma mensagem temporária
  if (!auth.isAuthenticated) {
    return <div>Redirecionando para a tela de login...</div>;
  }

  // Se o usuário estiver autenticado, renderize o Dashboard e um botão de logout
  return (
    <div>
      <div style={{ textAlign: "right", padding: "1rem" }}>
        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
      <Dashboard />
    </div>
  );
}

export default App;
