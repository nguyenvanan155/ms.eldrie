/* ms.eldrie.site - MSPlayer v1.0.2 (auto-init enhanced) */
(function () {
  const DEFAULT_SRC = "https://ms.eldrie.site/api/playlist.json";
  const state = {
    tracks: [],
    current: null,
    random: true,
    loopList: true,
    volume: 1,
    toggleNew: true // bật lại sẽ random bài khác
  };

  // ---- AUDIO (singleton) ----
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume  = state.volume;

  // ---- UTIL ----
  function pickNext() {
    const { tracks, current, random } = state;
    if (!tracks.length) return null;
    if (random) {
      const cand = current ? tracks.filter(t => t !== current) : tracks.slice();
      if (!cand.length) return current || tracks[0];
      return cand[Math.floor(Math.random() * cand.length)];
    } else {
      const i = current ? tracks.indexOf(current) : -1;
      return tracks[(i + 1) % tracks.length];
    }
  }

  function tryPlayAfterUserGesture() {
    const unlock = () => {
      audio.play().finally(() => {
        document.removeEventListener("click", unlock, { capture: true });
        document.removeEventListener("touchstart", unlock, { capture: true });
      });
    };
    document.addEventListener("click", unlock, { once: true, capture: true });
    document.addEventListener("touchstart", unlock, { once: true, capture: true });
  }

  // ---- CORE ----
  function playNext() {
    const next = pickNext();
    if (!next) return;
    state.current = next;
    audio.src = next;
    audio.play().catch(() => { tryPlayAfterUserGesture(); });
  }

  function playRandomDifferent() {
    if (!state.tracks.length) return;
    const candidates = state.current
      ? state.tracks.filter(t => t !== state.current)
      : state.tracks.slice();
    if (!candidates.length) return playNext();
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    state.current = next;
    audio.src = next;
    audio.play().catch(() => { tryPlayAfterUserGesture(); });
  }

  audio.addEventListener("ended", () => {
    if (!state.tracks.length) return;
    if (state.loopList || state.random || state.tracks.length > 1) playNext();
  });

  audio.addEventListener("error", () => {
    // thường do 404 hoặc CORS; im lặng
  });

  async function loadTracks(src) {
    const url = src || DEFAULT_SRC;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) { state.tracks = []; return; }
    const data = await res.json().catch(() => []);
    state.tracks = (Array.isArray(data) ? data : []).map(String);
  }

  function toggle() {
    if (audio.paused) {
      if (state.toggleNew) {
        playRandomDifferent();
      } else {
        if (!state.current) playNext();
        else audio.play().catch(() => { tryPlayAfterUserGesture(); });
      }
    } else {
      audio.pause();
    }
  }

  // ---- PUBLIC API ----
  window.MSPlayer = {
    async init(opts = {}) {
      const s = (document.currentScript && document.currentScript.dataset) || {};
      const src        = opts.source ?? s.source ?? DEFAULT_SRC;
      state.random     = (String(opts.random    ?? s.random    ?? "true") !== "false");
      state.loopList   = (String(opts.loop      ?? s.loop      ?? "true") !== "false");
      state.volume     = Math.min(1, Math.max(0, parseFloat(opts.volume ?? s.volume ?? "1") || 1));
      state.toggleNew  = (String(opts.toggleNew ?? s.toggleNew ?? "true") !== "false");
      audio.volume     = state.volume;

      // hỗ trợ data-toggle-button
      const toggleSel = opts.toggleButton ?? s.toggleButton ?? null;
      if (toggleSel) {
        const el = document.querySelector(toggleSel);
        if (el && !el.hasAttribute("data-ms")) el.setAttribute("data-ms", "toggle");
      }

      await loadTracks(src);

      if (String(opts.autoplay ?? s.autoplay ?? "false") === "true") {
        playNext();
      }

      // bind sự kiện
      document.querySelectorAll("[data-ms]").forEach(el => {
        const act = el.getAttribute("data-ms");
        if (act === "toggle") el.addEventListener("click", toggle);
        if (act === "next")   el.addEventListener("click", playNext);
      });
    },

    play()   { if (audio.paused) { if (!state.current) playNext(); else audio.play().catch(() => { tryPlayAfterUserGesture(); }); } },
    pause()  { if (!audio.paused) audio.pause(); },
    toggle,
    next:    playNext,
    async setSource(src) { await loadTracks(src); state.current = null; },
    setVolume(v) { const vv = Math.min(1, Math.max(0, Number(v) || 0)); audio.volume = vv; state.volume = vv; },
    setRandom(r) { state.random = !!r; },
    get status() { return { ...state, paused: audio.paused }; }
  };

  // ---- AUTO INIT ----
  try {
    const el = document.currentScript;
    const auto = el?.dataset?.autoInit === "true";
    const toggleBtn = el?.dataset?.toggleButton;
    const hasButton = document.querySelector("[data-ms]");
    if (auto || hasButton || toggleBtn) {
      const opts = {
        source: el?.dataset?.source,
        random: el?.dataset?.random,
        loop: el?.dataset?.loop,
        volume: el?.dataset?.volume,
        autoplay: el?.dataset?.autoplay,
        toggleButton: toggleBtn
      };
      window.MSPlayer.init(opts);
    }
  } catch (e) {
    console.warn("[MSPlayer] auto-init failed:", e);
  }
})();
