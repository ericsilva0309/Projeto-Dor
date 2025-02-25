import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "./cognitoConfig";

createRoot(document.getElementById("root")).render(
  <StrictMode>
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
      <App />
    </AuthProvider>
  </StrictMode>
);
