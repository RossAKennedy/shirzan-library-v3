/* =========================================================
   Shirzan Library — Interaction Script (BUBBLES standard)
   - Stag waterfall: independent (always runs, self-hides)
   - Exclusive dialogues: crest / armor / catHead (one at a time)
   - Click-off cancels active dialogue (does NOT touch waterfall)
   - All visual “ambient” effects use startBubbles/stopBubbles
   - Back-compat: startBalloons/stopBalloons alias to bubbles
   ========================================================= */

(function () {
  // ---------- Element lookups ----------
  var entrance    = document.getElementById('library-entrance');
  var stagHot     = document.getElementById('stag-hotspot');
  var stagBubble  = document.getElementById('stag-bubble');
  var crestHot    = document.getElementById('crest-hotspot');
  var armorHot    = document.getElementById('armor-hotspot');
  var catHot      = document.getElementById('cat-hotspot');
  var backHot     = document.getElementById('catback-hotspot');

  var crestTxt    = document.getElementById('crest-bubble');
  var armorTxt    = document.getElementById('armor-bubble');
  var catTxt      = document.getElementById('cat-bubble');
  var consent     = document.getElementById('consent-bubble');

  var brambleTxt  = document.getElementById('bramble-bubble');
  var kingTxt     = document.getElementById('king-bubble');

  var cover       = document.getElementById('waterfall-cover');
  var scene       = document.getElementById('waterfall-scene');

  // ---------- DEBUG ----------
  const DEBUG = true;
  function dbg() { if (DEBUG) console.log('[DBG]', ...arguments); }

  window.addEventListener('error', (e) => {
    console.error('[ERROR]', e.message || e, e.filename || '', e.lineno || '');
  }, true);
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[PROMISE]', e.reason);
  });
  document.addEventListener('error', (e) => {
    const t = e.target || {};
    console.warn('[RESOURCE ERROR]', t.tagName, t.src || t.href || t.id || t.className);
  }, true);

  // ========================================================
  // Bubbles: control + adapters (canonical API is startBubbles/stopBubbles)
  // ========================================================
  let bubblesActive = false;
  let bubblesSpawn  = null; // if you later spawn DOM nodes for bubbles

  function startBubbles() {
    const zone = document.getElementById('balloon-zone'); // visual canvas
    if (!zone) return;
    if (bubblesActive) return;
    bubblesActive = true;

    // Default: class toggle (CSS handles visuals)
    zone.classList.add('show-bubbles');

    // If you later add DOM-spawned bubbles, do it here and store interval in bubblesSpawn.
    // Example:
    // bubblesSpawn = setInterval(() => { /* spawn nodes */ }, 700);
  }

  function stopBubbles() {
    const zone = document.getElementById('balloon-zone');
    if (!bubblesActive) return;
    bubblesActive = false;

    if (bubblesSpawn) { clearInterval(bubblesSpawn); bubblesSpawn = null; }

    if (zone) {
      zone.classList.remove('show-bubbles');
      // If you spawn nodes dynamically, also clear them here:
      // zone.querySelectorAll('.balloon,.bubble-node').forEach(n => n.remove());
    }
  }

  // --- Back-compat aliases (older code calling “balloons” keeps working) ---
  function startBalloons(){ startBubbles(); }
  function stopBalloons(){  stopBubbles();  }

  // ========================================================
  // Exclusive run controller (dialogues only — NOT waterfall)
  // ========================================================
  let currentScript = null;             // 'crest' | 'armor' | 'catHead' | 'bramble' | null
  const timers = [];                    // central timeout registry
  const hideTimers = new Map();         // per-element auto-hide timers

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
    if (hideTimers.size) {
      hideTimers.forEach((t) => clearTimeout(t));
      hideTimers.clear();
    }
  }
  function hide(el) {
    if (!el) return;
    el.classList.remove('show-bubble');
    el.hidden = true;
  }
  function hideAll() {
    hide(armorTxt);
    hide(catTxt);
    hide(consent);
    hide(crestTxt);
    hide(brambleTxt);
    if (typeof kingTxt !== 'undefined' && kingTxt) hide(kingTxt);
  }
  function startSequence(name) {
    clearTimers();
    hideAll();
    currentScript = name;
  }
  function show(el, text, hideMs) {
    if (!el) return;
    if (typeof text === 'string') el.textContent = text;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('show-bubble'); });
    var ms = (typeof hideMs === 'number') ? hideMs : 5000;

    if (hideTimers.has(el)) { clearTimeout(hideTimers.get(el)); hideTimers.delete(el); }
    var t = setTimeout(function () { hide(el); hideTimers.delete(el); }, ms);
    hideTimers.set(el, t);
  }
  function stopAllRuns() {              // click-off cancels any dialogue (not the waterfall)
    dbg('stopAllRuns()');
    clearTimers();
    hideAll();
    currentScript = null;
    // Also stop ambient visuals:
    stopBubbles();
  }

  // Global click-off for dialogues (capture true beats overlays)
  document.addEventListener('click', (e) => {
    const insideHotspot = e.target.closest && e.target.closest('.hotspot');
    const insideBubble  = e.target.closest && e.target.closest('.speech-bubble');
    const insideCard    = e.target.closest && e.target.closest('#library-card');
    if (!insideHotspot && !insideBubble && !insideCard) stopAllRuns();
  }, true);

  // ========================================================
  // STAG — Waterfall Reveal (independent; always allowed)
  // ========================================================
  if (entrance && stagHot) {
    var GRACE_MS = 9000;                   // how long the waterfall stays visible
    var hideTimer = null;

    function showStagBubble() {
      if (!stagBubble) return;
      stagBubble.hidden = false;
      stagBubble.classList.add('show-bubble');
      stagHot.setAttribute('aria-expanded', 'true');
    }
    function hideStagBubble() {
      if (!stagBubble) return;
      stagBubble.classList.remove('show-bubble');
      stagBubble.hidden = true;
      stagHot.setAttribute('aria-expanded', 'false');
      entrance.classList.remove('show-threshold');
    }
    function restartReveal() {
      entrance.classList.remove('reveal');
      void entrance.offsetWidth; // force reflow
      entrance.classList.add('reveal');
    }
    function triggerReveal() {
      dbg('triggerReveal()');
      clearTimeout(hideTimer);
      entrance.classList.add('show-threshold');
      showStagBubble();
      if (cover) cover.hidden = false;
      if (scene) scene.hidden = false;
      restartReveal();
      hideTimer = setTimeout(function () {
        entrance.classList.remove('reveal');
        if (cover) cover.hidden = true;
        if (scene) scene.hidden = true;
        hideStagBubble();
      }, GRACE_MS);
    }

    // Hover shows bubble hint; click triggers reveal (independent of dialogues)
    stagHot.addEventListener('mouseenter', function () {
      entrance.classList.add('show-threshold');
      showStagBubble();
    });
    stagHot.addEventListener('mouseleave', function () {
      if (!entrance.classList.contains('reveal')) hideStagBubble();
    });
    stagHot.addEventListener('click', function (e) {
      e.preventDefault();
      triggerReveal();                // ALWAYS allowed; not gated by currentScript
    });
    stagHot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerReveal(); }
    });

    // Click-away closes waterfall immediately (stopAllRuns does NOT touch it)
    document.addEventListener('click', function (e) {
      if (e.target === stagHot || (stagBubble && stagBubble.contains(e.target))) return;
      entrance.classList.remove('reveal');
      if (cover) cover.hidden = true;
      if (scene) scene.hidden = true;
      hideStagBubble();
    });
  }

  // ========================================================
  // Timing knobs for dialogues
  // ========================================================
  var AUTO_HIDE_MS     = 5000;    // default bubble linger
  var CREST_HIDE_MS    = 22000;   // crest lines linger longer
  var CONSENT_HIDE_MS  = 8000;    // back-of-cat consent linger

  // ========================================================
  // CREST — EXACT canonical text + timings (exclusive)
  // ========================================================
  var crestPlaying = false;

  // --- Crest sequence (King explains the heraldry) ---
  function crestSequence(){
    if (window.bramblePlaying || currentScript === 'bramble') return;
    if (crestPlaying) return;
    crestPlaying = true;
    startSequence('crest');

    // use the dedicated crest bubble
    show(crestTxt, "Ah... the Crest of Shirzan. Each part tells a story...", CREST_HIDE_MS);

    timers.push(setTimeout(function(){ if (currentScript !== 'crest') return;
      show(crestTxt, "The dolphin — a symbol from the Kennedy clan — symbolizes strength, nobility, joy and freedom on the water.", CREST_HIDE_MS);
    }, 6000));

    timers.push(setTimeout(function(){ if (currentScript !== 'crest') return;
      show(crestTxt, "The helmet — meaning armored Chief and is derived from the Gaelic \"Cinneidigh\" later to become Kennedy.", CREST_HIDE_MS);
    }, 16000));
    
    timers.push(setTimeout(function(){ if (currentScript !== 'crest') return;
      show(crestTxt, "The crown honors my 21st great-grandfather, Robert the Bruce — the first King of Scotland and was crowned King March 25th, 1306.", CREST_HIDE_MS);
    }, 24000));

    timers.push(setTimeout(function(){ if (currentScript !== 'crest') return;
      show(crestTxt, "The red lion honors my 10th cousin 9x removed, C. S. Lewis, and the Chronicles of Narnia that inspired this realm.", CREST_HIDE_MS);
    }, 38000));

    timers.push(setTimeout(function(){ if (currentScript !== 'crest') return;
      show(crestTxt, "And here... 'Avise la fin' — our motto — 'Consider the end.' A reminder to live with foresight and wisdom and to always consider one's legacy.", CREST_HIDE_MS);
    }, 47000));

    var totalDuration = 40000 + CREST_HIDE_MS + 80;
    timers.push(setTimeout(function(){
      hide(crestTxt);
      crestPlaying = false;
      if (currentScript === 'crest') currentScript = null;
    }, totalDuration));
  }

  // ========================================================
  // ARMOR — Cat banter (exclusive)
  // ========================================================
  var armorPlaying = false;
  var armorCycle = 0;
  function armorSequence() {
    if (window.bramblePlaying || currentScript === 'bramble') return;
    if (currentScript && currentScript !== 'armor') return;      // exclusivity
    if (armorPlaying || currentScript === 'armor') return;

    currentScript = 'armor';
    armorPlaying = true;
    startSequence('armor');
    armorCycle += 1;

    // Clean slate
    clearTimers();
    hideAll();
    if (armorTxt) armorTxt.textContent = "Pardon me, good feline — could I trouble you for a cup of Civet coffee?";
    if (catTxt)   catTxt.textContent   = "";

    // 0) Armor opening
    show(armorTxt, "Pardon me, good feline — could I trouble you for a cup of Civet coffee?");

    // 1) Cat reply (t = 3s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(catTxt, "I'm processing. It will be a while, I just ate.");
    }, 3000));

    // 2) Armor quip (t = 6s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(armorTxt, "Ah, then perhaps a De-cat Red Squirrel Latte?");
    }, 6000));

    // 3) Cat mock outrage (t = 9s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(catTxt, "So you want something from the De-cat Red Squirrel Latte line? We don't serve your kind here...");
    }, 9000));

    // 4) Armor apology (t = 12s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(armorTxt, "I'm only joking.");
    }, 12000));

    // 5) Cat scripture (t = 15s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(catTxt, "Proverbs 26:18-19");
    }, 15000));

    // 6) Armor plays dumb (t = 18s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(armorTxt, "Is that from the book of Meow?");
    }, 18000));

    // 7) Cat punchline (t = 21s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'armor') return;
      show(catTxt, "Why don't you look it up? Brumble has your library card.");
    }, 21000));

    // wrap up
    var totalDuration = 21000 + AUTO_HIDE_MS + 100; // last line + default linger
    timers.push(setTimeout(function () {
      armorPlaying = false;
      if (currentScript === 'armor') currentScript = null;
      hideAll();
    }, totalDuration));
  }

  // ========================================================
  // CAT HEAD — quick tease (exclusive)
  // ========================================================
  var catPlaying = false;
  function catHeadSequence() {
    if (window.bramblePlaying || currentScript === 'bramble') return;
    if (currentScript && currentScript !== 'catHead') return;     // exclusivity
    if (catPlaying || currentScript === 'catHead') return;

    currentScript = 'catHead';
    catPlaying = true;
    startSequence('catHead');

    // Cat’s tease
    show(catTxt, "Hey Tin Man — weren't you going to be in the Mischief Players’ rendition of the Wizard of Odd?");

    // Armor’s comeback (t = 5s)
    timers.push(setTimeout(function () {
      if (currentScript !== 'catHead') return;
      show(armorTxt, "I tried out... but my heart was not in it.");
    }, 5000));

    // wrap up
    var totalDuration = 5000 + AUTO_HIDE_MS + 100; // last line + default linger
    timers.push(setTimeout(function () {
      catPlaying = false;
      if (currentScript === 'catHead') currentScript = null;
      hideAll();
    }, totalDuration));
  }

  // ========================================================
  // Back-of-cat consent (simple one-liner, not exclusive)
  // ========================================================
  function showConsent() {
    clearTimers();
    hideAll();
    show(consent, undefined, CONSENT_HIDE_MS);
  }

  // ========================================================
  // Bramble “kicked for integrity” flow (unchanged in spirit)
  // ========================================================
  function ejectForForbiddenScrolls(reason) {
    // Mute everything else
    window.armorPlaying = false;
    window.catPlaying = false;
    window.crestPlaying = false;
    window.kingPlaying = false;

    try {
      sessionStorage.setItem('kicked_by_scrolls', JSON.stringify({
        t: Date.now(),
        reason: reason || ""
      }));
    } catch (e) { /* noop */ }

    clearTimers();
    hideAll();

    startSequence('bramble');
    window.bramblePlaying = true;

    show(brambleTxt, "You broke your oath, and integrity matters. Now take another card.", 12000);

    // Optional King follow-up after 13s
    timers.push(setTimeout(function () {
      if (typeof kingTxt !== 'undefined' && kingTxt) {
        show(kingTxt, "Return with honor, and the door will open once more.", 12000);
      }
    }, 13000));

    // Finish after the King’s line has lingered
    var total = 13000 + 12000 + 100;
    timers.push(setTimeout(function () {
      hide(brambleTxt);
      if (typeof kingTxt !== 'undefined' && kingTxt) hide(kingTxt);
      window.bramblePlaying = false;
      if (currentScript === 'bramble') currentScript = null;
    }, total));
  }
  window.ejectForForbiddenScrolls = ejectForForbiddenScrolls;

  // ========================================================
  // HOTSPOT WIRING + BUBBLES START/STOP
  // ========================================================
  if (armorHot) {
    armorHot.addEventListener('mouseenter', () => { startBubbles(); armorSequence(); });
    armorHot.addEventListener('focus',      () => { startBubbles(); armorSequence(); });
    armorHot.addEventListener('mouseleave', () => { stopBubbles(); });
    armorHot.addEventListener('blur',       () => { stopBubbles(); });
  }
  if (crestHot) {
    crestHot.addEventListener('mouseenter', () => { startBubbles(); crestSequence(); });
    crestHot.addEventListener('focus',      () => { startBubbles(); crestSequence(); });
    crestHot.addEventListener('mouseleave', () => { stopBubbles(); });
    crestHot.addEventListener('blur',       () => { stopBubbles(); });
  }
  if (catHot) {
    catHot.addEventListener('mouseenter', () => { startBubbles(); catHeadSequence(); });
    catHot.addEventListener('focus',      () => { startBubbles(); catHeadSequence(); });
    catHot.addEventListener('mouseleave', () => { stopBubbles(); });
    catHot.addEventListener('blur',       () => { stopBubbles(); });
  }
  if (backHot && consent) {
    backHot.addEventListener('mouseenter', () => { startBubbles(); showConsent(); });
    backHot.addEventListener('focus',      () => { startBubbles(); showConsent(); });
    backHot.addEventListener('mouseleave', () => { stopBubbles(); });
    backHot.addEventListener('blur',       () => { stopBubbles(); });
  }

  // Click anywhere outside hotspots/bubbles/card stops ambient bubbles too (capture)
  document.addEventListener('click', (e) => {
    const insideHotspot = e.target.closest && e.target.closest('.hotspot');
    const insideBubble  = e.target.closest && e.target.closest('.speech-bubble');
    const insideCard    = e.target.closest && e.target.closest('#library-card');
    if (!insideHotspot && !insideBubble && !insideCard) stopBubbles();
  }, true);

  // ========================================================
  // Utility navigation (Dark Arts)
  // ========================================================
  function saveOath() {
    try { localStorage.setItem('oath_ok', '1'); } catch (e) { /* noop */ }
  }
  function enter() {
    saveOath();
    location.href = "restricted/dark-arts.html";
  }
  window.enter = enter;

