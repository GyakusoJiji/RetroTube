// Application State
let apiKey = localStorage.getItem('retrotube_api_key') || '';
let selectedVideoId = null;
let ytPlayer = null;
let isYoutubeAPIReady = false;
let clockInterval = null;
let hudTimeout = null;

// DOM Elements
const apiKeyInput = document.getElementById('youtube-api-key');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiStatusDot = document.getElementById('api-status-dot');
const apiStatusText = document.getElementById('api-status-text');

const searchQueryInput = document.getElementById('search-query');
const cutoffDateInput = document.getElementById('cutoff-date');
const searchSortSelect = document.getElementById('search-sort');
const searchBtn = document.getElementById('search-btn');
const resultsGrid = document.getElementById('results-grid');
const resultsCountText = document.getElementById('results-count');

const presetBtns = document.querySelectorAll('.preset-btn');
const btnCustomNow = document.getElementById('btn-custom-now');
const scanlineToggle = document.getElementById('scanline-toggle');
const crtScreen = document.getElementById('crt-screen');

const screenStatic = document.getElementById('screen-static');
const tvPowerLed = document.getElementById('tv-power-led');
const vcrSlot = document.getElementById('vcr-slot');
const vcrClockDisplay = document.getElementById('vcr-clock-display');
const crtHudStatus = document.getElementById('crt-hud-status');
const crtHudTimeDisplay = document.getElementById('crt-hud-time-display');

// VCR Controls
const btnPlay = document.getElementById('vcr-play');
const btnPause = document.getElementById('vcr-pause');
const btnStop = document.getElementById('vcr-stop');
const btnEject = document.getElementById('vcr-eject');
const volumeFader = document.getElementById('vcr-volume');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initAPIKeyUI();
  initDatePicker();
  initEvents();
  
  // Set default YouTube API ready callback
  window.onYouTubeIframeAPIReady = () => {
    isYoutubeAPIReady = true;
    console.log("YouTube IFrame API Loaded");
  };
  
  // Run initial search to show default results
  performSearch();
});

// 1. API Key UI Initialization & Actions
function initAPIKeyUI() {
  if (apiKey) {
    apiKeyInput.value = apiKey;
    setAPIMode(true);
  } else {
    setAPIMode(false);
  }
}

// Set mode visual updates
function setAPIMode(isActive) {
  if (isActive) {
    apiStatusDot.className = 'status-dot active-api';
    apiStatusText.innerHTML = '現在のモード: <span class="text-api">YouTube API LIVE</span>';
  } else {
    apiStatusDot.className = 'status-dot mock-mode';
    apiStatusText.innerHTML = '現在のモード: <span class="text-mock">タイムカプセル (MOCK)</span>';
  }
}

// 2. Date Picker Default Settings
function initDatePicker() {
  // Set default to 2007-01-01T00:00 (YouTube 黎明期)
  cutoffDateInput.value = "2007-01-01T00:00";
}

// 3. Bind Event Listeners
function initEvents() {
  // Save API Key
  saveApiKeyBtn.addEventListener('click', () => {
    const value = apiKeyInput.value.trim();
    if (value) {
      apiKey = value;
      localStorage.setItem('retrotube_api_key', apiKey);
      setAPIMode(true);
      alert('APIキーが保存されました。次回検索からYouTube APIを使用します。');
    } else {
      apiKey = '';
      localStorage.removeItem('retrotube_api_key');
      setAPIMode(false);
      alert('APIキーが消去されました。タイムカプセル(MOCK)モードに切り替えます。');
    }
    performSearch();
  });

  // Search trigger
  searchBtn.addEventListener('click', performSearch);
  searchQueryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Presets handling
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all presets except "Custom"
      presetBtns.forEach(b => b.classList.remove('active'));
      
      const dateVal = btn.getAttribute('data-date');
      if (dateVal) {
        btn.classList.add('active');
        cutoffDateInput.value = dateVal;
        performSearch();
      }
    });
  });

  btnCustomNow.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btnCustomNow.classList.add('active');
    
    // Set to current date-time
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    cutoffDateInput.value = localISOTime;
    
    performSearch();
  });

  // Scanline filter toggle
  scanlineToggle.addEventListener('change', () => {
    if (scanlineToggle.checked) {
      crtScreen.classList.remove('crt-disabled');
    } else {
      crtScreen.classList.add('crt-disabled');
    }
  });

  // VCR Actions
  btnPlay.addEventListener('click', playVideo);
  btnPause.addEventListener('click', pauseVideo);
  btnStop.addEventListener('click', stopVideo);
  btnEject.addEventListener('click', ejectVideo);
  
  volumeFader.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(val);
    }
  });
}

