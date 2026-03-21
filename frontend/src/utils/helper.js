import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth change listeners array
let authChangeListeners = [];

// Notify all listeners when auth state changes
export const notifyAuthChange = (user) => {
  authChangeListeners.forEach(listener => listener(user));
};

// Subscribe to auth changes
export const onAuthChange = (callback) => {
  authChangeListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    authChangeListeners = authChangeListeners.filter(cb => cb !== callback);
  };
};

// Save token and user info
export const authenticate = async (data, next) => {
  try {
    const userData = {
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      id: data.user._id,
    };
    
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    // Notify listeners about auth change
    notifyAuthChange(userData);
    
    if (next) next();
  } catch (error) {
    console.error('Error storing auth data', error);
  }
};

// Get user info
export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user', error);
    return null;
  }
};

// Get JWT token
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token || null;
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

// Check if admin
export const isAdmin = async () => {
  const user = await getUser();
  return user && user.role === 'admin';
};

// Check if authenticated
export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

// Logout
export const logout = async (navigation) => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    
    // Notify listeners about auth change (user is now null)
    notifyAuthChange(null);
    
    // Navigate to Login screen if navigation object is provided
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  } catch (error) {
    console.error('Error logging out', error);
  }
};