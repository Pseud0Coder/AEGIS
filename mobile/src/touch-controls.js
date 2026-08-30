
let touchOrigin = null;
let lastTapTime = 0;
let doubleTapBoost = false;
let isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

if (isTouchDevice) {
    window.addEventListener('touchstart', (e) => {
        if (game.state !== 'playing') return;
        
        const now = Date.now();
        
        // 2 fingers OR quick double tap = BOOST
        if (e.touches.length > 1 || (now - lastTapTime < 300)) {
            keys[' '] = true;
            if (e.touches.length <= 1) doubleTapBoost = true;
        }
        lastTapTime = now;

        // Establish movement origin
        if (e.touches.length === 1 && !touchOrigin) {
            touchOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (game.state !== 'playing' || !touchOrigin) return;
        // Optional: prevent default to stop page scrolling
        e.preventDefault();
        
        const touch = e.touches[0];
        const dx = touch.clientX - touchOrigin.x;
        const dy = touch.clientY - touchOrigin.y;
        
        const deadzone = 15;
        keys['d'] = dx > deadzone;
        keys['a'] = dx < -deadzone;
        keys['s'] = dy > deadzone;
        keys['w'] = dy < -deadzone;
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            touchOrigin = null;
            keys['w'] = false; keys['a'] = false; keys['s'] = false; keys['d'] = false;
            keys[' '] = false;
            doubleTapBoost = false;
        } else if (e.touches.length === 1) {
            if (!doubleTapBoost) {
                keys[' '] = false;
            }
        }
    }, { passive: false });
    
    window.addEventListener('touchcancel', (e) => {
        touchOrigin = null;
        keys['w'] = false; keys['a'] = false; keys['s'] = false; keys['d'] = false;
        keys[' '] = false;
        doubleTapBoost = false;
    }, { passive: false });
}

