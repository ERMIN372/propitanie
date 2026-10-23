import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const CSP =
  "default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com; " +
  "img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'";

// CSP только в прод-сборке, чтобы не ломать HMR дев-сервера
function cspMeta(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  base: '/propitanie/',
  plugins: [react(), cspMeta()],
  build: {
    // мелкие шрифты Vite по умолчанию вшивает как data:, а CSP разрешает шрифты только с 'self'
    assetsInlineLimit: (file) => (/\.(woff2?|ttf)$/.test(file) ? false : undefined),
  },
});
