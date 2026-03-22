function formatUserRecipient(user) {
  return {
    userId: user?._id?.toString?.() || user?._id || 'unknown',
    name: user?.name || 'Unknown',
    email: user?.email || 'no-email',
    hasPushToken: !!user?.pushToken,
    pushTokenPreview: user?.pushToken ? `${user.pushToken.substring(0, 20)}...` : 'none',
  };
}

function logNotificationRecipients(context, users = []) {
  const normalizedUsers = Array.isArray(users) ? users : [users];
  const eligibleUsers = normalizedUsers.filter((user) => user && user.pushToken);

  console.log(`\n========== NOTIFICATION RECIPIENTS: ${context} ==========`);

  if (eligibleUsers.length === 0) {
    console.log('No users with saved push tokens are eligible for this notification.');
    console.log('========================================================\n');
    return;
  }

  console.log(`Eligible recipients with saved push tokens: ${eligibleUsers.length}`);

  eligibleUsers.forEach((user, index) => {
    const formatted = formatUserRecipient(user);
    console.log(
      `${index + 1}. ${formatted.name} <${formatted.email}> | userId=${formatted.userId} | token=${formatted.pushTokenPreview}`
    );
  });

  console.log('========================================================\n');
}

module.exports = {
  logNotificationRecipients,
};
