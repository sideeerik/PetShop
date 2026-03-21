// C&V PetShop/frontend/src/Components/AuthenticationScreen/GuestDrawer.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GuestDrawer = ({ children }) => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Update active tab based on current route
  useEffect(() => {
    if (route.name === 'Home') {
      setActiveTab('Home');
    }
  }, [route.name]);

  const showDrawer = useCallback(() => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const hideDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const handleNavigation = useCallback((screenName) => {
    hideDrawer();
    
    // All protected routes and chatbot go directly to Login without confirmation
    if (screenName === 'Cart' || screenName === 'Wishlist' || 
        screenName === 'Profile' || screenName === 'Orders' || 
        screenName === 'Chatbot') {
      navigation.navigate('Login');
      return;
    }

    // Handle Home navigation (public)
    if (screenName === 'Home') {
      setActiveTab('Home');
      navigation.navigate('Home');
      return;
    }

    setActiveTab(screenName);

    try {
      navigation.navigate(screenName);
    } catch (error) {
      console.log(`Navigation to ${screenName} failed:`, error);
    }
  }, [hideDrawer, navigation]);

  const handleTabPress = useCallback((tab) => {
    if (tab.isMenu) {
      showDrawer();
      return;
    }

    // Handle Home tab
    if (tab.screen === 'Home') {
      setActiveTab('Home');
      navigation.navigate('LandingPage');
      return;
    }

    // All other tabs go directly to Login without confirmation
    navigation.navigate('Login');
  }, [showDrawer, navigation]);

  const drawerItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
      color: '#4A6FA5',
      screen: 'Profile',
    },

        {
      id: 'orders',
      label: 'My Orders',
      icon: 'receipt-outline',
      activeIcon: 'receipt',
      color: '#4A6FA5',
      screen: 'Orders',
    },

    { 
      id: 'chatbot',
      label: 'Chatbot',
      icon: 'chatbubble-outline',
      activeIcon: 'chatbubble',
      screen: 'Chatbot', 
      color: '#4CAF50',
    },
    {
      id: 'login',
      label: 'Login / Register',
      icon: 'log-in-outline',
      activeIcon: 'log-in',
      color: '#4CAF50',
      screen: 'Login',
    },
  ];

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
      screen: 'Home',
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: 'cart-outline',
      activeIcon: 'cart',
      screen: 'Cart',
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: 'heart-outline',
      activeIcon: 'heart',
      screen: 'Wishlist',
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: 'menu-outline',
      activeIcon: 'menu',
      isMenu: true,
    },
  ];

  const renderTab = useCallback((tab) => {
    const isActive = activeTab === tab.screen && !tab.isMenu;
    const isMenuTab = tab.isMenu;

    return (
      <TouchableOpacity
        key={tab.id}
        style={styles.tabItem}
        onPress={() => handleTabPress(tab)}
        activeOpacity={0.7}
        accessibilityLabel={`${tab.label} tab`}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={isActive ? tab.activeIcon : tab.icon}
            size={24}
            color={isActive ? '#FF6B6B' : '#666'}
          />
        </View>
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeTab, handleTabPress]);

  const renderDrawerItem = useCallback((item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.drawerItem}
        onPress={() => handleNavigation(item.screen)}
        activeOpacity={0.7}
      >
        <View style={[styles.drawerIconContainer, { backgroundColor: `${item.color}15` }]}>
          <Ionicons
            name={item.icon}
            size={22}
            color={item.color}
          />
        </View>
        <Text style={[styles.drawerItemText, { color: item.color }]}>
          {item.label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#999" />
      </TouchableOpacity>
    );
  }, [handleNavigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.childContent}>
          {children}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            {tabs.map(renderTab)}
          </View>
        </View>
      </View>

      {/* Drawer Modal */}
      <Modal
        transparent={true}
        visible={drawerVisible}
        onRequestClose={hideDrawer}
        animationType="none"
      >
        <TouchableWithoutFeedback onPress={hideDrawer}>
          <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.drawerContainer,
                  { transform: [{ translateX: slideAnim }] }
                ]}
              >
                {/* Drawer Header */}
                <View style={styles.drawerHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.avatar, styles.guestAvatar]}>
                      <Text style={styles.avatarText}>G</Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>Guest User</Text>
                      <Text style={styles.userEmail}>Login to access features</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={hideDrawer} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Drawer Items */}
                <View style={styles.drawerItems}>
                  {drawerItems.map(renderDrawerItem)}
                </View>

                {/* Drawer Footer */}
                <View style={styles.drawerFooter}>
                  <Text style={styles.appVersion}>C&V PetShop v1.0.0</Text>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  childContent: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#666',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guestAvatar: {
    backgroundColor: '#999',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
  },
  closeButton: {
    padding: 4,
  },
  drawerItems: {
    flex: 1,
    paddingTop: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  drawerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  appVersion: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default GuestDrawer;