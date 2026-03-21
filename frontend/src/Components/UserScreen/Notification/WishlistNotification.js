// CVPetShop/frontend/src/Components/UserScreen/Notification/WishlistNotification.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  AppState,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const STORAGE_KEY = '@wishlist_notifications';

export default function WishlistNotification() {
  const navigation = useNavigation();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenStatus, setTokenStatus] = useState('Not registered');
  const [debugInfo, setDebugInfo] = useState('');
  
  const notificationListener = useRef();
  const responseListener = useRef();
  const appState = useRef(AppState.currentState);

  // Load saved notifications on mount
  useEffect(() => {
    loadSavedNotifications();
    checkTokenStatus();
    setupNotificationListeners();

    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cleanupListeners();
      subscription.remove();
    };
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedNotifications();
      checkTokenStatus();
    }, [])
  );

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App came to foreground');
      loadSavedNotifications();
      checkTokenStatus();
    }
    appState.current = nextAppState;
  };

  const setupNotificationListeners = () => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received in foreground:', notification);
      handleNewNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      handleNotificationResponse(response);
    });
  };

  const cleanupListeners = () => {
    if (notificationListener.current) {
      notificationListener.current.remove();
    }
    if (responseListener.current) {
      responseListener.current.remove();
    }
  };

  const handleNewNotification = async (notification) => {
    setNotifications(prev => [notification, ...prev]);
    
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = existing ? JSON.parse(existing) : [];
      const updated = [notification, ...saved].slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  const loadSavedNotifications = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationResponse = (response) => {
    const data = response.notification?.request?.content?.data || 
                 response.notification?.data || {};
    
    if (data && data.type === 'WISHLIST_RESTOCK' && data.productId) {
      navigation.navigate('SingleProduct', { 
        productId: data.productId,
        fromNotification: true 
      });
    } else {
      navigation.navigate('NotificationDetails', {
        notification: response.notification,
        type: 'wishlist'
      });
    }
  };

  const checkTokenStatus = async () => {
    try {
      const authToken = await getToken();
      if (!authToken) {
        setTokenStatus('❌ Not logged in');
        return;
      }

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/users/push-token`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.data.pushToken) {
        setTokenStatus('✅ Registered');
        setExpoPushToken(response.data.pushToken);
      } else {
        setTokenStatus('❌ No token in DB');
      }
    } catch (error) {
      setTokenStatus('❌ Error checking');
      console.error('Error checking token status:', error);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    setDebugInfo('Starting registration...');
    console.log('========== PUSH NOTIFICATION REGISTRATION ==========');
    
    try {
      if (!Device.isDevice) {
        Alert.alert('Error', 'Must use physical device for push notifications');
        setDebugInfo('❌ Not a physical device');
        return;
      }
      console.log('✅ Physical device detected');
      setDebugInfo('✅ Device check passed');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Permission request result:', status);
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Enable notifications to receive wishlist restock alerts',
          [{ text: 'OK' }]
        );
        setDebugInfo('❌ Permissions denied');
        return;
      }
      console.log('✅ Notification permissions granted');
      setDebugInfo('✅ Permissions granted');

      if (Platform.OS === 'android') {
        console.log('Step 3: Setting up Android notification channel...');
        await Notifications.setNotificationChannelAsync('wishlist-restocks', {
          name: 'Wishlist Restocks',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });
        console.log('✅ Android channel created');
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.projectId;
      
      console.log('Project ID:', projectId || 'NOT FOUND');
      setDebugInfo(`Project ID: ${projectId || 'NOT FOUND'}`);
      
      if (!projectId) {
        Alert.alert('Error', 'Project ID not found in app config');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      const token = tokenData.data;
      console.log('✅ Generated Expo push token:', token);
      setExpoPushToken(token);
      setDebugInfo(`✅ Token generated: ${token.substring(0, 20)}...`);

      const authToken = await getToken();
      console.log('Auth token present:', !!authToken);
      
      if (!authToken) {
        console.log('No auth token - user not logged in');
        setDebugInfo('⚠️ Token generated but not saved (not logged in)');
        return;
      }

      console.log('Step 7: Saving token to backend...');
      console.log('Backend URL:', `${BACKEND_URL}/api/v1/users/push-token`);
      setDebugInfo('Saving to backend...');

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/users/push-token`,
        { pushToken: token },
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('✅ Backend response:', response.status, response.data);
      setDebugInfo('✅ Token saved to backend');
      setTokenStatus('✅ Registered');

      const verifyResponse = await axios.get(
        `${BACKEND_URL}/api/v1/users/push-token`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      console.log('Verification result:', verifyResponse.data);
      console.log('Token in DB:', verifyResponse.data.pushToken ? '✅ Present' : '❌ Missing');
      
      Alert.alert('Success', 'Push notification registered successfully!');

    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        setDebugInfo(`❌ API Error: ${error.response.data.message || 'Unknown'}`);
        Alert.alert('Error', `Failed to save token: ${error.response.data.message}`);
      } else if (error.request) {
        console.error('No response received');
        setDebugInfo('❌ Network error - no response');
        Alert.alert('Error', 'Network error. Check if backend is running.');
      } else {
        console.error('Error message:', error.message);
        setDebugInfo(`❌ Error: ${error.message}`);
        Alert.alert('Error', error.message);
      }
    }
    console.log('========== REGISTRATION END ==========');
  };

  const removePushToken = async () => {
    try {
      const authToken = await getToken();
      if (!authToken) return;

      await axios.delete(
        `${BACKEND_URL}/api/v1/users/push-token`,
        { 
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      console.log('✅ Push token removed from backend');
      setTokenStatus('❌ Removed');
      setExpoPushToken('');
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  };

  const testBackendConnection = async () => {
    try {
      const authToken = await getToken();
      if (!authToken) {
        Alert.alert('Error', 'Not logged in');
        return;
      }

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/users/me`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      Alert.alert('Success', 'Backend connection working!');
    } catch (error) {
      Alert.alert('Error', 'Backend connection failed');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedNotifications();
    await checkTokenStatus();
    setRefreshing(false);
  }, []);

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all wishlist notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      ]
    );
  };

  const deleteNotification = async (index) => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = notifications.filter((_, i) => i !== index);
            setNotifications(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }
        }
      ]
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (data) => {
    if (!data) return 'favorite';
    
    switch (data.type) {
      case 'WISHLIST_RESTOCK':
        return 'restore';
      default:
        return 'favorite';
    }
  };

  const getNotificationColor = (data) => {
    if (!data) return '#FF6B6B';
    
    switch (data.type) {
      case 'WISHLIST_RESTOCK':
        return '#4CAF50';
      default:
        return '#FF6B6B';
    }
  };

  const handleNotificationPress = (item) => {
    const data = item.request?.content?.data || item.data || {};
    
    if (data.type === 'WISHLIST_RESTOCK' && data.productId) {
      navigation.navigate('SingleProduct', { 
        productId: data.productId,
        fromNotification: true 
      });
    } else {
      navigation.navigate('NotificationDetails', {
        notification: item,
        type: 'wishlist'
      });
    }
  };

  const renderNotificationItem = ({ item, index }) => {
    const { title, body, data } = item.request?.content || item;
    const date = item.date || item.timestamp || new Date().toISOString();
    
    return (
      <TouchableOpacity
        style={styles.notificationItem}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => deleteNotification(index)}
        activeOpacity={0.7}
      >
        <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(data) + '20' }]}>
          <Icon 
            name={getNotificationIcon(data)} 
            size={24} 
            color={getNotificationColor(data)} 
          />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {title || 'Product Back in Stock!'}
            </Text>
            <Text style={styles.notificationTime}>
              {formatDate(date)}
            </Text>
          </View>
          
          <Text style={styles.notificationBody} numberOfLines={2}>
            {body || 'A product from your wishlist is now back in stock'}
          </Text>
          
          {data?.productId && (
            <View style={styles.productIdContainer}>
              <Icon name="shopping-bag" size={12} color="#666" />
              <Text style={styles.productIdText} numberOfLines={1}>
                {data?.productName || 'Product'}
              </Text>
            </View>
          )}
          
          {data?.type === 'WISHLIST_RESTOCK' && (
            <View style={styles.restockBadge}>
              <Icon name="local-offer" size={12} color="#4CAF50" />
              <Text style={styles.restockBadgeText}>
                {data?.discount ? `${data.discount}% OFF!` : 'Back in Stock'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="favorite-border" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No wishlist notifications yet</Text>
      <Text style={styles.emptyStateSubtext}>
        You'll receive notifications here when products from your wishlist are back in stock
      </Text>
      
      {/* Debug section */}
      {__DEV__ && (
        <ScrollView style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔧 Debug Tools</Text>
          
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Status:</Text>
            <Text style={[styles.debugValue, { color: tokenStatus.includes('✅') ? '#4CAF50' : '#e74c3c' }]}>
              {tokenStatus}
            </Text>
          </View>

          {debugInfo !== '' && (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Info:</Text>
              <Text style={styles.debugValue}>{debugInfo}</Text>
            </View>
          )}

          {expoPushToken ? (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Token:</Text>
              <Text style={styles.debugToken} numberOfLines={2}>
                {expoPushToken}
              </Text>
            </View>
          ) : null}

          <View style={styles.debugButtonRow}>
            <TouchableOpacity
              style={[styles.debugButton, styles.primaryButton]}
              onPress={registerForPushNotificationsAsync}
            >
              <Icon name="notifications-active" size={18} color="#fff" />
              <Text style={styles.debugButtonText}>Register Token</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.debugButton, styles.secondaryButton]}
              onPress={checkTokenStatus}
            >
              <Icon name="refresh" size={18} color="#3498db" />
              <Text style={[styles.debugButtonText, { color: '#3498db' }]}>Check Status</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.debugButtonRow}>
            <TouchableOpacity
              style={[styles.debugButton, styles.dangerButton]}
              onPress={removePushToken}
            >
              <Icon name="delete" size={18} color="#e74c3c" />
              <Text style={[styles.debugButtonText, { color: '#e74c3c' }]}>Remove Token</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.debugButton, styles.secondaryButton]}
              onPress={testBackendConnection}
            >
              <Icon name="api" size={18} color="#3498db" />
              <Text style={[styles.debugButtonText, { color: '#3498db' }]}>Test Backend</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wishlist Notifications</Text>
        </View>
        
        {notifications.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearAllNotifications}
          >
            <Icon name="delete-sweep" size={24} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Footer with count */}
      {notifications.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  clearButton: {
    padding: 8,
  },
  listContainer: {
    flexGrow: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  debugContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    width: '100%',
    maxHeight: 300,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  debugRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  debugLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  debugValue: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  debugToken: {
    flex: 1,
    fontSize: 10,
    color: '#666',
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 4,
  },
  debugButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  debugButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 5,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  productIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  productIdText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  restockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  restockBadgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  footer: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
