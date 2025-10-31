// Dark Arts — stable build
(() => {
  "use strict";

  // --- Helpers ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const stage = $("#stage");
  const hotspots = $$(".hotspot", stage);
  const balloons = $$(".balloon", stage);

  if (!stage || !hotspots.length || !balloons.length) {
    console.warn("[DarkArts] Missing stage/hotspots/balloons.");
    return;
  }

  // Map balloon name -> element (#balloon-name)
  const byName = new Map(
    balloons.map(el => [el.id.replace(/^balloon-/, ""), el])
  );

  // state for sequences
  let seqTimer = null;
  let currentSeq = null;
  let seqIndex = 0;

  const hideAll = () => {
    balloons.forEach(b => b.classList.remove("show"));
  };

  const showOne = (name) => {
    const el = byName.get(name.trim());
    if (el) el.classList.add("show");
  };

  const stopSequence = () => {
    if (seqTimer) clearTimeout(seqTimer);
    seqTimer = null;
    currentSeq = null;
    seqIndex = 0;
  };

  const playSequence = (names, delay = 2400) => {
    stopSequence();
    currentSeq = names.map(n => n.trim()).filter(Boolean);
    seqIndex = 0;

    const step = () => {
      if (!currentSeq || seqIndex >= currentSeq.length) {
        stopSequence();
        return;
      }
      hideAll();
      showOne(currentSeq[seqIndex++]);
      seqTimer = setTimeout(step, delay);
    };

    step();
  };

  // --- wire hotspots ---
  hotspots.forEach(btn => {
    const spec = (btn.dataset.balloon || "").trim();

    const isSequence = spec.includes(",");
    const parts = spec.split(",").map(s => s.trim()).filter(Boolean);

    btn.addEventListener("mouseenter", () => {
      if (isSequence) {
        playSequence(parts);
      } else {
        stopSequence();
        hideAll();
        if (spec) showOne(spec);
      }
    });

    btn.addEventListener("mouseleave", () => {
      stopSequence();
      hideAll();
    });

    // Optional: click to “lock” the last shown balloon (comment out if not wanted)
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      stopSequence();
      hideAll();
      if (isSequence) {
        // show the last in the list when clicked
        showOne(parts[parts.length - 1]);
      } else if (spec) {
        showOne(spec);
      }
    });
  });

  // Debug overlay toggle via ?debug=1
  if (new URLSearchParams(location.search).get("debug") === "1") {
    stage.classList.add("debug-hotspots");
  }
})();
