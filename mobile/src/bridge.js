const { AdMob } = window.Capacitor ? window.Capacitor.Plugins : {};

async function initAds() {
  if (!AdMob) return;
  
  const isPremium = localStorage.getItem('aegis_premium') === 'true';
  if (isPremium) {
    console.log("User is premium. No ads will be shown.");
    const btn = document.getElementById("removeAdsBtn");
    if (btn) btn.style.display = "none";
    return;
  }

  await AdMob.initialize({
    requestTrackingAuthorization: true,
    initializeForTesting: true,
  });

  const options = {
    adId: 'ca-app-pub-3940256099942544/6300978111',
    adSize: 'BANNER',
    position: 'BOTTOM_CENTER',
    margin: 0,
    isTesting: true,
  };
  
  await AdMob.showBanner(options);
  
  AdMob.addListener('bannerSize', (info) => {
    const isPremium = localStorage.getItem('aegis_premium') === 'true';
    if (!isPremium) {
      const bannerHeight = info.height;
      document.getElementById('game').style.height = `calc(100% - ${bannerHeight}px)`;
      // Trigger canvas resize
      window.dispatchEvent(new Event('resize'));
    }
  });
}

window.checkPremiumStatus = async function() {
  // In a real scenario, this would query Google Play via a plugin
  // e.g. Capacitor.Plugins.InAppPurchase2 or similar
  return localStorage.getItem('aegis_premium') === 'true';
};

window.purchasePremium = async function() {
  try {
    // IAP plugin logic here to purchase 'aegis_premium_unlock'
    console.log("Mock purchase successful!");
    localStorage.setItem('aegis_premium', 'true');
    
    if (AdMob) {
      await AdMob.hideBanner().catch(() => {});
      await AdMob.removeBanner().catch(() => {});
    }
    
    // Reset canvas height
    const gameCanvas = document.getElementById('game');
    gameCanvas.style.height = "100%";
    window.dispatchEvent(new Event('resize'));
    
    // Hide the button
    const btn = document.getElementById('removeAdsBtn');
    if (btn) btn.style.display = 'none';
    
    alert("Premium Unlocked! Ads removed.");
    return true;
  } catch (error) {
    console.error("Purchase failed", error);
    alert("Purchase failed.");
    return false;
  }
};

window.addEventListener('load', () => {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    initAds();
  }
});
