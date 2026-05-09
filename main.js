import * as htmlToImage from 'html-to-image';

const el = {
  url: document.getElementById('url-input'),
  gen: document.getElementById('btn-gen'),
  paste: document.getElementById('btn-paste'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errMsg: document.getElementById('err-msg'),
  empty: document.getElementById('empty-msg'),
  dismiss: document.getElementById('btn-dismiss'),
  preview: document.getElementById('preview-section'),
  wrap: document.getElementById('capture-wrap'),
  capture: document.getElementById('capture-area'),
  card: document.getElementById('tweet-card'),
  exportBar: document.getElementById('export-bar'),
  dl: document.getElementById('btn-dl'),
  
  // Elements inside tweet card
  av: document.getElementById('tc-av'),
  name: document.getElementById('tc-name'),
  handle: document.getElementById('tc-handle'),
  badge: document.getElementById('tc-badge'),
  text: document.getElementById('tc-text'),
  media: document.getElementById('tc-media'),
  time: document.getElementById('tc-time'),
  likes: document.getElementById('tm-lik'),
  rts: document.getElementById('tm-ret'),
  replies: document.getElementById('tm-rep'),
  views: document.getElementById('tm-view'),
};

let currentData = null;
let lastWidth = window.innerWidth;

function init() {
  el.gen.addEventListener('click', generate);
  if (el.paste) el.paste.addEventListener('click', pasteUrl);
  el.url.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
  el.dismiss.addEventListener('click', () => el.error.style.display = 'none');
  el.dl.addEventListener('click', () => exportImg());
  window.addEventListener('resize', applyScale);
}

async function pasteUrl() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      el.url.value = text;
      // Automatically attempt to generate
      generate();
    }
  } catch (err) {
    console.error('Failed to read clipboard: ', err);
    showErr('Clipboard permission denied. Please paste manually.');
  }
}

async function generate() {
  const url = el.url.value.trim();
  if (!url) return;
  const m = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/) || url.match(/^(\d{10,})$/);
  if (!m) { showErr('Invalid URL. Use a twitter.com or x.com link.'); return; }
  
  el.loading.style.display = 'flex';
  try {
    const r = await fetch(`/api/tweet/${m[1]}`);
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Failed to fetch tweet.');
    render(d.data);
  } catch (e) { 
    showErr(e.message); 
  } finally { 
    el.loading.style.display = 'none'; 
  }
}

function showErr(msg) { 
  el.errMsg.textContent = msg; 
  el.error.style.display = 'flex'; 
}

function render(tweet) {
  currentData = tweet;
  document.body.classList.add('has-tweet');
  el.preview.style.display = 'flex';
  el.wrap.style.display = 'flex';
  el.wrap.style.flexDirection = 'column';
  el.wrap.style.alignItems = 'center';
  el.wrap.style.gap = '24px';
  el.exportBar.style.display = 'flex';

  // Avatar
  if (tweet.author.avatar) {
    el.av.src = `/api/proxy-image?url=${encodeURIComponent(tweet.author.avatar)}`;
    el.av.onload = applyScale;
  }
  el.av.alt = tweet.author.name;
  el.name.textContent = tweet.author.name;
  el.handle.textContent = `@${tweet.author.handle}`;

  // Verified
  const isVerified = tweet.author.verified || tweet.author.blueVerified;
  el.badge.style.display = isVerified ? 'inline-flex' : 'none';

  // Text
  el.text.innerHTML = hl(tweet.text);
  
  // Media
  el.media.innerHTML = '';
  (tweet.media || []).forEach(m => {
    if (m.url) {
      const img = document.createElement('img');
      img.onload = applyScale;
      img.src = `/api/proxy-image?url=${encodeURIComponent(m.url)}`;
      el.media.appendChild(img);
    }
  });

  // Footer
  el.time.textContent = fmtDate(tweet.createdAt);
  el.likes.textContent = fmtNum(tweet.metrics.likes);
  el.rts.textContent = fmtNum(tweet.metrics.retweets);
  el.replies.textContent = fmtNum(tweet.metrics.replies);
  el.views.textContent = fmtNum(tweet.metrics.views);



  applyScale();
}

