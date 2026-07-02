'use strict';
require('dotenv').config();

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
};

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
  demoMode: bool(process.env.DEMO_MODE, true),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'changeme',
  },

  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    pageId: process.env.META_PAGE_ID || '',
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN || '',
    igBusinessId: process.env.META_IG_BUSINESS_ID || '',
  },

  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
  },

  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
    refreshToken: process.env.TIKTOK_REFRESH_TOKEN || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    smsNumber: process.env.TWILIO_SMS_NUMBER || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  },
};

// Helper: is a given integration configured with real credentials?
config.configured = {
  meta: !!(config.meta.pageAccessToken && (config.meta.pageId || config.meta.igBusinessId)),
  youtube: !!(config.youtube.clientId && config.youtube.refreshToken),
  tiktok: !!(config.tiktok.accessToken),
  twilioSms: !!(config.twilio.accountSid && config.twilio.authToken && config.twilio.smsNumber),
  twilioWhatsapp: !!(config.twilio.accountSid && config.twilio.authToken && config.twilio.whatsappNumber),
  google: !!(config.google.clientId && config.google.refreshToken),
};

module.exports = config;
