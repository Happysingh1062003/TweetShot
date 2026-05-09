function genToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

async function fetchSyndication(id) {
  const url = `https://cdn.syndication.twimg.com/tweet-info/rest/v1/${id}?token=${genToken(id)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return normalize(d);
}

async function fetchFxTwitter(id) {
  const r = await fetch(`https://api.fxtwitter.com/i/status/${id}`, {
    headers: { 'User-Agent': 'TweetShot/1.0' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return normalizeFx(d);
}

function normalize(d) {
  const user = d.user || {};
  const isVerified = !!(
    user.verified || user.is_blue_verified || user.ext_is_blue_verified ||
    user.ext_verified_type || user.verified_type
  );
  const verifiedType = user.ext_verified_type || user.verified_type || (user.is_blue_verified ? 'Blue' : '');
  const affiliateLabel = user.affiliates_highlighted_label?.label?.badge?.url
    || user.professional?.category?.[0]?.name || '';
  const affiliateBadge = user.affiliates_highlighted_label?.label?.badge?.url
    || user.ext?.highlightedLabel?.r?.ok?.label?.badge?.url || '';

  return {
    id: d.id_str || String(d.id || ''),
    text: d.text || '',
    author: {
      name: user.name || 'Unknown',
      handle: user.screen_name || 'unknown',
      avatar: (user.profile_image_url_https || '').replace('_normal', '_400x400'),
      verified: isVerified, blueVerified: isVerified,
      verifiedType, affiliateLabel, affiliateBadge,
    },
    metrics: {
      likes: d.favorite_count || 0,
      retweets: d.retweet_count || 0,
      replies: d.conversation_count || d.reply_count || 0,
      views: parseInt(d.views?.count || d.ext_views?.count || '0', 10),
    },
    media: (d.photos || d.mediaDetails || (d.video?.poster ? [d.video] : [])).map(m => ({
      type: m.type || 'photo',
      url: m.url || m.media_url_https || m.poster || '',
      width: m.width || 0, height: m.height || 0,
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
      verified: isVerified, blueVerified: isVerified,
      verifiedType, affiliateLabel: '', affiliateBadge: '',
    },
    metrics: {
      likes: t.likes || 0, retweets: t.retweets || 0,
      replies: t.replies || 0, views: t.views || 0,
    },
    media: (t.media?.all || t.media?.photos || []).map(m => ({
      type: m.type || 'photo', url: m.thumbnail_url || m.url || '',
      width: m.width || 0, height: m.height || 0,
    })),
    createdAt: t.created_at || new Date().toISOString(),
    source: t.source || '',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  const { id } = req.query;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ success: false, error: 'Invalid tweet ID' });
  }

  // Try syndication first
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
}
