// CVPetShop/frontend/App.js
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import AppNavigator from './src/Components/Navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { WishlistProvider } from './src/context/WishlistContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage key for wishlist notifications
const WISHLIST_STORAGE_KEY = '@wishlist_notifications';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  // Function to save wishlist notification to AsyncStorage
  const saveWishlistNotification = async (notification) => {
    try {
      const existing = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
      const saved = existing ? JSON.parse(existing) : [];
      
      const notificationToSave = {
        request: {
          content: {
            title: notification.request?.content?.title || 'Product Back in Stock!',
            body: notification.request?.content?.body || 'A product from your wishlist is now back in stock',
            data: notification.request?.content?.data || notification.data || {},
          },
        },
        date: new Date().toISOString(),
      };
      
      const updated = [notificationToSave, ...saved].slice(0, 50);
      await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
      console.log('✅ Wishlist notification saved to storage');
    } catch (error) {
      console.error('Error saving wishlist notification:', error);
    }
  };

  useEffect(() => {
    async function prepare() {
      try {
        await setupNotifications();
        
        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        if (initialResponse && navigationRef.current) {
          console.log('🔔 App opened from notification:', initialResponse);
          setTimeout(() => {
            handleNotificationResponse(initialResponse);
          }, 1000);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
    setupNotificationListeners();
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cleanupNotificationListeners();
      subscription.remove();
    };
  }, []);

  const setupNotifications = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order-updates', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#f39c12',
          sound: 'default',
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });

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

        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const setupNotificationListeners = () => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification);
      
      const data = notification.request?.content?.data || notification.data || {};
      if (data.type === 'WISHLIST_RESTOCK') {
        saveWishlistNotification(notification);
      }
      
      const { title, body } = notification.request.content;
      if (title && body) {
        Alert.alert(
          title,
          body,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      handleNotificationResponse(response);
    });
  };

  const cleanupNotificationListeners = () => {
    if (notificationListener.current) {
      notificationListener.current.remove();
    }
    if (responseListener.current) {
      responseListener.current.remove();
    }
  };

  const handleAppStateChange = (nextAppState) => {
    console.log('App state changed to:', nextAppState);
  };

  const handleNotificationResponse = (response) => {
    const data = response.notification?.request?.content?.data || 
                 response.notification?.data || {};
    
    console.log('Notification data:', data);
    console.log('🔍 Raw notification data structure:', {
      hasItems: !!data.items,
      itemsCount: data.items?.length,
      itemsSample: data.items ? JSON.stringify(data.items[0]) : 'no items',
      hasTotal: !!data.total,
      status: data.status,
      orderId: data.orderId
    });

    if (!navigationRef.current) {
      console.log('Navigation ref not ready yet, waiting...');
      setTimeout(() => {
        if (navigationRef.current) {
          navigateToScreen(data, response);
        } else {
          console.log('Navigation ref still not ready');
        }
      }, 500);
      return;
    }

    navigateToScreen(data, response);
  };

  const navigateToScreen = (data, response) => {
    if (data.type === 'ORDER_STATUS_UPDATE' && data.orderId) {
      console.log('📦 Processing order notification with data:', JSON.stringify(data, null, 2));
      
      // Format items to ensure they have all required fields
      const formatItems = (items) => {
        if (!items || !Array.isArray(items)) return [];
        
        return items.map(item => ({
          _id: item._id || item.productId,
          name: item.name || item.productName || 'Product',
          price: parseFloat(item.price || item.productPrice || 0),
          quantity: parseInt(item.quantity || item.qty || 1),
          image: item.image || item.productImage || item.images?.[0] || null,
        }));
      };

      // Calculate items price from items if not provided
      const calculateItemsPrice = (items) => {
        if (!items || items.length === 0) return 0;
        return items.reduce((sum, item) => {
          const price = parseFloat(item.price || 0);
          const quantity = parseInt(item.quantity || 1);
          return sum + (price * quantity);
        }, 0);
      };

      const formattedItems = formatItems(data.items);
      const itemsPrice = parseFloat(data.itemsPrice) || calculateItemsPrice(formattedItems);
      const shippingPrice = parseFloat(data.shippingPrice) || 0;
      const taxPrice = parseFloat(data.taxPrice) || 0;
      const total = parseFloat(data.total || data.totalPrice) || (itemsPrice + shippingPrice + taxPrice);

      console.log('📦 Formatted items:', JSON.stringify(formattedItems, null, 2));
      console.log('💰 Calculated totals:', { itemsPrice, shippingPrice, taxPrice, total });

      navigationRef.current?.navigate('OrderDetailsNotif', { 
        orderId: data.orderId,
        fromNotification: true,
        status: data.status || 'Updated',
        message: response.notification?.request?.content?.body || 'Your order status has been updated',
        updatedAt: data.updatedAt || new Date().toISOString(),
        orderData: {
          _id: data.orderId,
          status: data.status || 'Updated',
          message: response.notification?.request?.content?.body || 'Your order status has been updated',
          updatedAt: data.updatedAt || new Date().toISOString(),
          items: formattedItems,
          itemsPrice: itemsPrice,
          shippingPrice: shippingPrice,
          taxPrice: taxPrice,
          total: total
        }
      });
    }
    else if (data.type === 'WISHLIST_RESTOCK' && data.productId) {
      navigationRef.current?.navigate('ProductDetailsNotif', { 
        productId: data.productId,
        fromNotification: true,
        notificationType: data.type,
        message: response.notification?.request?.content?.body || data.message || `${data.productName || 'A wishlist item'} is back in stock.`,
        updatedAt: data.updatedAt || data.timestamp || new Date().toISOString(),
        productData: data.productData || null,
      });
    }
    else if (data.type === 'discount' || data.type === 'DISCOUNT' || data.type === 'promotion') {
      // Navigate to ProductDetailsNotif with productId and notification data
      console.log('🔔 Navigating to discount notification with data:', data);
      
      // Extract all possible data from the notification
      const productName = data.productName || data.name || 'Product';
      const productPrice = parseFloat(data.price || data.originalPrice || 0);
      const productDiscountedPrice = parseFloat(data.discountedPrice || 0);
      const productDiscount = parseInt(data.discountPercentage || data.discount || 0);
      const productImages = data.images || [];
      const productDescription = data.description || 'No description available';
      const productCategory = data.category || 'Uncategorized';
      const productBrand = data.brand || 'Unknown';
      const productStock = parseInt(data.stock || 0);
      const productRating = parseFloat(data.rating || 0);
      const productNumReviews = parseInt(data.numReviews || 0);
      const productDiscountEndDate = data.discountEndDate || data.endDate || new Date().toISOString();
      
      // Create a complete productData object from all available notification data
      const completeProductData = {
        _id: data.productId,
        name: productName,
        description: productDescription,
        price: productPrice,
        discountedPrice: productDiscountedPrice,
        discountPercentage: productDiscount,
        images: productImages,
        category: productCategory,
        brand: productBrand,
        stock: productStock,
        rating: productRating,
        numReviews: productNumReviews,
        discountEndDate: productDiscountEndDate
      };

      console.log('📦 Complete product data prepared:', completeProductData);

      navigationRef.current?.navigate('ProductDetailsNotif', { 
        productId: data.productId,
        fromNotification: true,
        discount: productDiscount,
        message: response.notification?.request?.content?.body || data.message || `✨ ${productName} is now ${productDiscount}% off!`,
        updatedAt: data.updatedAt || new Date().toISOString(),
        productData: completeProductData // Pass the complete product data
      });
    }
    else {
      let notificationType = 'order';
      if (data.type === 'WISHLIST_RESTOCK') {
        notificationType = 'wishlist';
      } else if (data.type === 'discount' || data.type === 'DISCOUNT') {
        notificationType = 'product';
      }

      navigationRef.current?.navigate('NotificationDetails', {
        notification: response.notification,
        type: notificationType
      });
    }
  };

  if (!appIsReady) {
    return null;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <NavigationContainer 
          ref={navigationRef}
          onReady={() => {
            console.log('Navigation container is ready');
          }}
        >
          <WishlistProvider>
            <AppNavigator />
          </WishlistProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
