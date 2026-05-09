import { toPng, toJpeg, toSvg } from 'html-to-image';

// ============================================
// STATE
// ============================================
const S = {
  tweet: null,
  bgType: 'gradient',
  bgGrad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  bgSolid: '#1a1a2e',
  bgRadius: 12,
  theme: 'light',
  cardRadius: 16,
  shadow: 40,
  border: false,
  padding: 48,
  cardWidth: 480,
  ratio: 'auto',
  fontScale: 1,
  showAvatar: true,
  showMetrics: true,
  showTime: true,
  showVerified: true,
  showXLogo: true,
  wmText: '',
  wmPos: 'bottom-right',
  fmt: 'png',
  scale: 2,
  preset: 'default',
};

// ============================================
// GRADIENTS
// ============================================
const GRADS = [
  { id: 'purple',  css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'ocean',   css: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { id: 'sunset',  css: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  { id: 'rose',    css: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)' },
  { id: 'emerald', css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'dark',    css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { id: 'peach',   css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'berry',   css: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 'fire',    css: 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)' },
  { id: 'sky',     css: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { id: 'noir',    css: 'linear-gradient(135deg, #434343 0%, #000 100%)' },
  { id: 'candy',   css: 'linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)' },
];

// ============================================
// PRESETS
// ============================================
const PRESETS = [
  { id: 'default',  name: 'Default',  dot: 'linear-gradient(135deg,#667eea,#764ba2)', s: { bgType:'gradient', bgGrad:GRADS[0].css, theme:'light', cardRadius:16, shadow:40, border:false, padding:48, bgRadius:12 } },
  { id: 'midnight', name: 'Midnight', dot: 'linear-gradient(135deg,#0f0c29,#302b63)', s: { bgType:'gradient', bgGrad:GRADS[5].css, theme:'dark',  cardRadius:16, shadow:60, border:false, padding:48, bgRadius:12 } },
  { id: 'sunset',   name: 'Sunset',   dot: 'linear-gradient(135deg,#f12711,#f5af19)', s: { bgType:'gradient', bgGrad:GRADS[2].css, theme:'light', cardRadius:20, shadow:50, border:false, padding:48, bgRadius:16 } },
  { id: 'clean',    name: 'Clean',    dot: '#ffffff',                                  s: { bgType:'solid',    bgSolid:'#f5f5f5',   theme:'light', cardRadius:12, shadow:15, border:true,  padding:32, bgRadius:8 } },
  { id: 'neon',     name: 'Neon',     dot: 'linear-gradient(135deg,#0a0a0a,#1a0030)',  s: { bgType:'solid',    bgSolid:'#0a0a0a',   theme:'dark',  cardRadius:16, shadow:80, border:true,  padding:48, bgRadius:12 } },
  { id: 'none',     name: 'No BG',    dot: 'none',                                     s: { bgType:'none',     theme:'light', cardRadius:16, shadow:20, border:false, padding:0, bgRadius:0 } },
];

// ============================================
// DEMO
// ============================================
const DEMO = {
  id: 'demo',
  text: 'Just shipped TweetShot! 🚀\n\nConvert any tweet into a beautiful screenshot.\n\nPaste a link → Pick a theme → Export.',
  author: { name: 'TweetShot', handle: 'tweetshot', avatar: '', verified: false, blueVerified: true },
  metrics: { likes: 2847, retweets: 891, replies: 156, views: 128400 },
  media: [],
  createdAt: new Date().toISOString(),
  source: '',
};

// ============================================
// HELPERS
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtNum = n => { if (typeof n !== 'number' || isNaN(n)) return '0'; if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'; if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K'; return n.toLocaleString(); };
const fmtDate = s => { try { const d = new Date(s); return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})+' · '+d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch { return s; } };
const hl = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/(https?:\/\/\S+)/g,'<a>$1</a>').replace(/(#\w+)/g,'<span class="hashtag">$1</span>').replace(/(@\w+)/g,'<span class="mention">$1</span>');

// Throttled apply using rAF
let _raf = 0;
function scheduleApply() { cancelAnimationFrame(_raf); _raf = requestAnimationFrame(apply); }

// ============================================
// DOM
// ============================================
const el = {
  url: $('#url-input'), gen: $('#gen-btn'),
  loading: $('#loading'), error: $('#error'), errMsg: $('#error-msg'), dismiss: $('#dismiss-err'),
  urlArea: $('#url-area'), emptyMsg: $('#empty'), wrap: $('#capture-wrap'), area: $('#capture-area'), card: $('#tweet-card'),
  bar: $('#export-bar'), menuBtn: $('#menu-btn'), sidebar: $('#sidebar'), backdrop: $('#sidebar-backdrop'),
  av: $('#tc-av'), name: $('#tc-name'), handle: $('#tc-handle'), badge: $('#tc-badge'),
  text: $('#tc-text'), media: $('#tc-media'), time: $('#tc-time'),
  metrics: $('#tc-metrics'), likes: $('#tc-likes'), rts: $('#tc-rts'), replies: $('#tc-replies'), views: $('#tc-views'),
  xlogo: $('#tc-xlogo'), wm: $('#wm'),
  // controls
  bgColor: $('#bg-color'), gc1: $('#gc1'), gc2: $('#gc2'), gAngle: $('#g-angle'), gAngleV: $('#g-angle-v'),
  bgRadius: $('#bg-radius'), bgRadiusV: $('#bg-radius-v'),
  cardRadius: $('#card-radius'), cardRadiusV: $('#card-radius-v'),
  shadow: $('#shadow'), shadowV: $('#shadow-v'),
  cardBorder: $('#card-border'),
  padding: $('#padding'), paddingV: $('#padding-v'),
  width: $('#width'), widthV: $('#width-v'),
  fontScale: $('#font-scale'), fontScaleV: $('#font-scale-v'),
  vAvatar: $('#v-avatar'), vMetrics: $('#v-metrics'), vTime: $('#v-time'), vVerified: $('#v-verified'), vXlogo: $('#v-xlogo'),
  wmText: $('#wm-text'),
  fmt: $('#exp-fmt'), scale: $('#exp-scale'),
  copy: $('#copy-btn'), dl: $('#dl-btn'),
};

// ============================================
// RENDER TWEET
// ============================================
function render(tweet) {
  S.tweet = tweet;
  // Avatar
  if (tweet.author.avatar) {
    el.av.src = `/api/proxy-image?url=${encodeURIComponent(tweet.author.avatar)}`;
  } else {
    el.av.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="22" fill="#1d9bf0"/><text x="22" y="29" text-anchor="middle" fill="#fff" font-size="18" font-family="sans-serif">${tweet.author.name.charAt(0)}</text></svg>`)}`;
  }
  el.av.alt = tweet.author.name;
  el.name.textContent = tweet.author.name;
  el.handle.textContent = `@${tweet.author.handle}`;

  // Verified badge with correct color
  const isVerified = tweet.author.verified || tweet.author.blueVerified;
  el.badge.style.display = isVerified ? 'inline-flex' : 'none';
  if (isVerified) {
    const vType = (tweet.author.verifiedType || '').toLowerCase();
    let badgeColor = '#1d9bf0'; // blue default
    if (vType === 'business' || vType === 'organization') badgeColor = '#e2b719'; // gold
    else if (vType === 'government') badgeColor = '#829aab'; // gray
    const badgeSvg = el.badge.querySelector('path');
    if (badgeSvg) badgeSvg.setAttribute('fill', badgeColor);
  }

  // Affiliate label (organization badge)
  const affiliateEl = document.getElementById('tc-affiliate');
  if (affiliateEl) {
    if (tweet.author.affiliateLabel) {
      affiliateEl.textContent = tweet.author.affiliateLabel;
      affiliateEl.style.display = '';
    } else {
      affiliateEl.style.display = 'none';
    }
  }

  el.text.innerHTML = hl(tweet.text);
  el.media.innerHTML = '';
  (tweet.media || []).forEach(m => {
    if (m.url && m.type === 'photo') {
      const img = document.createElement('img');
      img.src = `/api/proxy-image?url=${encodeURIComponent(m.url)}`;
      img.alt = 'Media';
      el.media.appendChild(img);
    }
  });
  el.time.textContent = fmtDate(tweet.createdAt);
  el.likes.textContent = fmtNum(tweet.metrics.likes);
  el.rts.textContent = fmtNum(tweet.metrics.retweets);
  el.replies.textContent = fmtNum(tweet.metrics.replies);
  el.views.textContent = fmtNum(tweet.metrics.views);
  el.urlArea.classList.add('has-tweet');
  el.wrap.style.display = 'flex';
  el.bar.style.display = 'flex';
  apply();
}

// ============================================
// APPLY STATE → DOM (called via rAF)
// ============================================
function apply() {
  const a = el.area, c = el.card;

  // Background
  a.classList.remove('transparent-bg');
  if (S.bgType === 'none') {
    a.style.background = 'transparent';
    a.classList.add('transparent-bg');
  } else if (S.bgType === 'gradient') {
    a.style.background = S.bgGrad;
  } else {
    a.style.background = S.bgSolid;
  }
  a.style.padding = S.padding + 'px';
  a.style.borderRadius = S.bgRadius + 'px';

  // Aspect ratio
  a.style.aspectRatio = S.ratio === 'auto' ? 'auto' : S.ratio.replace(':', '/');

  // Card
  c.className = S.theme !== 'light' ? `theme-${S.theme}` : '';
  c.style.borderRadius = S.cardRadius + 'px';
  c.style.width = S.cardWidth + 'px';
  const sa = S.shadow / 100;
  c.style.boxShadow = `0 ${2+sa*6}px ${8+sa*40}px rgba(0,0,0,${sa*0.5})`;
  c.style.border = S.border ? `1px solid ${S.theme==='light'?'rgba(0,0,0,.1)':'rgba(255,255,255,.12)'}` : 'none';
  c.style.fontSize = S.fontScale + 'rem';

  // Visibility
  el.av.style.display = S.showAvatar ? '' : 'none';
  el.metrics.style.display = S.showMetrics ? '' : 'none';
  el.time.style.display = S.showTime ? '' : 'none';
  el.badge.style.display = (S.showVerified && S.tweet && (S.tweet.author.verified || S.tweet.author.blueVerified)) ? 'inline-flex' : 'none';
  el.xlogo.style.display = S.showXLogo ? '' : 'none';

  // Watermark
  el.wm.textContent = S.wmText;
  el.wm.className = 'wm ' + S.wmPos;

  // Responsive scaling for mobile
  if (window.innerWidth <= 900) {
    const pad = window.innerWidth <= 480 ? 24 : 32;
    const availableWidth = window.innerWidth - pad;
    const targetWidth = S.cardWidth + (S.padding * 2);
    const scale = Math.min(1, availableWidth / targetWidth);
    el.wrap.style.transform = `scale(${scale.toFixed(3)})`;
    el.wrap.style.transformOrigin = 'center top';
  } else {
    el.wrap.style.transform = '';
    el.wrap.style.transformOrigin = '';
  }
}

// ============================================
// SYNC CONTROLS ← STATE
// ============================================
function sync() {
  el.bgColor.value = S.bgSolid;
  el.bgRadius.value = S.bgRadius; el.bgRadiusV.textContent = S.bgRadius;
  el.cardRadius.value = S.cardRadius; el.cardRadiusV.textContent = S.cardRadius;
  el.shadow.value = S.shadow; el.shadowV.textContent = S.shadow;
  el.cardBorder.checked = S.border;
  el.padding.value = S.padding; el.paddingV.textContent = S.padding;
  el.width.value = S.cardWidth; el.widthV.textContent = S.cardWidth;
  el.fontScale.value = S.fontScale; el.fontScaleV.textContent = S.fontScale + 'x';
  el.vAvatar.checked = S.showAvatar;
  el.vMetrics.checked = S.showMetrics;
  el.vTime.checked = S.showTime;
  el.vVerified.checked = S.showVerified;
  el.vXlogo.checked = S.showXLogo;
  el.wmText.value = S.wmText;
  // Groups
  $$('#theme-group button').forEach(b => b.classList.toggle('active', b.dataset.theme === S.theme));
  $$('#ratio-group button').forEach(b => b.classList.toggle('active', b.dataset.ratio === S.ratio));
  $$('#wm-group button').forEach(b => b.classList.toggle('active', b.dataset.pos === S.wmPos));
  $$('.grad-sw').forEach(b => b.classList.toggle('active', b.dataset.grad === S.bgGrad));
  $$('.preset-chip').forEach(b => b.classList.toggle('active', b.dataset.id === S.preset));
}

// ============================================
// GENERATE
// ============================================
async function generate() {
  const url = el.url.value.trim();
  if (!url) { render(DEMO); return; }
  const m = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/) || url.match(/^(\d{10,})$/);
  if (!m) { showErr('Invalid URL. Use a twitter.com or x.com link.'); return; }
  el.loading.style.display = 'flex';
  try {
    const r = await fetch(`/api/tweet/${m[1]}`);
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
    render(d.data);
  } catch (e) { showErr(e.message); }
  finally { el.loading.style.display = 'none'; }
}

function showErr(msg) { el.errMsg.textContent = msg; el.error.style.display = 'flex'; }

// ============================================
// EXPORT
// ============================================
async function exportImg(mode) {
  const node = el.area;
  const isTransparent = S.bgType === 'none';
  // Temporarily remove checkerboard class for export
  if (isTransparent) node.classList.remove('transparent-bg');

  const opts = { pixelRatio: S.scale, cacheBust: true, style: { borderRadius: '0' } };
  try {
    let url;
    if (S.fmt === 'svg') url = await toSvg(node, opts);
    else if (S.fmt === 'jpg') url = await toJpeg(node, { ...opts, quality: .95, backgroundColor: isTransparent ? '#fff' : undefined });
    else url = await toPng(node, opts);

    if (mode === 'copy') {
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      el.copy.classList.add('copied');
      el.copy.textContent = '✓ Copied';
      setTimeout(() => { el.copy.classList.remove('copied'); el.copy.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy'; }, 2000);
    } else {
      const a = document.createElement('a');
      a.download = `tweetshot-${S.tweet?.author?.handle||'tweet'}-${S.tweet?.id||'img'}.${S.fmt==='svg'?'svg':S.fmt}`;
      a.href = url;
      a.click();
    }
  } catch (e) { console.error(e); showErr('Export failed.'); }
  finally { if (isTransparent) node.classList.add('transparent-bg'); }
}

// ============================================
// INIT
// ============================================
function init() {
  // Gradient grid
  const grid = $('#grad-grid');
  // "None" swatch
  const noneSw = document.createElement('button');
  noneSw.className = 'grad-sw none-bg';
  noneSw.title = 'Transparent';
  noneSw.dataset.grad = 'none';
  noneSw.addEventListener('click', () => {
    S.bgType = 'none';
    $$('.grad-sw').forEach(x => x.classList.remove('active'));
    noneSw.classList.add('active');
    scheduleApply();
  });
  grid.appendChild(noneSw);

  GRADS.forEach(g => {
    const b = document.createElement('button');
    b.className = 'grad-sw';
    b.style.background = g.css;
    b.dataset.grad = g.css;
    b.title = g.id;
    if (g.css === S.bgGrad) b.classList.add('active');
    b.addEventListener('click', () => {
      S.bgType = 'gradient';
      S.bgGrad = g.css;
      $$('.grad-sw').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      scheduleApply();
    });
    grid.appendChild(b);
  });

  // Presets
  const pl = $('#preset-list');
  PRESETS.forEach(p => {
    const c = document.createElement('button');
    c.className = `preset-chip${p.id === S.preset ? ' active' : ''}`;
    c.dataset.id = p.id;
    const dotStyle = p.dot === 'none'
      ? 'background:repeating-conic-gradient(#666 0% 25%,#444 0% 50%) 50%/6px 6px'
      : (p.dot.startsWith('linear') ? `background:${p.dot}` : `background:${p.dot}`);
    c.innerHTML = `<span class="preset-dot" style="${dotStyle}"></span>${p.name}`;
    c.addEventListener('click', () => {
      S.preset = p.id;
      Object.assign(S, p.s);
      sync();
      scheduleApply();
    });
    pl.appendChild(c);
  });

  // Section toggles
  $$('.sec-head').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('open')));

  // Controls → State
  const bind = (id, key, parse = v=>v) => {
    const e = document.getElementById(id);
    if (!e) return;
    const ev = e.type === 'checkbox' ? 'change' : 'input';
    e.addEventListener(ev, () => {
      S[key] = e.type === 'checkbox' ? e.checked : parse(e.value);
      const vEl = document.getElementById(id + '-v');
      if (vEl) vEl.textContent = e.type === 'range' ? e.value + (key.includes('Scale') ? 'x' : '') : '';
      scheduleApply();
    });
  };

  bind('bg-radius', 'bgRadius', Number);
  bind('card-radius', 'cardRadius', Number);
  bind('shadow', 'shadow', Number);
  bind('card-border', 'border');
  bind('padding', 'padding', Number);
  bind('width', 'cardWidth', Number);
  bind('font-scale', 'fontScale', parseFloat);
  bind('v-avatar', 'showAvatar');
  bind('v-metrics', 'showMetrics');
  bind('v-time', 'showTime');
  bind('v-verified', 'showVerified');
  bind('v-xlogo', 'showXLogo');

  // Solid color
  el.bgColor.addEventListener('input', e => { S.bgType = 'solid'; S.bgSolid = e.target.value; $$('.grad-sw').forEach(x=>x.classList.remove('active')); scheduleApply(); });

  // Custom gradient
  const updGrad = () => {
    S.bgType = 'gradient';
    S.bgGrad = `linear-gradient(${el.gAngle.value}deg, ${el.gc1.value} 0%, ${el.gc2.value} 100%)`;
    el.gAngleV.textContent = el.gAngle.value + '°';
    $$('.grad-sw').forEach(x=>x.classList.remove('active'));
    scheduleApply();
  };
  el.gc1.addEventListener('input', updGrad);
  el.gc2.addEventListener('input', updGrad);
  el.gAngle.addEventListener('input', updGrad);

  // Button groups
  $$('#theme-group button').forEach(b => b.addEventListener('click', () => { S.theme = b.dataset.theme; $$('#theme-group button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); scheduleApply(); }));
  $$('#ratio-group button').forEach(b => b.addEventListener('click', () => { S.ratio = b.dataset.ratio; $$('#ratio-group button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); scheduleApply(); }));
  $$('#wm-group button').forEach(b => b.addEventListener('click', () => { S.wmPos = b.dataset.pos; $$('#wm-group button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); scheduleApply(); }));

  // Watermark text
  el.wmText.addEventListener('input', e => { S.wmText = e.target.value; scheduleApply(); });

  // Export
  el.fmt.addEventListener('change', e => S.fmt = e.target.value);
  el.scale.addEventListener('change', e => S.scale = +e.target.value);
  el.copy.addEventListener('click', () => exportImg('copy'));
  el.dl.addEventListener('click', () => exportImg('download'));

  // Generate
  el.gen.addEventListener('click', generate);
  el.url.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
  el.dismiss.addEventListener('click', () => el.error.style.display = 'none');

  // Mobile Menu
  const toggleMenu = () => {
    el.sidebar.classList.toggle('open');
    el.backdrop.classList.toggle('show');
  };
  el.menuBtn.addEventListener('click', toggleMenu);
  el.backdrop.addEventListener('click', toggleMenu);
  
  // Resize handler for scaling
  window.addEventListener('resize', scheduleApply);
}

document.addEventListener('DOMContentLoaded', init);
