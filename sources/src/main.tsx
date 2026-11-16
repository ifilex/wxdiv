import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {installPersistenceAndCrashGuards} from './engine/indexedDbPersistence.ts';
import './index.css';

function ensurePersistentStorage() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    // Ignore storage persistence errors on unsupported browsers
  }
}

installPersistenceAndCrashGuards();
ensurePersistentStorage();

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    ensurePersistentStorage();
    if (registration) {
      window.setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    }
  },
  onOfflineReady() {
    ensurePersistentStorage();
  },
  onRegisterError() {
    // Prevent unhandled SW registration errors from interrupting startup
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary sectionName="Aplicación WXDIV">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
