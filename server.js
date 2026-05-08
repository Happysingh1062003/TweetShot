import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Serve built frontend in production
if (isProd) {
  app.use(express.static(join(__dirname, 'dist'), {
    maxAge: '1d',
    etag: true,
  }));
}

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Token for syndication API
function genToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

// Fetch tweet data
app.get('/api/tweet/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, error: 'Invalid tweet ID' });

  // Try syndication API first
  try {
    const data = await fetchSyndication(id);
    return res.json({ success: true, data });
  } catch (e) {
    console.warn('[syndication]', e.message);
  }

  // Fallback: FxTwitter
  try {
    const data = await fetchFxTwitter(id);
    return res.json({ success: true, data });
  } catch (e) {
    console.warn('[fxtwitter]', e.message);
  }

  res.status(502).json({
    success: false,
    error: 'Could not fetch tweet. It may be private, deleted, or the API is temporarily unavailable.',
  });
});

// Image proxy (avoids CORS for html-to-image export)
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error(`${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch {
    res.status(502).json({ error: 'Failed to proxy image' });
  }
});

// SPA fallback in production
if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// --- Data Sources ---

async function fetchSyndication(id) {
  const url = `https://cdn.syndication.twimg.com/tweet-info/rest/v1/${id}?token=${genToken(id)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  console.log('[DEBUG] Raw syndication keys:', Object.keys(d));
  console.log('[DEBUG] User object:', JSON.stringify(d.user, null, 2));
  console.log('[DEBUG] Top-level verified fields:', {
    verified: d.verified, is_blue_verified: d.is_blue_verified,
    verified_type: d.verified_type, blue_verified: d.blue_verified,
  });
  return normalize(d);
}

async function fetchFxTwitter(id) {
  const r = await fetch(`https://api.fxtwitter.com/i/status/${id}`, {
    headers: { 'User-Agent': 'TweetShot/1.0' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  const t = d.tweet || d;
  console.log('[DEBUG FX] author:', JSON.stringify(t.author, null, 2));
  console.log('[DEBUG FX] tweet keys:', Object.keys(t));
  return normalizeFx(d);
}

function normalize(d) {
  const user = d.user || {};
  // Verification: check every known field
  const isVerified = !!(
    user.verified ||
    user.is_blue_verified ||
    user.ext_is_blue_verified ||
    user.ext_verified_type ||
    user.verified_type
  );
  // Verified type: "Blue", "Business", "Government"
  const verifiedType = user.ext_verified_type || user.verified_type || (user.is_blue_verified ? 'Blue' : '');
  // Affiliated organization label (e.g. company name)
  const affiliateLabel = user.affiliates_highlighted_label?.label?.badge?.url
    || user.professional?.category?.[0]?.name
    || '';
  const affiliateBadge = user.affiliates_highlighted_label?.label?.badge?.url
    || user.ext?.highlightedLabel?.r?.ok?.label?.badge?.url
    || '';

  return {
    id: d.id_str || String(d.id || ''),
    text: d.text || '',
    author: {
      name: user.name || 'Unknown',
      handle: user.screen_name || 'unknown',
      avatar: (user.profile_image_url_https || '').replace('_normal', '_400x400'),
      verified: isVerified,
      blueVerified: isVerified,
      verifiedType,
      affiliateLabel,
      affiliateBadge,
    },
    metrics: {
      likes: d.favorite_count || 0,
      retweets: d.retweet_count || 0,
      replies: d.conversation_count || d.reply_count || 0,
      views: parseInt(d.views?.count || d.ext_views?.count || '0', 10),
    },
    media: (d.photos || d.mediaDetails || []).map(m => ({
      type: m.type || 'photo',
      url: m.url || m.media_url_https || '',
      width: m.width || 0,
      height: m.height || 0,
    })),
    createdAt: d.created_at || new Date().toISOString(),
    source: (d.source || '').replace(/<[^>]*>/g, ''),
  };
}

function normalizeFx(d) {
  const t = d.tweet || d;
  const author = t.author || {};
  const v = author.verification || {};
  const isVerified = !!(v.verified || author.verified || author.is_blue_verified);
  const verifiedType = v.type || author.verified_type || '';
  return {
    id: t.id || '',
    text: t.text || '',
    author: {
      name: author.name || 'Unknown',
      handle: author.screen_name || author.id || 'unknown',
      avatar: (author.avatar_url || '').replace('_normal', '_400x400').replace('_200x200', '_400x400'),
      verified: isVerified,
      blueVerified: isVerified,
      verifiedType,
      affiliateLabel: '',
      affiliateBadge: '',
    },
    metrics: {
      likes: t.likes || 0,
      retweets: t.retweets || 0,
      replies: t.replies || 0,
      views: t.views || 0,
    },
    media: (t.media?.photos || t.media?.all || []).map(m => ({
      type: m.type || 'photo',
      url: m.url || '',
      width: m.width || 0,
      height: m.height || 0,
    })),
    createdAt: t.created_at || new Date().toISOString(),
    source: t.source || '',
  };
}

app.listen(PORT, () => {
  console.log(`\n  ⚡ TweetShot ${isProd ? '(production)' : '(dev)'}`);
  console.log(`  → http://localhost:${PORT}\n`);
});
