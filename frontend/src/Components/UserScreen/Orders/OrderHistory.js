// CVPetShop/frontend/src/Components/UserScreen/Orders/OrderHistory.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken, resetToAuth } from '../../../utils/helper';
import UserDrawer from '../UserDrawer';
import Header from '../../layouts/Header';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const ORDER_STATUS_TABS = [
  'All',
  'Processing',
  'Accepted',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

// Status color mapping
const STATUS_COLORS = {
  'Processing': '#FFA500',
  'Accepted': '#4A6FA5',
  'Out for Delivery': '#D79B3E',
  'Shipped': '#4A6FA5',
  'Delivered': '#4CAF50',
  'Cancelled': '#FF6B6B',
  'Pending': '#FFA500',
  'Completed': '#4CAF50',
};

// ─── Order Item Component ───────────────────────────────────────────────────
const OrderItem = ({ item, onPress }) => {
  const statusColor = STATUS_COLORS[item.orderStatus] || '#B0A090';
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.7}>
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <View style={styles.orderIconWrapper}>
            <Icon name="shopping-bag" size={16} color="#8B5E3C" />
          </View>
          <Text style={styles.orderId}>Order #{item._id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.orderStatus}
          </Text>
        </View>
      </View>

      {/* Order Items Preview */}
      <View style={styles.itemsPreview}>
        {item.orderItems.slice(0, 3).map((orderItem, index) => (
          <View key={index} style={styles.previewItem}>
            {orderItem.image ? (
              <Image source={{ uri: orderItem.image }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewImagePlaceholder}>
                <Icon name="image" size={16} color="#C4A882" />
              </View>
            )}
          </View>
        ))}
        {item.orderItems.length > 3 && (
          <View style={styles.moreItemsBadge}>
            <Text style={styles.moreItemsText}>+{item.orderItems.length - 3}</Text>
          </View>
        )}
      </View>

      {/* Order Footer */}
      <View style={styles.orderFooter}>
        <View style={styles.orderFooterLeft}>
          <Icon name="calendar-today" size={14} color="#B0A090" />
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <View style={styles.orderFooterRight}>
          <Text style={styles.orderTotalLabel}>Total: </Text>
          <Text style={styles.orderTotal}>₱{item.totalPrice?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty State Component ─────────────────────────────────────────────────
const EmptyState = ({ onShopNow }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrapper}>
      <Icon name="assignment" size={48} color="#C4A882" />
    </View>
    <Text style={styles.emptyTitle}>No Orders Yet</Text>
    <Text style={styles.emptySubtitle}>
      You haven't bought anything yet! Browse our pet products and place your first order.
    </Text>
    <TouchableOpacity style={styles.shopNowBtn} onPress={onShopNow}>
      <Icon name="storefront" size={20} color="white" />
      <Text style={styles.shopNowText}>Start Shopping</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Order History Screen ─────────────────────────────────────────────
export default function OrderHistory({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchOrders();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      if (!token) {
        resetToAuth(navigation);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/orders/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetails', { orderId: order._id, order });
  };

  const handleShopNow = () => {
    navigation.navigate('Home');
  };

  const filteredOrders = filter === 'All' 
    ? orders 
    : orders.filter(order => order.orderStatus === filter);

  const statuses = [
    ...ORDER_STATUS_TABS,
    ...[...new Set(orders.map(order => order.orderStatus))].filter(
      (status) => !ORDER_STATUS_TABS.includes(status)
    ),
  ];

  const renderFilterButton = (status) => (
    <TouchableOpacity
      key={status}
      style={[
        styles.filterButton,
        filter === status && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === status && styles.filterButtonTextActive,
        ]}
      >
        {status}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5E3C" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </UserDrawer>
    );
  }

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Orders</Text>
            <Text style={styles.headerSubtitle}>
              {orders.length === 0
                ? 'No orders placed yet'
                : `You have ${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
            </Text>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {statuses.map(renderFilterButton)}
            </ScrollView>
          </View>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <OrderItem item={item} onPress={() => handleOrderPress(item)} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#8B5E3C']}
                  tintColor="#8B5E3C"
                />
              }
              ListFooterComponent={<View style={{ height: 20 }} />}
            />
          ) : (
            <EmptyState onShopNow={handleShopNow} />
          )}
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5E9DA',
  },
  loadingText: {
    fontSize: 15,
    color: '#B0A090',
    marginTop: 12,
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B5E3C',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#B0A090',
  },

  // Filter Buttons
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0EAE0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  filterButtonActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIconWrapper: {
    backgroundColor: '#FDF0E6',
    borderRadius: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Items Preview
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewItem: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FDF7F2',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
  },
  moreItemsBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  moreItemsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5E3C',
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EAE0',
  },
  orderFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderDate: {
    fontSize: 12,
    color: '#B0A090',
  },
  orderFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 12,
    color: '#B0A090',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5E3C',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -50,
  },
  emptyIconWrapper: {
    backgroundColor: '#FDF0E6',
    borderRadius: 50,
    padding: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5E3C',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#B0A090',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  shopNowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
