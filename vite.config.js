// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Força a resolução do módulo react-oidc-context para o arquivo de entrada dele
      'react-oidc-context': path.resolve(__dirname, 'node_modules/react-oidc-context/dist/umd/react-oidc-context.js'),
    },
  },
  optimizeDeps: {
    include: ['react-oidc-context'],
  },
});