// 4. Perform Search (Queries C# Backend Proxy)
async function performSearch() {
  const query = searchQueryInput.value;
  const cutoffLocalStr = cutoffDateInput.value;
  
  // Format local datetime string to ISO format for search API
  let publishedBeforeISO = '';
  if (cutoffLocalStr) {
    const localDate = new Date(cutoffLocalStr);
    if (!isNaN(localDate.getTime())) {
      publishedBeforeISO = localDate.toISOString();
    }
  }

  resultsGrid.innerHTML = `
    <div class="no-results">
      <div class="static-text" style="font-size: 1.5rem;">SEARCHING...</div>
      <div class="static-subtext">時空を超えて動画を探索中...</div>
    </div>
  `;

  try {
    const url = new URL('/api/search', window.location.origin);
    url.searchParams.append('q', query);
    url.searchParams.append('order', searchSortSelect.value);
    if (publishedBeforeISO) {
      url.searchParams.append('before', publishedBeforeISO);
    }

    const headers = {};
    if (apiKey) {
      headers['X-YouTube-API-Key'] = apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.title || `HTTP error! status: ${response.status}`);
    }

    const videos = await response.json();
    renderResults(videos);
  } catch (error) {
    console.error("Search Error:", error);
    resultsGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">⚠️</div>
        <div class="no-results-text" style="color: var(--led-red);">APIエラーが発生しました</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
          ${error.message || 'APIキーが正しくないか、リクエスト制限に達している可能性があります。'}
        </div>
        <button id="error-fallback-btn" class="cyber-btn btn-magenta" style="margin-top: 15px; font-size: 0.8rem; padding: 6px 12px;">
          タイムカプセル(MOCK)モードで検索する
        </button>
      </div>
    `;
    
    // Bind click for error fallback button
    const fallbackBtn = document.getElementById('error-fallback-btn');
    if (fallbackBtn) {
      fallbackBtn.addEventListener('click', () => {
        apiKey = '';
        apiKeyInput.value = '';
        localStorage.removeItem('retrotube_api_key');
        setAPIMode(false);
        performSearch();
      });
    }
  }
}

// 6. Render Video Cards in grid
function renderResults(videos) {
  resultsCountText.innerText = `表示件数: ${videos.length}本`;

  if (videos.length === 0) {
    resultsGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📼</div>
        <div class="no-results-text">指定した期間に一致する動画が見つかりませんでした</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          別のキーワードや日付を選択してください。
        </div>
      </div>
    `;
    return;
  }

  resultsGrid.innerHTML = '';
  
  videos.forEach(video => {
    // Clean Title of HTML entities if any
    const title = decodeHtml(video.title);
    const pubDate = new Date(video.publishedAt);
    const formattedDate = `${pubDate.getFullYear()}/${String(pubDate.getMonth() + 1).padStart(2, '0')}/${String(pubDate.getDate()).padStart(2, '0')}`;

    const card = document.createElement('div');
    card.className = `video-card ${selectedVideoId === video.id ? 'selected' : ''}`;
    card.setAttribute('data-id', video.id);
    
    card.innerHTML = `
      <div class="card-thumbnail-wrapper">
        <img class="card-thumbnail" src="${video.thumbnails.medium.url}" alt="${title}" loading="lazy" />
        <div class="card-play-overlay">
          <div class="card-play-icon">▶</div>
        </div>
        <div class="card-date-badge">${formattedDate}</div>
      </div>
      <div class="card-content">
        <div class="card-title" title="${title}">${title}</div>
        <div class="card-channel">${video.channelTitle}</div>
        <div class="card-desc">${video.description || '詳細なし'}</div>
      </div>
    `;

    card.addEventListener('click', () => loadTape(video.id));
    resultsGrid.appendChild(card);
  });
}

// Helper to escape HTML characters from titles
function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// 7. Load Selected Video ("Insert Tape")
function loadTape(videoId) {
  selectedVideoId = videoId;
  
  // Highlight selected card
  document.querySelectorAll('.video-card').forEach(card => {
    if (card.getAttribute('data-id') === videoId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Close static overlay
  screenStatic.classList.add('hidden');
  
  // Update TV hardware LEDs
  tvPowerLed.classList.add('on');

  // Load VHS Cassette slot door state
  vcrSlot.classList.add('loaded');
  vcrSlot.querySelector('.vcr-slot-door').innerText = "📼 PLAYING...";

  // Enable VCR buttons & slider controls
  btnPlay.disabled = false;
  btnPause.disabled = false;
  btnStop.disabled = false;
  btnEject.disabled = false;
  volumeFader.disabled = false;

  // Initialize or reload YouTube player
  loadYouTubePlayer(videoId);
}

// 8. YouTube IFrame Player initialization/handling
function loadYouTubePlayer(videoId) {
  // Clear any existing timer loops
  if (clockInterval) clearInterval(clockInterval);
  resetHUD();

  if (ytPlayer) {
    try {
      ytPlayer.loadVideoById({
        videoId: videoId,
        startSeconds: 0
      });
      return;
    } catch (e) {
      console.log("Error loading video, re-creating player: ", e);
      // Fallback: destroy and recreate player
      ytPlayer.destroy();
      ytPlayer = null;
    }
  }

  // Create a brand new player
  const container = document.getElementById('yt-player-container');
  // Ensure container is empty
  container.innerHTML = '<div id="yt-player"></div>';

  ytPlayer = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,        // Hide native controls
      disablekb: 1,        // Disable keyboard shortcuts to force physical controls usage
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3
    },
    events: {
      onReady: (event) => {
        event.target.setVolume(volumeFader.value);
        playVideo();
      },
      onStateChange: onPlayerStateChange
    }
  });
}

