// C&V PetShop/frontend/src/Components/AdminScreen/AdminDrawer.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { logout } from '../../utils/helper';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

const AdminDrawer = ({ children, onLogout }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(0));

  const menuItems = [
    {
      name: 'Dashboard',
      icon: 'view-dashboard',
      screen: 'Dashboard',
      routes: ['Dashboard'],
    },
    {
      name: 'Product',
      icon: 'package-variant',
      screen: 'ProductList',
      routes: ['ProductList', 'CreateProduct', 'UpdateProduct', 'ViewProduct', 'TrashProduct'],
    },
    {
      name: 'Supplier',
      icon: 'truck-delivery',
      screen: 'SupplierList',
      routes: ['SupplierList', 'CreateSupplier', 'UpdateSupplier', 'ViewSupplier', 'TrashSupplier'],
    },
    {
      name: 'Order',
      icon: 'cart',
      screen: 'OrderList',
      routes: ['OrderList', 'ViewOrder', 'UpdateOrder'],
    },
    {
      name: 'Reviews',
      icon: 'star',
      screen: 'ReviewList',
      routes: ['ReviewList', 'ViewReview'],
    },
    {
      name: 'User',
      icon: 'account-group',
      screen: 'UserList',
      routes: ['UserList', 'CreateUser', 'UpdateUser', 'ViewUser', 'TrashUser'],
    },
  ];

  const selectedMenuItem =
    menuItems.find((item) => item.routes.includes(route.name)) || menuItems[0];

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? 0 : 1;
    Animated.spring(drawerAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleMenuItemPress = (item) => {
    if (route.name !== item.screen) {
      navigation.navigate(item.screen);
    }

    toggleDrawer();
  };

  const handleLogoutPress = async () => {
    if (onLogout) {
      onLogout();
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout(navigation);
          },
        },
      ]
    );
  };

  const translateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const overlayOpacity = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <View style={styles.container}>
      {/* Header with Hamburger Menu */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={toggleDrawer} 
          style={styles.hamburgerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="menu" size={28} color="#7A4B2A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>{selectedMenuItem.name}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="shield-crown-outline" size={20} color="#7A4B2A" />
        </View>
      </View>

      {/* Main Content - Add collapsable={false} to prevent re-rendering */}
      <View style={styles.content} collapsable={false}>
        {children}
      </View>

      {/* Overlay - Use conditional rendering instead of display style */}
      {isDrawerOpen && (
        <TouchableWithoutFeedback onPress={toggleDrawer}>
          <Animated.View 
            style={[
              styles.overlay,
              { opacity: overlayOpacity }
            ]} 
          />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer - Use conditional rendering */}
      {isDrawerOpen && (
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerLogoWrap}>
              <Icon name="paw" size={36} color="#7A4B2A" />
            </View>
            <Text style={styles.drawerHeaderText}>C&V PetShop</Text>
            <Text style={styles.drawerSubHeaderText}>Admin Panel</Text>
          </View>

          <ScrollView
            style={styles.drawerContent}
            contentContainerStyle={styles.drawerContentContainer}
          >
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.drawerItem,
                  selectedMenuItem.name === item.name && styles.drawerItemSelected,
                ]}
                onPress={() => handleMenuItemPress(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon
                  name={item.icon}
                  size={24}
                  color={selectedMenuItem.name === item.name ? '#FF6B6B' : '#666'}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    selectedMenuItem.name === item.name && styles.drawerItemTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.drawerFooter}>
            <TouchableOpacity 
              style={styles.drawerFooterItem}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="cog" size={20} color="#666" />
              <Text style={styles.drawerFooterText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.drawerFooterItem}
              onPress={handleLogoutPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="logout" size={20} color="#666" />
              <Text style={styles.drawerFooterText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FDF7F1',
    elevation: 4,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
    zIndex: 10,
  },
  hamburgerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 14,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A87B54',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 20,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFDF9',
    elevation: 8,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 30,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#F7EBDD',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
    alignItems: 'center',
  },
  drawerLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
  },
  drawerHeaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2A1F',
    marginTop: 10,
  },
  drawerSubHeaderText: {
    fontSize: 14,
    color: '#8E7665',
    marginTop: 5,
  },
  drawerContent: {
    flex: 1,
  },
  drawerContentContainer: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginHorizontal: 10,
    borderRadius: 14,
    marginVertical: 2,
  },
  drawerItemSelected: {
    backgroundColor: '#F3E3D3',
  },
  drawerItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#7C6555',
  },
  drawerItemTextSelected: {
    color: '#7A4B2A',
    fontWeight: '700',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E8D6C3',
    padding: 15,
  },
  drawerFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8EFE7',
    marginTop: 8,
  },
  drawerFooterText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#7C6555',
  },
});

export default AdminDrawer;
