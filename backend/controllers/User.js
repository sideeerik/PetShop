const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/Cloudinary');
const admin = require('../utils/firebaseAdmin');

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

const buildGoogleAvatar = (name, email, picture, subject) => ({
  public_id: `google_${subject}`,
  url:
    picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || email.split('@')[0],
    )}&background=random&color=fff&size=150`,
});

// ========== REGISTER USER ========== 
exports.registerUser = async (req, res) => {
  try {
    console.log('📝 Register user request received');
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    console.log('✅ Basic validation passed');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const encodedName = encodeURIComponent(name);
    const avatarData = {
      public_id: 'avatar_' + Date.now(),
      url: `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=150`
    };

    const user = await User.create({
      name,
      email,
      password,
      avatar: avatarData,
      isVerified: true,
      isActive: true,
      authProvider: 'local'
    });
    res.status(201).json({
      success: true,
      message: 'Registration successful. You can now log in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        authProvider: user.authProvider
      }
    });

  } catch (error) {
    console.error('❌ REGISTER ERROR:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ========== LOGIN USER (LOCAL ONLY) ==========
exports.loginUser = async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body.email);
    const { email, password } = req.body;
    console.log('=== LOGIN REQUEST RECEIVED ===');
    console.log('Email:', email || 'missing');
    console.log('IP:', req.ip || 'unknown');
    console.log('User-Agent:', req.get('user-agent') || 'unknown');

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isActive) return res.status(403).json({ message: 'Your account is inactive. Please contact support.' });

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) return res.status(401).json({ message: 'Invalid email or password' });

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('✅ Login successful for:', email);
    res.status(200).json({ success: true, token, user: userResponse });

  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ========== GOOGLE LOGIN / REGISTER (DIRECT GOOGLE TOKEN) ==========
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    console.log('=== GOOGLE LOGIN REQUEST RECEIVED ===');
    console.log('Has ID token:', !!idToken);
    console.log('IP:', req.ip || 'unknown');
    console.log('User-Agent:', req.get('user-agent') || 'unknown');

    if (!process.env.GOOGLE_WEB_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Google authentication is not configured on the server',
      });
    }

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload?.sub) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google account data',
      });
    }

    if (payload.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: 'Google account email is not verified',
      });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const avatar = buildGoogleAvatar(name, email, payload.picture, payload.sub);

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: payload.sub,
        avatar,
        isVerified: true,
        isActive: true,
        authProvider: 'google',
      });
    } else {
      let shouldSave = false;

      if (!user.isVerified) {
        user.isVerified = true;
        shouldSave = true;
      }

      if (!user.avatar?.url) {
        user.avatar = avatar;
        shouldSave = true;
      }

      if (user.authProvider === 'google') {
        user.avatar = avatar;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save({ validateBeforeSave: false });
      }
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deleted. Please contact support.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact support.',
      });
    }

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      token,
      user: userResponse,
      message: 'Google authentication successful',
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Google authentication failed',
    });
  }
};

// ========== UPDATE PROFILE ==========
exports.updateProfile = async (req, res) => {
  try {
    console.log('📝 Update profile request for user:', req.user.id);
    console.log('User role:', req.user.role);
    console.log('Request body:', req.body);
    console.log('Has file:', !!req.file);

    // Get current user
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update data
    const updateData = {};
    
    // Handle name (required)
    if (req.body.name !== undefined) {
      const name = req.body.name?.trim();
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
      }
      updateData.name = name;
    }

    // Handle contact (optional)
    if (req.body.contact !== undefined) {
      const contact = req.body.contact?.trim() || '';
      // Validate contact number if provided
      if (contact && !/^(\+?\d{10,15})$/.test(contact)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid contact number'
        });
      }
      updateData.contact = contact;
    }

    // Handle address fields
    const addressFields = {};
    
    if (req.body.city !== undefined) {
      addressFields.city = req.body.city?.trim() || '';
    }
    
    if (req.body.barangay !== undefined) {
      addressFields.barangay = req.body.barangay?.trim() || '';
    }
    
    if (req.body.street !== undefined) {
      addressFields.street = req.body.street?.trim() || '';
    }
    
    if (req.body.zipcode !== undefined) {
      const zipcode = req.body.zipcode?.trim() || '';
      // Validate zipcode if provided
      if (zipcode && !/^[0-9]{4}$/.test(zipcode)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 4-digit zipcode'
        });
      }
      addressFields.zipcode = zipcode;
    }
    
    // Only add address if any field has value
    const hasAddressData = Object.values(addressFields).some(value => value !== '');
    if (hasAddressData) {
      updateData.address = addressFields;
    }

    // Handle avatar upload
    if (req.file) {
      console.log('🖼️ Uploading avatar...');
      
      // Delete old avatar if exists and not default
      if (currentUser.avatar?.public_id && !currentUser.avatar.url.includes('ui-avatars.com')) {
        try {
          await deleteFromCloudinary(currentUser.avatar.public_id);
        } catch (err) {
          console.warn('Could not delete old avatar:', err.message);
        }
      }

      // Upload new avatar
      const avatarResult = await uploadToCloudinary(req.file.path, 'rubbersense/avatars');
      updateData.avatar = {
        public_id: avatarResult.public_id,
        url: avatarResult.url
      };

      // Clean up temp file
      const fs = require('fs');
      fs.unlink(req.file.path, err => {
        if (err) console.warn('Failed to delete temp file:', err.message);
      });
    }

    // DO NOT ALLOW EMAIL CHANGES
    // If email is in request body, ignore it or return error
    if (req.body.email !== undefined && req.body.email !== currentUser.email) {
      console.warn('⚠️ User attempted to change email from', currentUser.email, 'to', req.body.email);
      return res.status(400).json({
        success: false,
        message: 'Email cannot be changed. Please contact support if you need to update your email.'
      });
    }

    console.log('Update data:', updateData);

    // If no data to update, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided to update'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      });
    }

    console.log('✅ Profile updated successfully for', updatedUser.role);
    
    res.status(200).json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('❌ UPDATE PROFILE ERROR:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Profile update failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// ========== GOOGLE LOGIN ==========
exports.firebaseGoogleAuth = async (req, res) => {
  try {
    console.log('🔥 Firebase Google auth attempt');
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required' });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid, name, picture } = decodedToken;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: uid,
        avatar: { public_id: `google_${uid}`, url: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email.split('@')[0])}&background=random&color=fff&size=150` },
        isVerified: true,
        isActive: true,
        firebaseUID: uid,
        authProvider: 'google'
      });
      console.log('✅ User auto-created for Google login');
    }

    if (user.isDeleted) return res.status(403).json({ message: 'Your account has been deleted. Please contact support.' });
    if (!user.isActive) return res.status(403).json({ message: 'Your account is inactive. Please contact support.' });

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({ success: true, token, user: userResponse, message: 'Google authentication successful' });

  } catch (error) {
    console.error('❌ FIREBASE GOOGLE AUTH ERROR:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed', error: error.message });
  }
};

