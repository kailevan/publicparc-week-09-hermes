// Hermès Birkin — Add to Cart Evade (mobile-first, touch-driven)
//
// Mechanic
//   A. Tap near button         → button leaps with a smooth glide
//   B. Drag finger toward it   → button slides away in real time
//   C. Idle 1.5s with no touch → button slides home, composes itself
//   D. Each leap is bigger     → escalation, eventually escapes the sticky bar
//   E. After 4 leaps           → button yields, the tap registers, Hermès dialog
//   F. ±15% distance, ±15° angle on every leap → organic, not mechanical

const btn = document.getElementById('add-to-cart');
const dialog = document.getElementById('yield-dialog');
const dialogClose = document.querySelector('.dialog-close');

if (btn) {
  const PROXIMITY_TAP    = 90;    // px — tap this close = trigger leap
  const PROXIMITY_DRAG   = 130;   // px — drag this close = also leap
  const BASE_DISTANCE    = 110;   // starting leap distance
  const ESCALATION       = 45;    // px added per attempt
  const PADDING          = 16;    // px from viewport edges
  const SNAP_BACK_DELAY  = 1500;  // ms idle before button slides home
  const LEAP_THROTTLE    = 250;   // ms minimum between leaps
  const YIELD_AFTER      = 4;     // leaps before the button accepts the tap

  let offsetX = 0;
  let offsetY = 0;
  let attempts = 0;
  let yielded = false;
  let dragMode = false;
  let snapBackTimer = null;
  let lastLeapAt = 0;

  // Cached natural geometry — measured once at load, refreshed on resize.
  // Using a cached value (rather than reading getBoundingClientRect every
  // frame) avoids relying on transform-interpolated rects mid-transition,
  // which is what was making the clamp math drift and lose the button.
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
    // Standard padded bounds based on viewport
    const minOX_raw = PADDING - natural.left;
    const maxOX_raw = window.innerWidth  - natural.width  - PADDING - natural.left;
    const minOY_raw = PADDING - natural.top;
    const maxOY_raw = window.innerHeight - natural.height - PADDING - natural.top;

    // The natural position (offset 0,0) must always be allowed, even if the
    // natural position is already past the padding line (which happens when
    // the sticky bar sits flush against the bottom edge of the viewport).
    const minOX = Math.min(0, minOX_raw);
    const maxOX = Math.max(0, maxOX_raw);
    const minOY = Math.min(0, minOY_raw);
    const maxOY = Math.max(0, maxOY_raw);

    offsetX = Math.max(minOX, Math.min(maxOX, offsetX));
    offsetY = Math.max(minOY, Math.min(maxOY, offsetY));
  }

  function leap(fromX, fromY) {
    if (yielded) return;

    const now = Date.now();
    if (now - lastLeapAt < LEAP_THROTTLE) return;
    lastLeapAt = now;

    attempts++;

    const c = currentCenter();
    let dx = c.x - fromX;
    let dy = c.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    let ux = dx / d;
    let uy = dy / d;

    // Angular variance ±15°
    const angleVar = (Math.random() - 0.5) * (Math.PI / 6);
    const cos = Math.cos(angleVar);
    const sin = Math.sin(angleVar);
    const rux = ux * cos - uy * sin;
    const ruy = ux * sin + uy * cos;

    // Distance escalates per attempt with ±15% variance
    let dist = BASE_DISTANCE + (attempts - 1) * ESCALATION;
    dist *= 1 + (Math.random() - 0.5) * 0.3;

    offsetX += rux * dist;
    offsetY += ruy * dist;

    clampToViewport();

    btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    armSnapBack();

    if (attempts >= YIELD_AFTER) {
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
      leap(t.clientX, t.clientY);
      dragMode = true;
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (yielded || !dragMode) return;
    const t = e.touches[0];
    if (!t) return;
    const c = currentCenter();
    if (distance(t.clientX, t.clientY, c.x, c.y) < PROXIMITY_DRAG) {
      leap(t.clientX, t.clientY);
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    dragMode = false;
  });

  // —————— MOUSE (desktop dev) ——————
  document.addEventListener('mousedown', (e) => {
    if (yielded) return;
    const c = currentCenter();
    if (distance(e.clientX, e.clientY, c.x, c.y) < PROXIMITY_TAP) {
      e.preventDefault();
      leap(e.clientX, e.clientY);
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (yielded) return;
    if (e.buttons === 0) return;
    const c = currentCenter();
    if (distance(e.clientX, e.clientY, c.x, c.y) < PROXIMITY_DRAG) {
      leap(e.clientX, e.clientY);
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
  // Cache natural position once the layout settles, then again on resize /
  // orientation change so the clamp keeps the button inside the viewport
  // even when the address bar shows/hides or the user rotates the phone.
  window.addEventListener('load', captureNatural);
  if (document.readyState === 'complete') captureNatural();

  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Temporarily clear transform so getBoundingClientRect reads the
      // natural position cleanly, then restore the offset and re-clamp.
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
