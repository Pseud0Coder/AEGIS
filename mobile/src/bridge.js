const { AdMob } = window.Capacitor?.Plugins || {};

function isPremium() {
  try {
    return isPremium();
  } catch (error) {
    console.warn('Unable to read premium status', error);
    return false;
  }
}

function hideRemoveAdsButton() {
  const btn = document.getElementById('removeAdsBtn');
  if (btn) btn.style.display = 'none';
}

async function initAds() {
  if (!AdMob || isPremium()) {
    if (isPremium()) hideRemoveAdsButton();
    return;
  }

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
      if (!isPremium() && info?.height) {
        const gameCanvas = document.getElementById('game');
        if (gameCanvas) {
          gameCanvas.style.height = `calc(100% - ${info.height}px)`;
          window.dispatchEvent(new Event('resize'));
        }
      }
    });
  } catch (error) {
    // Ads are optional; never prevent the game from starting.
    console.error('AdMob initialization failed', error);
  }
}

window.checkPremiumStatus = async function() {
  // In a real scenario, this would query Google Play via a plugin
  // e.g. Capacitor.Plugins.InAppPurchase2 or similar
  return localStorage.getItem('aegis_premium') === 'true';
};

window.purchasePremium = async function() {
  // There is no billing plugin in this build. Do not claim a purchase
  // succeeded or persist premium access without a verified transaction.
  alert('Ad-free upgrade is not available in this build yet.');
  return false;
};

window.addEventListener('load', () => {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    initAds();
  }
});
