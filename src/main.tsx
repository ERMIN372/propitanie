import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/golos-text';
import '@fontsource-variable/caveat';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { applyTheme, useTheme } from './stores/theme';

applyTheme(useTheme.getState().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
