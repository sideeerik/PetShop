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
            <Icon name="arrow-back" size={22} color="#7A4B2A" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Admin</Text>
            <Text style={styles.headerTitle}>Order Details</Text>
          </View>
          <View style={styles.headerBadge}>
            <Icon name="receipt-long" size={18} color="#7A4B2A" />
          </View>
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
    backgroundColor: '#F6EDE3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6EDE3',
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
    backgroundColor: '#8B5E3C',
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FDF7F1',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
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
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: '#FFFDF9',
    marginTop: 12,
    marginHorizontal: 15,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7D8C8',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2A1F',
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
    color: '#7C6555',
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
    color: '#8E7665',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#5C3B28',
    fontWeight: '600',
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
    color: '#5C3B28',
    fontWeight: '600',
    marginBottom: 4,
  },
  addressSubText: {
    fontSize: 14,
    color: '#7C6555',
    lineHeight: 20,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFE0D2',
  },
  contactText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#5C3B28',
    fontWeight: '600',
    flex: 1,
  },
  orderItemCard: {
    backgroundColor: '#F9F2EB',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3E2A1F',
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5E3C',
  },
  orderItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#7C6555',
  },
  itemSubtotal: {
    fontSize: 14,
    color: '#7C6555',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#F9F2EB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7C6555',
  },
  summaryValue: {
    fontSize: 14,
    color: '#5C3B28',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8D6C3',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B5E3C',
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
    borderRadius: 16,
    gap: 10,
  },
  updateButton: {
    backgroundColor: '#D79B3E',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});