// Function to show trio balloons sequentially
function showTrioBalloons() {
  // Show the wolf balloon
  document.querySelector('#wolf-balloon').style.display = "block";

  // Show the sheep balloon after 4 seconds
  setTimeout(function() {
    document.querySelector('#sheep-balloon').style.display = "block";
  }, 4000);  // 4000 milliseconds = 4 seconds

  // Show the donkey balloon after another 4 seconds
  setTimeout(function() {
    document.querySelector('#donkey-balloon').style.display = "block";
  }, 8000);  // 8000 milliseconds = 8 seconds
}

// Event listener to show the trio balloons when the trio hotspot is hovered
const trioHot = document.querySelector('.trio-hotspot');
if (trioHot) {
  trioHot.addEventListener('mouseenter', showTrioBalloons);
}
  })(); // closes the main IIFE
/* ===========================
   BALLOON EXCLUSIVITY PATCH
   =========================== */

let activeGroup = null; // tracks currently active balloon set

function showExclusive(groupName) {
  // hide everything first
  document.querySelectorAll('.speech-bubble.visible').forEach(el => {
    el.classList.remove('visible');
  });

  // show requested group
  const targetBubbles = document.querySelectorAll(`.speech-bubble[data-group="${groupName}"]`);
  if (targetBubbles.length > 0) {
    targetBubbles.forEach(el => el.classList.add('visible'));
    activeGroup = groupName;
  }
}

// Optional hide-all shortcut
function hideAllBalloons() {
  document.querySelectorAll('.speech-bubble.visible').forEach(el => {
    el.classList.remove('visible');
  });
  activeGroup = null;
}

// Hotspot hover/touch listeners
document.querySelectorAll('.hotspot').forEach(hs => {
  const group = hs.dataset.group || hs.dataset.balloon;
  if (!group) return;

  hs.addEventListener('mouseenter', () => showExclusive(group));
  hs.addEventListener('mouseleave', () => hideAllBalloons());
  hs.addEventListener('touchstart', e => {
    e.preventDefault();
    showExclusive(group);
    setTimeout(hideAllBalloons, 1200); // hides after short delay on touch
  });
});