function applyScale(e) {
  if (!currentData || !el.wrap) return;

  if (e && e.type === 'resize' && window.innerWidth <= 600 && window.innerWidth === lastWidth) {
    return;
  }
  lastWidth = window.innerWidth;

  if (window.innerWidth <= 600) {
    const availableWidth = window.innerWidth - 32;
    const targetWidth = 500; // Exact CSS width
    
    // Fit vertically
    const availableHeight = window.innerHeight - 200;
    const targetHeight = el.wrap.offsetHeight || 500;
    
    const scaleX = availableWidth / targetWidth;
    const scaleY = availableHeight / targetHeight;
    const scale = Math.min(1, scaleX, scaleY);
    
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    
    if (isFirefox) {
      el.wrap.style.transform = `scale(${scale})`;
      el.wrap.style.transformOrigin = 'top center';
      el.wrap.style.marginBottom = `-${(1 - scale) * el.wrap.offsetHeight}px`;
      el.wrap.style.zoom = '';
    } else {
      // Use zoom instead of transform to perfectly resize the layout footprint!
      el.wrap.style.zoom = scale.toFixed(3);
      el.wrap.style.transform = '';
      el.wrap.style.transformOrigin = '';
      el.wrap.style.marginLeft = '';
      el.wrap.style.marginBottom = '';
    }
  } else {
    el.wrap.style.zoom = '1';
    el.wrap.style.transform = '';
    el.wrap.style.transformOrigin = '';
    el.wrap.style.marginLeft = '';
    el.wrap.style.marginBottom = '';
  }
}

async function exportImg() {
  if (!currentData) return;
  const oTxt = el.dl.innerHTML;
  el.dl.innerHTML = '<svg class="spinner" viewBox="0 0 50 50" style="width:16px;height:16px;stroke:#fff"><circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle></svg> Downloading...';
  
  const oldZoom = el.wrap.style.zoom;
  const oldTransform = el.wrap.style.transform;
  const oldOrigin = el.wrap.style.transformOrigin;
  const oldMargin = el.wrap.style.marginBottom;
  
  // Temporarily remove scaling for perfect high-res export
  el.wrap.style.zoom = '1';
  el.wrap.style.transform = 'none';
  el.wrap.style.transformOrigin = 'initial';
  el.wrap.style.marginBottom = '0';
  
  // Wait a moment for layout to recalculate
  await new Promise(r => setTimeout(r, 50));
  
  try {
    const blob = await htmlToImage.toBlob(el.capture, {
      pixelRatio: 2,
      backgroundColor: null,
      style: { margin: 0, padding: 0 }
    });
    if (!blob) throw new Error('Blob empty');
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `tweet_${currentData.author.handle}_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(u);
  } catch (e) {
    showErr('Failed to download image.');
  } finally {
    el.wrap.style.zoom = oldZoom;
    el.wrap.style.transform = oldTransform;
    el.wrap.style.transformOrigin = oldOrigin;
    el.wrap.style.marginBottom = oldMargin;
    el.dl.innerHTML = oTxt;
  }
}

// Helpers
function hl(t) {
  return t
    .replace(/#(\w+)/g, '<span style="color:#1d9bf0">#$1</span>')
    .replace(/@(\w+)/g, '<span style="color:#1d9bf0">@$1</span>')
    .replace(/(https?:\/\/[^\s]+)/g, '<span style="color:#1d9bf0">$1</span>');
}
function fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n.toString();
}
function fmtDate(d) {
  const dt = new Date(d);
  if(isNaN(dt.getTime())) return '';
  let h = dt.getHours(), m = dt.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mt = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${h}:${m.toString().padStart(2,'0')} ${ampm} · ${mt[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

document.addEventListener('DOMContentLoaded', init);
