import axios from 'axios';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let configured = false;

export const configureGoogleAuth = () => {
  if (configured) {
    return;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Missing Google web client ID');
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });

  configured = true;
};

export const signInWithGoogle = async () => {
  if (!BACKEND_URL) {
    throw new Error('Missing backend URL');
  }

  configureGoogleAuth();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) {
    return null;
  }

  if (!response.data.idToken) {
    throw new Error('Google Sign-In did not return an ID token');
  }

  const result = await axios.post(`${BACKEND_URL}/api/v1/users/auth/google`, {
    idToken: response.data.idToken,
  });

  return result.data;
};

export const getGoogleAuthErrorMessage = (error) => {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Services is not available on this device.';
      case statusCodes.IN_PROGRESS:
        return 'Google sign-in is already in progress.';
      case statusCodes.SIGN_IN_CANCELLED:
        return null;
      default:
        break;
    }
  }

  return error.response?.data?.message || error.message || 'Google sign-in failed';
};
