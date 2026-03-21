// C&V PetShop/frontend/src/Components/AdminScreen/AdminDrawer.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

const AdminDrawer = ({ children, onLogout }) => {
  const navigation = useNavigation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('Dashboard');
  const [drawerAnimation] = useState(new Animated.Value(0));

  const menuItems = [
    { name: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard' },
    { name: 'User', icon: 'account-group', screen: 'User' },
    { name: 'Order', icon: 'cart', screen: 'Order' },
    { name: 'Supplier', icon: 'truck-delivery', screen: 'Supplier' },
    { name: 'Reviews', icon: 'star', screen: 'Reviews' },
    { name: 'Product', icon: 'package-variant', screen: 'Product' },
  ];

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? 0 : 1;
    Animated.spring(drawerAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleMenuItemPress = (itemName) => {
    setSelectedItem(itemName);
    console.log(`Navigating to ${itemName}`);
    
    switch(itemName) {
      case 'User':
        navigation.navigate('UserList');
        break;
      case 'Supplier':
        navigation.navigate('SupplierList');
        break;
      case 'Product':
        navigation.navigate('ProductList');
        break;
      case 'Dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'Order':
        navigation.navigate('OrderList');
        break;
      case 'Reviews':
        navigation.navigate('ReviewList');
        break;
      default:
        break;
    }
    
    toggleDrawer();
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
          <Icon name="menu" size={30} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.placeholder} />
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
            <Icon name="paw" size={40} color="#FF6B6B" />
            <Text style={styles.drawerHeaderText}>C&V PetShop</Text>
            <Text style={styles.drawerSubHeaderText}>Admin Panel</Text>
          </View>

          <ScrollView style={styles.drawerContent}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.drawerItem,
                  selectedItem === item.name && styles.drawerItemSelected,
                ]}
                onPress={() => handleMenuItemPress(item.name)}
                activeOpacity={0.7}
              >
                <Icon
                  name={item.icon}
                  size={24}
                  color={selectedItem === item.name ? '#FF6B6B' : '#666'}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    selectedItem === item.name && styles.drawerItemTextSelected,
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
            >
              <Icon name="cog" size={20} color="#666" />
              <Text style={styles.drawerFooterText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.drawerFooterItem}
              onPress={onLogout}
              activeOpacity={0.7}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  hamburgerButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
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
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 30,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  drawerHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  drawerSubHeaderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  drawerItemSelected: {
    backgroundColor: '#FFE5E5',
  },
  drawerItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#666',
  },
  drawerItemTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
  },
  drawerFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  drawerFooterText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default AdminDrawer;