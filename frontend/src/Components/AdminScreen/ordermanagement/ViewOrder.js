import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchOrderById,
  clearError,
  clearCurrentOrder,
} from '../../../redux/slices/orderSlice';

export default function ViewOrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const dispatch = useDispatch();
  const { currentOrder: order, loading, error } = useSelector(
    (state) => state.orders
  );

  useEffect(() => {
    dispatch(fetchOrderById(orderId));
    
    return () => {
      dispatch(clearCurrentOrder());
    };
  }, [dispatch, orderId]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItemCard}>
      <View style={styles.orderItemHeader}>
        <Text style={styles.productName}>{item.name || item.product?.name || 'Product'}</Text>
        <Text style={styles.itemPrice}>₱{item.price?.toFixed(2)}</Text>
      </View>
      <View style={styles.orderItemDetails}>
        <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
        <Text style={styles.itemSubtotal}>
          Subtotal: ₱{(item.price * item.quantity).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Icon name="error-outline" size={80} color="#e0e0e0" />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorText}>
          The order you're looking for doesn't exist or has been Updated the Status.
        </Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) }]}>
              <Text style={styles.statusText}>{order.orderStatus}</Text>
            </View>
            {order.deliveredAt && (
              <Text style={styles.deliveredDate}>
                Delivered on: {formatDate(order.deliveredAt)}
              </Text>
            )}
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Icon name="receipt" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Order ID</Text>
                <Text style={styles.infoValue}>{order._id}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="event" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Order Date</Text>
                <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Icon name="payment" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>{order.paymentMethod || 'Cash on Delivery'}</Text>
              </View>
            </View>

            {order.paymentInfo?.status && (
              <View style={styles.infoItem}>
                <Icon name="check-circle" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Payment Status</Text>
                  <Text style={[
                    styles.infoValue,
                    { color: order.paymentInfo.status === 'paid' ? '#27ae60' : '#f39c12' }
                  ]}>
                    {order.paymentInfo.status === 'paid' ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Icon name="person" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{order.user?.name || 'N/A'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="email" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{order.user?.email || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={20} color="#666" />
            <View style={styles.addressDetails}>
              <Text style={styles.addressText}>
                {order.shippingInfo?.address || order.shippingAddress?.address || 'N/A'}
              </Text>
              <Text style={styles.addressSubText}>
                {order.shippingInfo?.city || order.shippingAddress?.city || ''}{' '}
                {order.shippingInfo?.postalCode || order.shippingAddress?.postalCode || ''}
              </Text>
              {order.shippingInfo?.country && (
                <Text style={styles.addressSubText}>
                  {order.shippingInfo.country}
                </Text>
              )}
              {order.shippingAddress?.country && !order.shippingInfo?.country && (
                <Text style={styles.addressSubText}>
                  {order.shippingAddress.country}
                </Text>
              )}
            </View>
          </View>
          
          {/* Contact Number */}
          <View style={styles.contactContainer}>
            <Icon name="phone" size={20} color="#666" />
            <Text style={styles.contactText}>
              {order.shippingInfo?.phoneNo || order.shippingAddress?.phone || 'No contact number provided'}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <FlatList
            data={order.orderItems}
            renderItem={renderOrderItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Price</Text>
              <Text style={styles.summaryValue}>₱{order.itemsPrice?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Price</Text>
              <Text style={styles.summaryValue}>₱{order.shippingPrice?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax Price</Text>
              <Text style={styles.summaryValue}>₱{order.taxPrice?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{order.totalPrice?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={() => navigation.navigate('UpdateOrder', { orderId: order._id })}
          >
            <Icon name="update" size={20} color="white" />
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2ecc71',
    borderRadius: 25,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 34,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deliveredDate: {
    fontSize: 14,
    color: '#666',
  },
  infoGrid: {
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressDetails: {
    marginLeft: 10,
    flex: 1,
  },
  addressText: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    marginBottom: 4,
  },
  addressSubText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  orderItemCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27ae60',
  },
  orderItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#2c3e50',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  actionButtons: {
    padding: 15,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  updateButton: {
    backgroundColor: '#f39c12',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});