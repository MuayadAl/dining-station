const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/.test(window.location.hostname)
);

/**
 * Register the service worker if applicable
 * @param {Object} config Optional configuration callbacks
 */
export function register(config) {
  if (
    process.env.NODE_ENV !== 'development' || // ✅ Only allow in dev for now
    !('serviceWorker' in navigator)
  ) {
    console.log('🛑 Skipping service worker registration (not development or unsupported)');
    return;
  }

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  if (publicUrl.origin !== window.location.origin) {
    console.warn('⚠️ PUBLIC_URL origin mismatch. Skipping service worker registration.');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      checkValidServiceWorker(swUrl, config);
      navigator.serviceWorker.ready.then(() => {
        console.log('Service worker is ready (dev only).');
      });
    } else {
      // ✅ Enable for production use
      registerValidSW(swUrl, config);
      console.log('✅ Service worker registered in production');
    }
    
  });
}

/**
 * Registers a valid service worker
 */
function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('🔁 New content is available; will be used after all tabs are closed.');
              config?.onUpdate?.(registration);
            } else {
              console.log('🎉 Content is cached for offline use.');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('❌ Error during service worker registration:', error);
    });
}

/**
 * Checks and unregisters invalid service worker if not found
 */
function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl)
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType && !contentType.includes('javascript'))
      ) {
        // ❌ Not found or invalid type – unregister
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // ✅ Valid service worker file
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('⚠️ No internet connection. App is running in offline mode.');
    });
}

/**
 * Unregister the service worker
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((error) => {
        console.error(' Unregister failed:', error);
      });
  }
}
