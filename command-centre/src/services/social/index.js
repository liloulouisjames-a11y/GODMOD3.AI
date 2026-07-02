'use strict';
// Social publishing adapters. Each returns { externalId } on success.
// When credentials are missing and DEMO_MODE=true, we simulate a successful
// publish so the scheduler/calendar can be exercised end-to-end.
const axios = require('axios');
const config = require('../../config');

const GRAPH = 'https://graph.facebook.com/v20.0';

function demoResult(platform) {
  return { externalId: `DEMO-${platform}-${Date.now()}`, demo: true };
}

// ---- Facebook (Page feed) -------------------------------------------------
async function postFacebook({ caption, mediaUrl }) {
  if (!config.configured.meta) {
    if (config.demoMode) return demoResult('facebook');
    throw new Error('Meta / Facebook not configured');
  }
  const { pageId, pageAccessToken } = config.meta;
  if (mediaUrl) {
    const res = await axios.post(`${GRAPH}/${pageId}/photos`, {
      url: mediaUrl,
      caption,
      access_token: pageAccessToken,
    });
    return { externalId: res.data.post_id || res.data.id };
  }
  const res = await axios.post(`${GRAPH}/${pageId}/feed`, {
    message: caption,
    access_token: pageAccessToken,
  });
  return { externalId: res.data.id };
}

// ---- Instagram (Graph API, 2-step container → publish) --------------------
async function postInstagram({ caption, mediaUrl }) {
  if (!config.configured.meta || !config.meta.igBusinessId) {
    if (config.demoMode) return demoResult('instagram');
    throw new Error('Instagram not configured (needs META_IG_BUSINESS_ID + image URL)');
  }
  if (!mediaUrl) throw new Error('Instagram requires an image/video URL');
  const { igBusinessId, pageAccessToken } = config.meta;
  const container = await axios.post(`${GRAPH}/${igBusinessId}/media`, {
    image_url: mediaUrl,
    caption,
    access_token: pageAccessToken,
  });
  const publish = await axios.post(`${GRAPH}/${igBusinessId}/media_publish`, {
    creation_id: container.data.id,
    access_token: pageAccessToken,
  });
  return { externalId: publish.data.id };
}

// ---- TikTok (Content Posting API — direct post) ---------------------------
async function postTikTok({ caption, mediaUrl }) {
  if (!config.configured.tiktok) {
    if (config.demoMode) return demoResult('tiktok');
    throw new Error('TikTok not configured');
  }
  // TikTok requires a hosted video URL. This uses the PULL_FROM_URL flow.
  const res = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      post_info: { title: caption, privacy_level: 'PUBLIC_TO_EVERYONE' },
      source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
    },
    { headers: { Authorization: `Bearer ${config.tiktok.accessToken}` } }
  );
  return { externalId: res.data?.data?.publish_id || 'tiktok-pending' };
}

// ---- YouTube (Data API v3 — uploads require OAuth + resumable upload) ------
async function postYouTube({ caption, mediaUrl }) {
  if (!config.configured.youtube) {
    if (config.demoMode) return demoResult('youtube');
    throw new Error('YouTube not configured');
  }
  // Full resumable upload is out of MVP scope; we surface a clear message so
  // the user knows to attach the OAuth flow. Demo mode covers local testing.
  throw new Error('YouTube upload requires resumable OAuth upload — configure in production.');
}

async function publish(platform, payload) {
  switch (platform) {
    case 'facebook':
      return postFacebook(payload);
    case 'instagram':
      return postInstagram(payload);
    case 'tiktok':
      return postTikTok(payload);
    case 'youtube':
      return postYouTube(payload);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

module.exports = { publish };
