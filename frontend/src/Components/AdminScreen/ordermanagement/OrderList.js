import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchOrders,
  deleteOrder,
  clearError,
  clearSuccess,
} from '../../../redux/slices/orderSlice';

const ORDER_STATUS_TABS = [
  'All',
  'Processing',
  'Accepted',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export default function OrderListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: orders, loading, error, success } = useSelector(
    (state) => state.orders
  );
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    if (success) {
      dispatch(clearSuccess());
    }
  }, [error, success, dispatch]);

  const loadOrders = () => {
    dispatch(fetchOrders());
  };

  const onRefresh = () => {
    loadOrders();
  };

  const handleDelete = (order) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete order #${order._id.slice(-6)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteOrder(order._id)).unwrap();
              Alert.alert('Success', 'Order deleted successfully');
            } catch (error) {
              Alert.alert('Error', error || 'Failed to delete order');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (order) => {
    navigation.navigate('UpdateOrder', { orderId: order._id });
  };

  const handleView = (order) => {
    navigation.navigate('ViewOrder', { orderId: order._id });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            const { logout } = await import('../../../utils/helper');
            await logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return '#27ae60';
      case 'Out for Delivery':
        return '#f39c12';
      case 'Processing':
        return '#3498db';
      case 'Accepted':
        return '#2ecc71';
      case 'Cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `\u20B1${value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredOrders =
    selectedStatus === 'All'
      ? orders
      : orders.filter((order) => order.orderStatus === selectedStatus);

  const renderRightActions = (order) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.updateButton]}
        onPress={() => handleUpdateStatus(order)}
      >
        <Icon name="update" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Update</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(order)}
      >
        <Icon name="delete" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleView(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item._id.slice(-8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
            <Text style={styles.statusText}>{item.orderStatus}</Text>
          </View>
        </View>
        
        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Icon name="person" size={16} color="#666" />
            <Text style={styles.infoText}>{item.user?.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="email" size={16} color="#666" />
            <Text style={styles.infoText}>{item.user?.email || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="payments" size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatCurrency(item.totalPrice ?? item.totalAmount ?? item.itemsPrice)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
          </View>
          
          <View style={styles.itemsPreview}>
            <Text style={styles.itemsPreviewText}>
              {item.orderItems?.length} item(s)
            </Text>
          </View>
        </View>
        
        <Icon name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
    </Swipeable>
  );

  const OrderListContent = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Icon name="inventory-2" size={26} color="#7A4B2A" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Order Management</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} available
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {ORDER_STATUS_TABS.map((status) => {
          const isActive = selectedStatus === status;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.statusTab, isActive && styles.statusTabActive]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.statusTabText,
                  isActive && styles.statusTabTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Icon name="shopping-cart" size={80} color="#E0E0E0" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          )
        }
      />
    </View>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <OrderListContent />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6EDE3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7F1',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    marginLeft: 14,
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 12,
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
  headerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#7C6555',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  tabsScroll: {
    minHeight: 78,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: 'center',
  },
  statusTab: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#F9F2EB',
    borderWidth: 1,
    borderColor: '#E7D8C8',
    marginRight: 10,
    justifyContent: 'center',
  },
  statusTabActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  statusTabText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#7C6555',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE0D2',
  },
  orderId: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  orderInfo: {
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#5C3B28',
  },
  itemsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFE0D2',
  },
  itemsPreviewText: {
    fontSize: 13,
    color: '#8E7665',
    fontStyle: 'italic',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  swipeButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginLeft: 5,
    height: '100%',
  },
  updateButton: {
    backgroundColor: '#D79B3E',
  },
  deleteButton: {
    backgroundColor: '#C95E52',
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#7C6555',
    marginTop: 14,
    fontWeight: '700',
  },
});
