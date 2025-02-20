import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.sa-east-1.amazonaws.com/sa-east-1_QfLfFVA2H",
  client_id: "3u23vjiuu69a0u5n5qknsbqeq4",
  redirect_uri: "https://main.d19hnf6nrn03et.amplifyapp.com",
  response_type: "code",
  scope: "phone openid email",
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </StrictMode>
);
