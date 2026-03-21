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
import { getToken } from '../../../utils/helper';  // Changed: went up 3 levels
import UserDrawer from '../UserDrawer';  // Changed: went up 1 level then to UserDrawer
import Header from '../../layouts/Header';  // Changed: went up 2 levels then to layouts/Header

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
// Status color mapping
const STATUS_COLORS = {
  'Processing': '#FFA500',
  'Shipped': '#4A6FA5',
  'Delivered': '#4CAF50',
  'Cancelled': '#FF6B6B',
  'Pending': '#FFA500',
  'Completed': '#4CAF50',
};

// ─── Order Item Component ───────────────────────────────────────────────────
const OrderItem = ({ item, onPress }) => {
  const statusColor = STATUS_COLORS[item.orderStatus] || '#999';
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
          <Icon name="shopping-bag" size={18} color="#FF6B6B" />
          <Text style={styles.orderId}>Order #{item._id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
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
                <Icon name="image" size={16} color="#ccc" />
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
          <Icon name="calendar-today" size={14} color="#999" />
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
    <Icon name="assignment" size={80} color="#e0e0e0" />
    <Text style={styles.emptyTitle}>No Orders Yet</Text>
    <Text style={styles.emptySubtitle}>
      Looks like you haven't placed any orders. Start shopping to see your orders here!
    </Text>
    <TouchableOpacity style={styles.shopNowBtn} onPress={onShopNow}>
      <Icon name="storefront" size={20} color="white" />
      <Text style={styles.shopNowText}>Shop Now</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Order History Screen ─────────────────────────────────────────────
export default function OrderHistory({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All'); // All, Processing, Shipped, Delivered, Cancelled

  useEffect(() => {
    fetchOrders();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      // Fixed: Removed duplicate '/orders' from the path
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

  // Filter orders based on selected filter
  const filteredOrders = filter === 'All' 
    ? orders 
    : orders.filter(order => order.orderStatus === filter);

  // Get unique statuses for filter buttons
  const statuses = ['All', ...new Set(orders.map(order => order.orderStatus))];

  // ─── Render Filter Button ────────────────────────────────────────────────
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

  // ─── Loading State ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
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
            <Text style={styles.headerTitle}>Order History</Text>
            <Text style={styles.headerSubtitle}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
            </Text>
          </View>

          {/* Filter Buttons */}
          {orders.length > 0 && (
            <View style={styles.filterContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {statuses.map(renderFilterButton)}
              </ScrollView>
            </View>
          )}

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
                  colors={['#FF6B6B']}
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },

  // Header
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },

  // Filter Buttons
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Order Card
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    gap: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Items Preview
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewItem: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f0f0f0',
  },
  moreItemsBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreItemsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  orderFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 12,
    color: '#999',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 25,
    marginTop: 10,
  },
  shopNowText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    marginLeft: 7,
  },
});