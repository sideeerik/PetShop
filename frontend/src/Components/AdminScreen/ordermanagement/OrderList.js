import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
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

export default function OrderListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: orders, loading, error, success } = useSelector(
    (state) => state.orders
  );

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
            <Icon name="attach-money" size={16} color="#666" />
            <Text style={styles.infoText}>₱{item.totalAmount?.toFixed(2)}</Text>
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
      <FlatList
        data={orders}
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
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
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#34495e',
  },
  itemsPreview: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemsPreviewText: {
    fontSize: 13,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  swipeButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginLeft: 5,
    height: '100%',
  },
  updateButton: {
    backgroundColor: '#f39c12',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
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
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});