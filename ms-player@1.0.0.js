/* ms.eldrie.site - MSPlayer v1.0.0 */
(function () {
  const DEFAULT_SRC = "https://ms.eldrie.site/api/playlist.json";
  const state = { tracks: [], current: null, random: true, loopList: true, volume: 1 };

  // singleton audio
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume  = state.volume;

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

  function playNext() {
    const next = pickNext();
    if (!next) return;
    state.current = next;
    audio.src = next;
    audio.play().catch(() => {
      const unlock = () => {
        audio.play().finally(() => {
          document.removeEventListener("click", unlock, { capture: true });
          document.removeEventListener("touchstart", unlock, { capture: true });
        });
      };
      document.addEventListener("click", unlock, { once: true, capture: true });
      document.addEventListener("touchstart", unlock, { once: true, capture: true });
    });
  }

  audio.addEventListener("ended", () => {
    if (!state.tracks.length) return;
    if (state.loopList || state.random || state.tracks.length > 1) playNext();
  });

  async function loadTracks(src) {
    const url = src || DEFAULT_SRC;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    state.tracks = (Array.isArray(data) ? data : []).map(String);
  }

  function toggle() {
    if (audio.paused) {
      if (!state.current) playNext();
      else audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  // public API
  window.MSPlayer = {
    /** Khởi tạo từ thẻ <script data-...> (tự động nếu dùng data-auto-init) */
    async init(opts={}) {
      const s = document.currentScript && document.currentScript.dataset ? document.currentScript.dataset : {};
      const src      = opts.source ?? s.source ?? DEFAULT_SRC;
      state.random   = (String(opts.random ?? s.random ?? "true") !== "false");
      state.loopList = (String(opts.loop   ?? s.loop   ?? "true") !== "false");
      state.volume   = Math.min(1, Math.max(0, parseFloat(opts.volume ?? s.volume ?? "1") || 1));
      audio.volume   = state.volume;
      await loadTracks(src);
      if (String(opts.autoplay ?? s.autoplay ?? "false") === "true") {
        playNext();
      }
      document.querySelectorAll("[data-ms]").forEach(el => {
        const act = el.getAttribute("data-ms");
        if (act === "toggle") el.addEventListener("click", toggle);
        if (act === "next") el.addEventListener("click", playNext);
      });
    },
    play() { if (audio.paused) { if (!state.current) playNext(); else audio.play().catch(()=>{}); } },
    pause() { if (!audio.paused) audio.pause(); },
    toggle,
    next: playNext,
    async setSource(src) { await loadTracks(src); state.current = null; },
    setVolume(v) { const vv = Math.min(1, Math.max(0, +v||0)); audio.volume = vv; state.volume = vv; },
    setRandom(r) { state.random = !!r; },
    get status() { return { ...state, paused: audio.paused }; }
  };

  try {
    const el = document.currentScript;
    if (el && el.dataset && el.dataset.autoInit === "true") {
      window.MSPlayer.init();
    }
  } catch(_) {}
})();
