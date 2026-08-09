// Application State
let apiKey = localStorage.getItem('retrotube_api_key') || '';
let selectedVideoId = null;
let ytPlayer = null;
let isYoutubeAPIReady = false;
let clockInterval = null;
let osdTimeout = null;

// Year dial range (must match the min/max printed on the scale in index.html)
const DIAL_MIN = 1990;
const DIAL_MAX = 2026;

// Era names printed under the dial needle. Ordered oldest first.
const ERAS = [
  { until: 1995, name: 'インターネット前夜' },
  { until: 2001, name: 'Y2K前後' },
  { until: 2005, name: 'ブロードバンド普及' },
  { until: 2010, name: 'YouTube黎明期' },
  { until: 2016, name: '動画共有の黄金期' },
  { until: 2023, name: 'スマホ全盛' },
  { until: 9999, name: '現在' }
];

// DOM Elements
const apiKeyInput = document.getElementById('youtube-api-key');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiKeyNote = document.getElementById('api-key-note');
const apiStatusDot = document.getElementById('api-status-dot');
const apiStatusText = document.getElementById('api-status-text');

const searchQueryInput = document.getElementById('search-query');
const cutoffStartInput = document.getElementById('cutoff-start');
const cutoffEndInput = document.getElementById('cutoff-end');
const searchSortSelect = document.getElementById('search-sort');
const searchBtn = document.getElementById('search-btn');
const resultsGrid = document.getElementById('results-grid');
const resultsCountText = document.getElementById('results-count');

const dialFace = document.getElementById('dial-face');
const dialSpan = document.getElementById('dial-span');
const dialStart = document.getElementById('year-dial-start');
const dialEnd = document.getElementById('year-dial-end');
const dialYearText = document.getElementById('dial-year');
const dialEraText = document.getElementById('dial-era');
const btnNow = document.getElementById('btn-now');

const scanlineToggle = document.getElementById('scanline-toggle');
const screenFrame = document.querySelector('.screen-frame');
const screenStatic = document.getElementById('screen-static');
const tvPowerLed = document.getElementById('tv-power-led');
const vcrSlot = document.getElementById('vcr-slot');
const vcrClockDisplay = document.getElementById('vcr-clock-display');
const osdStatus = document.getElementById('crt-hud-status');
const osdTimeDisplay = document.getElementById('crt-hud-time-display');

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
  playWarmup();

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
  apiStatusDot.classList.toggle('on', isActive);
  apiStatusText.innerText = isActive
    ? 'YouTube APIで検索します'
    : '内蔵ライブラリで検索します';
}

// 2. Date Picker & Dial Default Settings
function initDatePicker() {
  // Default span: the pre-web years through the peak of video sharing
  applyDialToDates(1990, 2010);
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
      apiKeyNote.innerText = 'キーを保存しました。次の検索から使います。';
    } else {
      apiKey = '';
      localStorage.removeItem('retrotube_api_key');
      setAPIMode(false);
      apiKeyNote.innerText = 'キーを消去しました。内蔵ライブラリに戻します。';
    }
    performSearch();
  });

  // Search trigger
  searchBtn.addEventListener('click', performSearch);
  searchQueryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Year dial: the two needles bracket the years to search
  [dialStart, dialEnd].forEach(needle => {
    needle.addEventListener('input', () => {
      let start = parseInt(dialStart.value, 10);
      let end = parseInt(dialEnd.value, 10);

      // Needles cannot cross: the one being moved pushes the other
      if (start > end) {
        if (needle === dialStart) end = start;
        else start = end;
      }
      applyDialToDates(start, end);
    });
    needle.addEventListener('change', performSearch);
  });

  // Whichever needle the cursor is nearest comes to the top, so overlapping
  // needles stay grabbable
  dialFace.addEventListener('pointermove', (e) => {
    const rect = dialFace.getBoundingClientRect();
    const year = DIAL_MIN + ((e.clientX - rect.left) / rect.width) * (DIAL_MAX - DIAL_MIN);
    const toStart = Math.abs(year - parseInt(dialStart.value, 10));
    const toEnd = Math.abs(year - parseInt(dialEnd.value, 10));
    dialFace.classList.toggle('grab-end', toEnd < toStart);
  });

  // Typing exact datetimes moves the needles to match
  cutoffStartInput.addEventListener('input', syncDialFromDates);
  cutoffEndInput.addEventListener('input', syncDialFromDates);

  btnNow.addEventListener('click', () => {
    cutoffEndInput.value = toLocalInputValue(new Date());
    syncDialFromDates();
    performSearch();
  });

  // Scanline filter toggle
  scanlineToggle.addEventListener('change', () => {
    screenFrame.classList.toggle('crt-off', !scanlineToggle.checked);
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

// 4. Year Dial (the searched span, printed on a tuning scale)

// Turning the dial rewrites both datetime fields: whole years, end inclusive
function applyDialToDates(start, end) {
  cutoffStartInput.value = `${start}-01-01T00:00`;
  cutoffEndInput.value = `${end}-12-31T23:59`;
  dialStart.value = String(start);
  dialEnd.value = String(end);
  updateDialReadout(start, end);
}

// Typing a datetime moves the matching needle
function syncDialFromDates() {
  const startDate = new Date(cutoffStartInput.value);
  const endDate = new Date(cutoffEndInput.value);

  const start = isNaN(startDate.getTime()) ? DIAL_MIN : clampYear(startDate.getFullYear());
  const end = isNaN(endDate.getTime()) ? DIAL_MAX : clampYear(endDate.getFullYear());

  dialStart.value = String(Math.min(start, end));
  dialEnd.value = String(Math.max(start, end));
  updateDialReadout(parseInt(dialStart.value, 10), parseInt(dialEnd.value, 10));
}

function clampYear(year) {
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, year));
}

