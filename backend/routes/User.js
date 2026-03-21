const express = require('express');
const { uploadWithJson } = require('../utils/Multer');
const {
  registerUser,
  loginUser,
  googleAuth,
  updateProfile,
  firebaseGoogleAuth,
  firebaseFacebookAuth,
  changePassword,
  savePushToken,
  removePushToken,
  getPushToken
} = require('../controllers/User');

const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

// ================= AUTH =================
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/auth/google', googleAuth);

// ================= PROFILE =================
router.get('/me', isAuthenticatedUser, async (req, res) => {
  const user = await require('../models/User').findById(req.user.id);
  res.status(200).json({ success: true, user });
});

// UPDATE PROFILE
router.put('/me/update', isAuthenticatedUser, uploadWithJson, updateProfile);

// ================= FIREBASE AUTH =================
router.post('/firebase/auth/google', firebaseGoogleAuth);
router.post('/firebase/auth/facebook', firebaseFacebookAuth);

// ================= CHANGE PASSWORD =================
router.put('/change-password', isAuthenticatedUser, changePassword);

// ================= PUSH NOTIFICATIONS =================
router.post('/push-token', isAuthenticatedUser, savePushToken);
router.delete('/push-token', isAuthenticatedUser, removePushToken);
router.get('/push-token', isAuthenticatedUser, getPushToken);


module.exports = router;
