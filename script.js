// The Evading Add to Cart — Hermès Birkin
//
// Premise: the button slips elegantly away from the cursor as it approaches.
// Tone must stay luxurious: slow easing, restrained motion, never jittery.
// The button doesn't dodge — it composes itself out of reach.

const btn = document.getElementById('add-to-cart');

if (btn) {
  // Tunable parameters — adjust to taste
  const PROXIMITY_THRESHOLD = 140; // px — when cursor gets this close, the button moves
  const RETREAT_DISTANCE = 220;    // px — how far the button retreats per evasion
  const PADDING = 40;              // px — keep the button this far from viewport edges

  let offsetX = 0;
  let offsetY = 0;

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function evadeFrom(cursorX, cursorY) {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Vector from cursor → button center
    const dx = cx - cursorX;
    const dy = cy - cursorY;
    const dist = Math.hypot(dx, dy) || 1;

    // Move further in the direction away from the cursor
    const nx = dx / dist;
    const ny = dy / dist;

    let nextOffsetX = offsetX + nx * RETREAT_DISTANCE;
    let nextOffsetY = offsetY + ny * RETREAT_DISTANCE;

    // Keep within viewport (account for the button's natural position)
    const naturalLeft = rect.left - offsetX;
    const naturalTop = rect.top - offsetY;

    const minOffsetX = PADDING - naturalLeft;
    const maxOffsetX = window.innerWidth - rect.width - PADDING - naturalLeft;
    const minOffsetY = PADDING - naturalTop;
    const maxOffsetY = window.innerHeight - rect.height - PADDING - naturalTop;

    nextOffsetX = clamp(nextOffsetX, minOffsetX, maxOffsetX);
    nextOffsetY = clamp(nextOffsetY, minOffsetY, maxOffsetY);

    offsetX = nextOffsetX;
    offsetY = nextOffsetY;

    btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }

  document.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (distance(e.clientX, e.clientY, cx, cy) < PROXIMITY_THRESHOLD) {
      evadeFrom(e.clientX, e.clientY);
    }
  });

  // Touch support (mobile)
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (distance(t.clientX, t.clientY, cx, cy) < PROXIMITY_THRESHOLD) {
      evadeFrom(t.clientX, t.clientY);
    }
  }, { passive: true });
}