// ========== FACEBOOK LOGIN ==========
exports.firebaseFacebookAuth = async (req, res) => {
  try {
    console.log('🔥 Firebase Facebook auth attempt');
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required' });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid, name, picture } = decodedToken;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: uid,
        avatar: { public_id: `facebook_${uid}`, url: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email.split('@')[0])}&background=random&color=fff&size=150` },
        isVerified: true,
        isActive: true,
        firebaseUID: uid,
        authProvider: 'facebook'
      });
      console.log('✅ User auto-created for Facebook login');
    }

    if (user.isDeleted) return res.status(403).json({ message: 'Your account has been deleted. Please contact support.' });
    if (!user.isActive) return res.status(403).json({ message: 'Your account is inactive. Please contact support.' });

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({ success: true, token, user: userResponse, message: 'Facebook authentication successful' });

  } catch (error) {
    console.error('❌ FIREBASE FACEBOOK AUTH ERROR:', error);
    res.status(500).json({ success: false, message: 'Facebook authentication failed', error: error.message });
  }
};
// ========== CHANGE PASSWORD ==========
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    // Fetch user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ CHANGE PASSWORD ERROR:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ========== SAVE PUSH TOKEN ==========
exports.savePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    console.log('📱 Saving push token for user:', userId);
    console.log('📱 Push token received:', pushToken ? pushToken.substring(0, 20) + '...' : 'none');

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    // Optional: Validate if it's an Expo push token
    const { Expo } = require('expo-server-sdk');
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn('⚠️ Warning: Token may not be a valid Expo push token:', pushToken);
    }

    // Save token to user - FIXED: Use findByIdAndUpdate with { new: true }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { pushToken: pushToken },
      { new: true }
    ).select('+pushToken'); // Explicitly select pushToken to verify

    console.log(`✅ Push token saved for user: ${userId}`);
    console.log('Saved token in DB:', updatedUser.pushToken ? updatedUser.pushToken.substring(0, 20) + '...' : 'none');

    res.status(200).json({
      success: true,
      message: 'Push notification token saved successfully',
      token: updatedUser.pushToken // Return the saved token for verification
    });

  } catch (error) {
    console.error('❌ Error saving push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========== GET USER PUSH TOKEN ==========
exports.getPushToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // FIXED: Use select('+pushToken') to include it
    const user = await User.findById(userId).select('+pushToken');

    console.log('📱 Getting push token for user:', userId);
    console.log('📱 Push token from DB:', user.pushToken ? 'exists' : 'none');
    if (user.pushToken) {
      console.log('Token value:', user.pushToken.substring(0, 20) + '...');
    }

    res.status(200).json({
      success: true,
      pushToken: user.pushToken || null
    });

  } catch (error) {
    console.error('❌ Error getting push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get push token'
    });
  }
};

// ========== REMOVE PUSH TOKEN ==========
exports.removePushToken = async (req, res) => {
  try {
    const userId = req.user.id;

    await User.findByIdAndUpdate(
      userId,
      { pushToken: null }
    );

    console.log(`✅ Push token removed for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Push notification token removed successfully'
    });

  } catch (error) {
    console.error('❌ Error removing push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push token'
    });
  }
};
