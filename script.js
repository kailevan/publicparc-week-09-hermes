// Hermès Birkin — Add to Cart Evade (mobile-first, touch-driven)
//
// Choreographed mechanic:
//   Tap 1 → button slides left, stays at the sticky bar (subtle refusal)
//   Tap 2 → button jumps up-right into the product details
//   Tap 3 → button jumps to the upper-left, onto the hero bag image
//   Tap 4 → button jumps to the top-right, next to the cart icon
//   Tap 5 → button yields, accepts the tap, Hermès dialog fades in
//   1.5s idle → button slides home, ready to refuse again

const btn = document.getElementById('add-to-cart');
const dialog = document.getElementById('yield-dialog');
const dialogClose = document.querySelector('.dialog-close');

if (btn) {
  // Predestined leap targets — each value is the desired button CENTER
  // position as a fraction of the viewport (xRatio across the width,
  // yRatio down the height). The clamp at the end keeps the button on
  // screen if a target lands too close to an edge on a narrow viewport.
  const LEAP_POSITIONS = [
    { xRatio: 0.20, yRatio: 0.94 },  // 1: bottom-left, still at the bar
    { xRatio: 0.70, yRatio: 0.55 },  // 2: right side, mid-page
    { xRatio: 0.25, yRatio: 0.28 },  // 3: upper-left, onto the bag image
    { xRatio: 0.75, yRatio: 0.08 },  // 4: top-right, next to the cart icon
  ];

  const PROXIMITY_TAP   = 90;    // px — touch this close = trigger a leap
  const PADDING         = 16;    // px — keep button this far from viewport edges
  const SNAP_BACK_DELAY = 1500;  // ms — idle time before button slides home
  const LEAP_THROTTLE   = 250;   // ms — minimum time between leaps

  let offsetX = 0;
  let offsetY = 0;
  let attempts = 0;
  let yielded = false;
  let snapBackTimer = null;
  let lastLeapAt = 0;

  // Cached natural geometry — captured at load + on resize.
  let natural = { left: 0, top: 0, width: 0, height: 0 };

  function captureNatural() {
    const r = btn.getBoundingClientRect();
    natural = {
      left: r.left - offsetX,
      top:  r.top  - offsetY,
      width: r.width,
      height: r.height,
    };
  }

  function currentCenter() {
    return {
      x: natural.left + offsetX + natural.width / 2,
      y: natural.top  + offsetY + natural.height / 2,
    };
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function clampToViewport() {
    const minOX_raw = PADDING - natural.left;
    const maxOX_raw = window.innerWidth  - natural.width  - PADDING - natural.left;
    const minOY_raw = PADDING - natural.top;
    const maxOY_raw = window.innerHeight - natural.height - PADDING - natural.top;

    // Natural position (offset 0,0) must always be a valid resting state,
    // even if the sticky bar already sits flush against the bottom edge.
    const minOX = Math.min(0, minOX_raw);
    const maxOX = Math.max(0, maxOX_raw);
    const minOY = Math.min(0, minOY_raw);
    const maxOY = Math.max(0, maxOY_raw);

    offsetX = Math.max(minOX, Math.min(maxOX, offsetX));
    offsetY = Math.max(minOY, Math.min(maxOY, offsetY));
  }

  function leap() {
    if (yielded) return;

    const now = Date.now();
    if (now - lastLeapAt < LEAP_THROTTLE) return;
    lastLeapAt = now;

    if (attempts >= LEAP_POSITIONS.length) return; // safety guard

    const pos = LEAP_POSITIONS[attempts];
    const targetCenterX = pos.xRatio * window.innerWidth;
    const targetCenterY = pos.yRatio * window.innerHeight;
    const naturalCenterX = natural.left + natural.width / 2;
    const naturalCenterY = natural.top  + natural.height / 2;

    offsetX = targetCenterX - naturalCenterX;
    offsetY = targetCenterY - naturalCenterY;

    clampToViewport();

    btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    attempts++;
    armSnapBack();

    if (attempts >= LEAP_POSITIONS.length) {
      yielded = true;
      btn.classList.add('yielded');
    }
  }

  function armSnapBack() {
    clearTimeout(snapBackTimer);
    snapBackTimer = setTimeout(snapBack, SNAP_BACK_DELAY);
  }

  function snapBack() {
    if (yielded) return;
    offsetX = 0;
    offsetY = 0;
    btn.style.transform = 'translate(0, 0)';
  }

  // —————— TOUCH (primary, mobile) ——————
  document.addEventListener('touchstart', (e) => {
    if (yielded) return;
    const t = e.touches[0];
    if (!t) return;
    const c = currentCenter();
    if (distance(t.clientX, t.clientY, c.x, c.y) < PROXIMITY_TAP) {
      e.preventDefault();
      leap();
    }
  }, { passive: false });

  // —————— MOUSE (desktop dev) ——————
  document.addEventListener('mousedown', (e) => {
    if (yielded) return;
    const c = currentCenter();
    if (distance(e.clientX, e.clientY, c.x, c.y) < PROXIMITY_TAP) {
      e.preventDefault();
      leap();
    }
  });

  // —————— CLICK (yield = dialog) ——————
  btn.addEventListener('click', (e) => {
    if (!yielded) {
      e.preventDefault();
      return;
    }
    showYieldDialog();
  });

  // —————— DIALOG ——————
  function showYieldDialog() {
    if (!dialog) return;
    dialog.removeAttribute('hidden');
    requestAnimationFrame(() => dialog.classList.add('open'));
  }

  function hideYieldDialog() {
    if (!dialog) return;
    dialog.classList.remove('open');
    setTimeout(() => dialog.setAttribute('hidden', ''), 400);
  }

  if (dialogClose) {
    dialogClose.addEventListener('click', hideYieldDialog);
  }

  // —————— INIT + RESIZE ——————
  window.addEventListener('load', captureNatural);
  if (document.readyState === 'complete') captureNatural();

  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const savedOX = offsetX, savedOY = offsetY;
      btn.style.transition = 'none';
      btn.style.transform = 'translate(0, 0)';
      requestAnimationFrame(() => {
        captureNatural();
        offsetX = savedOX;
        offsetY = savedOY;
        clampToViewport();
        btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        requestAnimationFrame(() => {
          btn.style.transition = '';
        });
      });
    }, 100);
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
}
