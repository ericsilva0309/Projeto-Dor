import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider, CallbackComponent } from "react-oidc-context";
import { cognitoAuthConfig } from "./cognitoConfig";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider
        {...cognitoAuthConfig}
        loadUserInfo={false}
        metadata={{
          authorization_endpoint:
            "https://sa-east-1qflffva2h.auth.sa-east-1.amazoncognito.com/login",
          token_endpoint:
            "https://sa-east-1qflffva2h.auth.sa-east-1.amazoncognito.com/oauth2/token",
          userinfo_endpoint:
            "https://sa-east-1qflffva2h.auth.sa-east-1.amazoncognito.com/oauth2/userInfo",
          jwks_uri:
            "https://cognito-idp.sa-east-1.amazonaws.com/sa-east-1_QfLfFVA2H/.well-known/jwks.json",
        }}
      >
        <Routes>
          {/* Rota dedicada para o callback do OIDC */}
          <Route path="/callback" element={<CallbackComponent />} />
          {/* Outras rotas da aplicação */}
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
