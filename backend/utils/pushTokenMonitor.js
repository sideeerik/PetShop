const mongoose = require('mongoose');
const User = require('../models/User');

const MONITOR_INTERVAL_MS = 5 * 60 * 1000;

async function logCurrentPushTokens() {
  const timestamp = new Date().toISOString();

  if (mongoose.connection.readyState !== 1) {
    console.log(`[PushTokenMonitor][${timestamp}] Database not connected yet, skipping check.`);
    return;
  }

  try {
    const usersWithTokens = await User.find({
      pushToken: { $exists: true, $ne: null },
    }).select('name email +pushToken');

    if (usersWithTokens.length === 0) {
      console.log(`[PushTokenMonitor][${timestamp}] No push token detected.`);
      return;
    }

    console.log(
      `[PushTokenMonitor][${timestamp}] Push token detected for ${usersWithTokens.length} user(s).`
    );

    usersWithTokens.forEach((user, index) => {
      const tokenPreview = user.pushToken
        ? `${user.pushToken.substring(0, 20)}...`
        : 'none';

      console.log(
        `[PushTokenMonitor] ${index + 1}. Owner: ${user.name || 'Unknown'} <${user.email || 'no-email'}> | Token: ${tokenPreview}`
      );
    });
  } catch (error) {
    console.error('[PushTokenMonitor] Error while checking push tokens:', error);
  }
}

function startPushTokenMonitor() {
  logCurrentPushTokens();
  setInterval(logCurrentPushTokens, MONITOR_INTERVAL_MS);
}

module.exports = startPushTokenMonitor;
