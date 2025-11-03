(function () {
  const script = document.currentScript;
  const hostBase = script.src.split('/autoplay-music.js')[0];

  // ⚙️ Cấu hình mặc định
  const config = {
    playlistUrl: hostBase + '/playlist.json', // tự tìm playlist.json cùng thư mục
    volume: 1,
    muted: true,
    display: 'mini',
    loop: false,           // ❌ không lặp bài cũ — sẽ phát bài khác ngẫu nhiên
    preload: 'metadata'
  };

  // 🔽 Load playlist
  fetch(config.playlistUrl)
    .then(r => r.json())
    .then(list => boot(list))
    .catch(() => console.warn('[autoplay-music] Không tải được playlist.json'));

  function boot(playlist) {
    if (!playlist || !playlist.length) return console.warn('[autoplay-music] Playlist rỗng');
    const audio = document.createElement('audio');
    audio.preload = config.preload;
    audio.crossOrigin = 'anonymous';
    audio.volume = config.volume;
    audio.muted = config.muted;
    document.body.appendChild(audio);

    // 🎶 Chọn ngẫu nhiên bài đầu
    let index = Math.floor(Math.random() * playlist.length);
    audio.src = playlist[index].src;
    console.log(`[autoplay-music] ▶️ Đang phát: ${playlist[index].title || playlist[index].src}`);

    // 🎶 Khi hết bài → chọn bài khác ngẫu nhiên
    audio.addEventListener('ended', () => {
      if (playlist.length > 1) {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * playlist.length);
        } while (nextIndex === index); // tránh trùng
        index = nextIndex;
        audio.src = playlist[index].src;
        audio.play().catch(()=>{});
        console.log(`[autoplay-music] 🔀 Tiếp theo: ${playlist[index].title || playlist[index].src}`);
      } else if (config.loop) {
        audio.currentTime = 0;
        audio.play();
      }
    });

    // 🎧 Phát an toàn (trình duyệt có thể chặn autoplay)
    const safePlay = () => {
      audio.play().catch(() => {
        audio.muted = true;
        audio.play().catch(() => {});
      });
    };
    safePlay();

    // 🔊 Nút mini bật/tắt tiếng
    if (config.display !== 'none') {
      const btn = document.createElement('button');
      btn.textContent = audio.muted ? '🔇' : '🔊';
      Object.assign(btn.style, {
        position: 'fixed',
        right: '15px',
        bottom: '15px',
        zIndex: '9999',
        border: '0',
        borderRadius: '50%',
        padding: '10px',
        background: '#111',
        color: '#fff',
        cursor: 'pointer',
        opacity: '0.8'
      });
      btn.onclick = () => {
        audio.muted = !audio.muted;
        btn.textContent = audio.muted ? '🔇' : '🔊';
        if (audio.paused) safePlay();
      };
      document.body.appendChild(btn);
    }

    // 🖱️ Bỏ mute khi người dùng click hoặc chạm
    const unlock = () => {
      if (audio.muted) {
        audio.muted = false;
        safePlay();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
  }
})();