// 9. Handle Player State changes
function onPlayerStateChange(event) {
  // States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
  const state = event.data;

  switch (state) {
    case YT.PlayerState.PLAYING:
      setActiveVCRButton(btnPlay);
      showHUD("PLAY");
      startClockTicker();
      break;

    case YT.PlayerState.PAUSED:
      setActiveVCRButton(btnPause);
      showHUD("PAUSE");
      stopClockTicker();
      break;

    case YT.PlayerState.ENDED:
      setActiveVCRButton(btnStop);
      showHUD("STOP");
      stopClockTicker();
      vcrClockDisplay.innerText = "00:00:00";
      break;

    case YT.PlayerState.BUFFERING:
      showHUD("LOAD");
      break;
  }
}

// 10. VCR Mechanical Playback Commands
function playVideo() {
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    ytPlayer.playVideo();
  }
}

function pauseVideo() {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    ytPlayer.pauseVideo();
  }
}

function stopVideo() {
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    ytPlayer.stopVideo();
    // In VCRs, stop rewinds tape slightly or resets counters
    if (typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(0, true);
    }
    setActiveVCRButton(btnStop);
    showHUD("STOP");
    stopClockTicker();
    vcrClockDisplay.innerText = "00:00:00";
    crtHudTimeDisplay.innerText = "00:00";
  }
}

// Eject Cassette: return TV to static noise mode and disable VCR interface
function ejectVideo() {
  stopVideo();
  selectedVideoId = null;
  
  // De-select cards
  document.querySelectorAll('.video-card').forEach(card => card.classList.remove('selected'));

  // Reset TV HUD/LEDs
  screenStatic.classList.remove('hidden');
  tvPowerLed.classList.remove('on');

  // Reset VHS Cassette slot door
  vcrSlot.classList.remove('loaded');
  vcrSlot.querySelector('.vcr-slot-door').innerText = "▲ EJECT TAPE FIRST";

  // Disable VCR button set
  btnPlay.disabled = true;
  btnPause.disabled = true;
  btnStop.disabled = true;
  btnEject.disabled = true;
  volumeFader.disabled = true;
  
  // Remove button states
  setActiveVCRButton(null);

  // Clear HUD
  resetHUD();
  
  // Reset Clock Counter
  vcrClockDisplay.innerText = "--:--:--";
  crtHudTimeDisplay.innerText = "00:00";

  // Destroy YouTube Player instance to release resource/audio
  if (ytPlayer) {
    try {
      ytPlayer.destroy();
    } catch(e) {
      console.log(e);
    }
    ytPlayer = null;
  }
}

// Helper to update mechanical button styling
function setActiveVCRButton(activeBtn) {
  [btnPlay, btnPause, btnStop].forEach(btn => btn.classList.remove('active'));
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// HUD Screen Display text (e.g. green "PLAY" overlay fading)
function showHUD(status) {
  if (hudTimeout) clearTimeout(hudTimeout);
  
  crtHudStatus.innerText = status;
  crtHudStatus.classList.add('visible');
  
  // Fade out HUD text after 2 seconds
  hudTimeout = setTimeout(() => {
    crtHudStatus.classList.remove('visible');
  }, 2000);
}

function resetHUD() {
  if (hudTimeout) clearTimeout(hudTimeout);
  crtHudStatus.classList.remove('visible');
}

// Clock/Tape Ticker routines
function startClockTicker() {
  if (clockInterval) clearInterval(clockInterval);
  
  clockInterval = setInterval(() => {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const curTime = ytPlayer.getCurrentTime() || 0;
      
      // Update HUD Mini Time
      const minutes = Math.floor(curTime / 60);
      const seconds = Math.floor(curTime % 60);
      crtHudTimeDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Update VCR VFD Display (HH:MM:SS)
      const hours = Math.floor(curTime / 3600);
      const remainingMin = Math.floor((curTime % 3600) / 60);
      const remainingSec = Math.floor(curTime % 60);
      
      // Create blinking dots effect
      const blink = Math.floor(curTime) % 2 === 0 ? ':' : ' ';
      
      const formattedClock = `${String(hours).padStart(2, '0')}:${String(remainingMin).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
      vcrClockDisplay.innerText = formattedClock;
    }
  }, 250);
}

function stopClockTicker() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}
