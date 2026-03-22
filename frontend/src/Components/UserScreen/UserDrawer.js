// C&V PetShop/frontend/src/Components/UserScreen/UserDrawer.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUser, logout } from '../../utils/helper';

const UserDrawer = ({ children }) => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Update active tab based on current route
  useEffect(() => {
    if (route.name === 'Home' || route.name === 'Cart' || route.name === 'Wishlist' || route.name === 'Profile' || route.name === 'OrderHistory') {
      setActiveTab(route.name === 'Profile' ? 'Home' : route.name);
    }
  }, [route.name]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await getUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const showDrawer = useCallback(() => {
    setDrawerVisible(true);
    loadUserData();
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
      setUser(null);
    });
  }, [fadeAnim, slideAnim]);

  const handleLogout = useCallback(async () => {
    hideDrawer();
    
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await logout(navigation);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
          style: "destructive"
        }
      ]
    );
  }, [hideDrawer, navigation]);

  const handleNavigation = useCallback((screenName) => {
    hideDrawer();

    // Handle Orders navigation to OrderHistory
    if (screenName === 'Orders') {
      navigation.navigate('OrderHistory');
      return;
    }

    // Handle Wishlist navigation
    if (screenName === 'Wishlist') {
      navigation.navigate('Wishlist');
      return;
    }

      // Handle Chatbot navigation - add this
      if (screenName === 'Chatbot') {
        navigation.navigate('Chatbot');
        return;
      }

    // Cart and Home navigate normally
    setActiveTab(screenName === 'Profile' ? 'Home' : screenName);

    try {
      navigation.navigate(screenName);
    } catch (error) {
      console.log(`Navigation to ${screenName} failed:`, error);
      Alert.alert('Error', `Cannot navigate to ${screenName}`);
    }
  }, [hideDrawer, navigation]);

  const drawerItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
      color: '#8B5E3C',
      screen: 'Profile'
    },
    {
      id: 'orders',
      label: 'My Orders',
      icon: 'receipt-outline',
      activeIcon: 'receipt',
      color: '#8B5E3C',
      screen: 'Orders'  
    },
    { 
      id: 'chatbot',  // ✅ Added missing id
      label: 'Chatbot',
      icon: 'hardware-chip-outline',
      activeIcon: 'hardware-chip',
      screen: 'Chatbot', 
      color: '#A3B18A'   
    },  // ✅ Added comma
    {
      id: 'logout',
      label: 'Logout',
      icon: 'log-out-outline',
      activeIcon: 'log-out',
      color: '#FF6B6B',
      isLogout: true
    },
  ];

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
      screen: 'Home'
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: 'cart-outline',
      activeIcon: 'cart',
      screen: 'Cart'
    },
    // CHANGED: Replaced Notifications with Wishlist
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: 'heart-outline',
      activeIcon: 'heart',
      screen: 'Wishlist'
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: 'menu-outline',
      activeIcon: 'menu',
      isMenu: true
    },
  ];

  const renderTab = useCallback((tab) => {
    const isActive = activeTab === tab.screen;
    const isMenuTab = tab.isMenu;

    return (
      <TouchableOpacity
        key={tab.id}
        style={styles.tabItem}
        onPress={() => isMenuTab ? showDrawer() : handleNavigation(tab.screen)}
        activeOpacity={0.7}
        accessibilityLabel={`${tab.label} tab`}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
          <Ionicons
            name={isActive ? tab.activeIcon : tab.icon}
            size={22}
            color={isActive ? '#8B5E3C' : '#B0A090'}
          />
        </View>
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeTab, showDrawer, handleNavigation]);

  const renderDrawerItem = useCallback((item) => {
    const handlePress = () => {
      if (item.isLogout) {
        handleLogout();
      } else {
        handleNavigation(item.screen);
      }
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.drawerItem}
        onPress={handlePress}
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
        {!item.isLogout && (
          <Ionicons name="chevron-forward" size={18} color="#999" />
        )}
      </TouchableOpacity>
    );
  }, [handleNavigation, handleLogout]);

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
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
                    <View style={styles.avatar}>
                      {loading ? (
                        <Text style={styles.avatarText}>...</Text>
                      ) : (
                        <Text style={styles.avatarText}>{getUserInitials()}</Text>
                      )}
                    </View>
                    <View style={styles.userDetails}>
                      {loading ? (
                        <>
                          <Text style={styles.userName}>Loading...</Text>
                          <Text style={styles.userEmail}>Please wait</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.userName}>{user?.name || 'User'}</Text>
                          <Text style={styles.userEmail}>{user?.email || 'user@email.com'}</Text>
                        </>
                      )}
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  childContent: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 6,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    width: 38,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  activeIconContainer: {
    backgroundColor: '#FDF0E6',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    color: '#B0A090',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#8B5E3C',
    fontWeight: '700',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61,36,18,0.45)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0D6C8',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5E3C',
        shadowOffset: { width: 3, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FDF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
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
    backgroundColor: '#8B5E3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E0D6C8',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#B0A090',
  },
  closeButton: {
    backgroundColor: '#F0EAE0',
    borderRadius: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  drawerItems: {
    flex: 1,
    paddingTop: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EDE4',
  },
  drawerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
    backgroundColor: '#FDF7F2',
  },
  appVersion: {
    fontSize: 12,
    color: '#C4A882',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default UserDrawer;
