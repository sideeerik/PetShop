// CVPetShop/frontend/src/Components/Navigation/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthenticationStack from './AuthenticationStack';
import UserStack from './UserStack';
import AdminStack from './AdminStack';
import { getUser, onAuthChange } from '../../utils/helper';

// Import NotificationDetails
import NotificationDetails from '../UserScreen/Notification/NotificationDetails';
import OrderDetailsNotif from '../UserScreen/OrderDetailsNotif';
import ProductDetailsNotif from '../UserScreen/ProductDetailsNotif';


const Stack = createNativeStackNavigator();

// Create wrapper components for conditional rendering
const AuthWrapper = () => <AuthenticationStack />;
const UserWrapper = () => <UserStack />;
const AdminWrapper = () => <AdminStack />;

const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadUser = async () => {
      try {
        const currentUser = await getUser();
        if (isMounted) {
          console.log('Initial user loaded:', currentUser);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadUser();

    // Listen for authentication changes
    const unsubscribe = onAuthChange((updatedUser) => {
      console.log('Auth state changed:', updatedUser);
      if (isMounted) {
        setUser(updatedUser);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Determine which main component to render based on user role
  const getMainComponent = () => {
    if (!user) {
      return AuthWrapper;
    }
    return user.role === 'admin' ? AdminWrapper : UserWrapper;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  console.log('AppNavigator rendering with user:', user);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Main stack based on authentication */}
        <Stack.Screen 
          name="MainApp" 
          component={getMainComponent()}
        />
        {/* Add NotificationDetails as a global modal screen */}
        <Stack.Screen 
          name="NotificationDetails" 
          component={NotificationDetails}
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }}
        />
        <Stack.Screen 
          name="OrderDetailsNotif" 
          component={OrderDetailsNotif}
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }}
        />
        <Stack.Screen
          name="ProductDetailsNotif"
          component={ProductDetailsNotif}
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }}
        />


        
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default AppNavigator;