function eraOf(year) {
  return (ERAS.find(era => year < era.until) || ERAS[ERAS.length - 1]).name;
}

function updateDialReadout(start, end) {
  dialYearText.innerText = `${start}年 → ${end}年`;

  const from = eraOf(start);
  const to = eraOf(end);
  dialEraText.innerText = from === to ? from : `${from}〜${to}`;

  // Shade the years between the needles
  const span = DIAL_MAX - DIAL_MIN;
  dialSpan.style.left = `${((start - DIAL_MIN) / span) * 100}%`;
  dialSpan.style.width = `${((end - start) / span) * 100}%`;
}

// Format a Date for a datetime-local input, in local time
function toLocalInputValue(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date - tzOffset).toISOString().slice(0, 16);
}

// 5. CRT warm-up on first paint
function playWarmup() {
  screenFrame.classList.add('warmup');
  setTimeout(() => screenFrame.classList.remove('warmup'), 800);
}

// 6. Perform Search (Queries C# Backend Proxy)
async function performSearch() {
  const query = searchQueryInput.value;

  // Format local datetime strings to ISO for the search API
  const publishedAfterISO = toISO(cutoffStartInput.value);
  const publishedBeforeISO = toISO(cutoffEndInput.value);

  resultsGrid.innerHTML = `
    <div class="notice">
      <p class="notice-main">検索中</p>
      <p class="notice-sub">${escapeHtml(describeSpan())}の動画を探しています</p>
    </div>
  `;

  try {
    const url = new URL('/api/search', window.location.origin);
    url.searchParams.append('q', query);
    url.searchParams.append('order', searchSortSelect.value);
    if (publishedAfterISO) {
      url.searchParams.append('after', publishedAfterISO);
    }
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
    resultsCountText.innerText = '0本';
    resultsGrid.innerHTML = `
      <div class="notice">
        <p class="notice-main">検索できませんでした</p>
        <p class="notice-sub">${escapeHtml(error.message || 'APIキーが正しくないか、リクエスト上限に達しています。')}</p>
        <button type="button" id="error-fallback-btn" class="key">内蔵ライブラリで検索する</button>
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
        apiKeyNote.innerText = 'キーを消去しました。内蔵ライブラリに戻します。';
        performSearch();
      });
    }
  }
}

// Convert a datetime-local value to an ISO timestamp ('' when unset/invalid)
function toISO(localValue) {
  if (!localValue) return '';
  const date = new Date(localValue);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

// "1990年〜2010年" for status messages
function describeSpan() {
  return `${dialStart.value}年〜${dialEnd.value}年`;
}

// 7. Render Tape Listings
function renderResults(videos) {
  resultsCountText.innerText = `${videos.length}本`;

  if (videos.length === 0) {
    resultsGrid.innerHTML = `
      <div class="notice">
        <p class="notice-main">該当するテープがありません</p>
        <p class="notice-sub">キーワードを短くするか、年代ダイヤルの幅を広げてください。</p>
      </div>
    `;
    return;
  }

  resultsGrid.innerHTML = '';

  videos.forEach(video => {
    // Clean Title of HTML entities if any
    const title = decodeHtml(video.title);
    const pubDate = new Date(video.publishedAt);
    const formattedDate = `${pubDate.getFullYear()}.${String(pubDate.getMonth() + 1).padStart(2, '0')}.${String(pubDate.getDate()).padStart(2, '0')}`;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `tape ${selectedVideoId === video.id ? 'selected' : ''}`;
    card.setAttribute('data-id', video.id);

    card.innerHTML = `
      <span class="tape-thumb">
        <img src="${video.thumbnails.medium.url}" alt="" loading="lazy" />
        <span class="tape-date">${formattedDate}</span>
        <span class="tape-state">再生中</span>
      </span>
      <span class="tape-body">
        <span class="tape-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
        <span class="tape-channel">${escapeHtml(video.channelTitle)}</span>
        <span class="tape-desc">${escapeHtml(video.description || '説明なし')}</span>
      </span>
    `;

    card.addEventListener('click', () => loadTape(video.id));
    resultsGrid.appendChild(card);
  });
}

// Helper to decode HTML entities coming from the YouTube API
function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// Helper to escape text before injecting it into markup
function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text ?? '';
  return div.innerHTML;
}

// 8. Load Selected Video ("Insert Tape")
function loadTape(videoId) {
  selectedVideoId = videoId;

  // Highlight selected tape
  document.querySelectorAll('.tape').forEach(card => {
    card.classList.toggle('selected', card.getAttribute('data-id') === videoId);
  });

  // Close static overlay and show the tape counter on screen
  screenStatic.classList.add('hidden');
  osdTimeDisplay.classList.add('visible');

  // Update TV hardware lamps
  tvPowerLed.classList.add('on');

  // Load VHS Cassette slot door state
  vcrSlot.classList.add('loaded');

  // Enable VCR buttons & slider controls
  btnPlay.disabled = false;
  btnPause.disabled = false;
  btnStop.disabled = false;
  btnEject.disabled = false;
  volumeFader.disabled = false;

  // Initialize or reload YouTube player
  loadYouTubePlayer(videoId);
}

// 9. YouTube IFrame Player initialization/handling
function loadYouTubePlayer(videoId) {
  // Clear any existing timer loops
  if (clockInterval) clearInterval(clockInterval);
  resetOSD();

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

// 10. Handle Player State changes
function onPlayerStateChange(event) {
  // States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
  const state = event.data;

  switch (state) {
    case YT.PlayerState.PLAYING:
      setActiveVCRButton(btnPlay);
      showOSD("PLAY");
      startClockTicker();
      break;

    case YT.PlayerState.PAUSED:
      setActiveVCRButton(btnPause);
      showOSD("PAUSE");
      stopClockTicker();
      break;

    case YT.PlayerState.ENDED:
      setActiveVCRButton(btnStop);
      showOSD("STOP");
      stopClockTicker();
      vcrClockDisplay.innerText = "00:00:00";
      break;

    case YT.PlayerState.BUFFERING:
      showOSD("LOAD");
      break;
  }
}

// 11. VCR Mechanical Playback Commands
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
    showOSD("STOP");
    stopClockTicker();
    vcrClockDisplay.innerText = "00:00:00";
    osdTimeDisplay.innerText = "00:00";
  }
}

// Eject Cassette: return TV to no-signal mode and disable the deck
function ejectVideo() {
  stopVideo();
  selectedVideoId = null;

  // De-select tapes
  document.querySelectorAll('.tape').forEach(card => card.classList.remove('selected'));

  // Reset TV screen and lamps
  screenStatic.classList.remove('hidden');
  osdTimeDisplay.classList.remove('visible');
  tvPowerLed.classList.remove('on');

  // Reset VHS Cassette slot door
  vcrSlot.classList.remove('loaded');

  // Disable VCR button set
  btnPlay.disabled = true;
  btnPause.disabled = true;
  btnStop.disabled = true;
  btnEject.disabled = true;
  volumeFader.disabled = true;

  // Remove button states
  setActiveVCRButton(null);

  // Clear OSD
  resetOSD();

  // Reset Counter
  vcrClockDisplay.innerText = "--:--:--";
  osdTimeDisplay.innerText = "00:00";

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

// On-screen display text (PLAY / PAUSE / STOP, top-left of the tube)
function showOSD(status) {
  if (osdTimeout) clearTimeout(osdTimeout);

  osdStatus.innerText = status;
  osdStatus.classList.add('visible');

  // Fade out after 2 seconds, like a real OSD
  osdTimeout = setTimeout(() => {
    osdStatus.classList.remove('visible');
  }, 2000);
}

function resetOSD() {
  if (osdTimeout) clearTimeout(osdTimeout);
  osdStatus.classList.remove('visible');
}

// Tape counter routines
function startClockTicker() {
  if (clockInterval) clearInterval(clockInterval);

  clockInterval = setInterval(() => {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const curTime = ytPlayer.getCurrentTime() || 0;

      // Update on-screen mini time
      const minutes = Math.floor(curTime / 60);
      const seconds = Math.floor(curTime % 60);
      osdTimeDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Update the VFD counter (HH:MM:SS)
      const hours = Math.floor(curTime / 3600);
      const remainingMin = Math.floor((curTime % 3600) / 60);
      const remainingSec = Math.floor(curTime % 60);

      vcrClockDisplay.innerText = `${String(hours).padStart(2, '0')}:${String(remainingMin).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
    }
  }, 250);
}

function stopClockTicker() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}
