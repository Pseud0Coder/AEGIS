const { AdMob } = window.Capacitor?.Plugins || {};

async function readPremiumStatus() {
  try {
    if (typeof window.checkPremiumStatus === 'function') {
      return Boolean(await window.checkPremiumStatus());
    }
    return localStorage.getItem('aegis_premium') === 'true';
  } catch (error) {
    console.warn('Unable to read premium status', error);
    return false;
  }
}

async function initAds() {
  const premium = await readPremiumStatus();
  if (!AdMob || premium) return;

  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: true,
    });

    await AdMob.showBanner({
      adId: 'ca-app-pub-3940256099942544/6300978111',
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: true,
    });

    await AdMob.addListener('bannerSize', (info) => {
      const height = Number(info?.height);
      if (Number.isFinite(height) && height >= 0) {
        document.documentElement.style.setProperty('--ad-banner-height', `${height}px`);
        requestAnimationFrame(() => {
          if (window.resizeAegisGame) window.resizeAegisGame();
          else window.dispatchEvent(new Event('resize'));
        });
      }
    });
  } catch (error) {
    // Ads are optional; never prevent the game from starting.
    console.error('AdMob initialization failed', error);
  }
}

window.addEventListener('load', () => {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    initAds();
  }
});
