import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';
import './security/authenticatedFetch';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DD WORLD app render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh',
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f8fc',
        color: '#14213d',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          padding: 20,
          borderRadius: 18,
          border: '1px solid #d8e3ef',
          background: '#fff',
          boxShadow: '0 10px 30px rgba(20,45,80,.10)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>DD WORLD MARKETING</div>
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: '#b42336' }}>
            App startup error
          </div>
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6, color: '#53657d', wordBreak: 'break-word' }}>
            {this.state.error.message || 'The app could not render this screen.'}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              marginTop: 16,
              minHeight: 46,
              border: 0,
              borderRadius: 12,
              background: 'linear-gradient(90deg,#ef1d32,#1477e8)',
              color: '#fff',
              fontWeight: 900,
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

const startPwa = () => {
  // The native Android build is a Capacitor app, not a browser PWA.
  // Running a Workbox service worker inside the WebView can leave an older
  // cached JS bundle in control after an APK update, resulting in a blank screen.
  if (Capacitor.isNativePlatform()) return;

  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New DD World platform version available. Updating cache...');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('DD World Platform is ready for offline operation via Service Worker cache.');
      },
      onRegisterError(error) {
        console.warn('Service worker registration failed:', error);
      },
    });
  }).catch((error) => {
    console.warn('PWA registration module unavailable:', error);
  });
};

startPwa();

const root = document.getElementById('root');
if (!root) {
  throw new Error('DD WORLD root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
