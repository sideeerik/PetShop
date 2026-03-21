// CVPetShop/frontend/src/Components/UserScreen/OrderDetailsNotif.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function OrderDetailsNotif({ route, navigation }) {
  const { 
    orderId,
    fromNotification,
    status,
    message,
    updatedAt,
    orderData
  } = route.params || {};

  useEffect(() => {
    console.log('🔍 OrderDetailsNotif received params:', { 
      orderId, 
      status,
      message,
      updatedAt,
      orderData 
    });
    
    if (orderData?.items) {
      console.log('📦 Items received:', JSON.stringify(orderData.items, null, 2));
      console.log('📦 Items count:', orderData.items.length);
    } else {
      console.log('❌ No items in orderData');
    }
  }, []);

  // Helper function to calculate items price if not provided
  const calculateItemsPrice = (items) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      return sum + (price * quantity);
    }, 0);
  };

  // If no data is provided, show error
  if (!orderData && !orderId) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={80} color="#e74c3c" />
        <Text style={styles.errorText}>No order information available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use data from params first, then fallback to orderData
  const order = {
    _id: orderId || orderData?._id,
    orderNumber: orderId?.slice(-8).toUpperCase() || orderData?.orderNumber || 'N/A',
    status: status || orderData?.status || 'Updated',
    message: message || orderData?.message || orderData?.statusMessage,
    updatedAt: updatedAt || orderData?.updatedAt || new Date().toISOString(),
    items: orderData?.items || [],
    itemsPrice: parseFloat(orderData?.itemsPrice) || calculateItemsPrice(orderData?.items),
    shippingPrice: parseFloat(orderData?.shippingPrice) || 0,
    taxPrice: parseFloat(orderData?.taxPrice) || 0,
    total: parseFloat(orderData?.total) || 0,
  };

  console.log('📊 Final order object:', {
    itemsCount: order.items.length,
    itemsPrice: order.itemsPrice,
    shippingPrice: order.shippingPrice,
    taxPrice: order.taxPrice,
    total: order.total
  });

  const getStatusColor = (status) => {
    const statusMap = {
      'pending': '#f39c12',
      'processing': '#3498db',
      'accepted': '#3498db',
      'shipped': '#9b59b6',
      'out for delivery': '#9b59b6',
      'delivered': '#2ecc71',
      'completed': '#2ecc71',
      'cancelled': '#e74c3c',
      'refunded': '#e74c3c'
    };
    return statusMap[status?.toLowerCase()] || '#f39c12';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'pending': 'hourglass-empty',
      'processing': 'autorenew',
      'accepted': 'check-circle',
      'shipped': 'local-shipping',
      'out for delivery': 'local-shipping',
      'delivered': 'verified',
      'completed': 'verified',
      'cancelled': 'cancel',
      'refunded': 'payment'
    };
    return iconMap[status?.toLowerCase()] || 'info';
  };

  const getStatusMessage = (status) => {
    const messageMap = {
      'pending': 'Your order is pending and waiting to be processed.',
      'processing': 'Your order is being processed.',
      'accepted': 'Your order has been accepted and is being prepared.',
      'shipped': 'Your order has been shipped and is on its way!',
      'out for delivery': 'Your order is out for delivery today!',
      'delivered': 'Your order has been delivered. Thank you for shopping with us!',
      'completed': 'Your order is complete. Thank you!',
      'cancelled': 'This order has been cancelled.',
      'refunded': 'This order has been refunded.'
    };
    return messageMap[status?.toLowerCase()] || `Order status updated to: ${status}`;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date unavailable';
    }
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getProductImage = (item) => {
    if (item.image) return item.image;
    if (item.product?.images?.[0]?.url) return item.product.images[0].url;
    if (item.product?.images?.[0]) return item.product.images[0];
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Order Update</Text>
          <Text style={styles.orderId}>#{order.orderNumber}</Text>
          {fromNotification && (
            <View style={styles.notificationBadge}>
              <Icon name="notifications" size={14} color="#f39c12" />
              <Text style={styles.notificationBadgeText}>New Update</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Header Card */}
        <View style={[styles.statusHeaderCard, { backgroundColor: getStatusColor(order.status) + '10' }]}>
          <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(order.status) }]}>
            <Icon name={getStatusIcon(order.status)} size={40} color="#fff" />
          </View>
          <Text style={[styles.statusHeaderText, { color: getStatusColor(order.status) }]}>
            {order.status?.toUpperCase() || 'STATUS UPDATED'}
          </Text>
        </View>

        {/* Notification Message Card */}
        <View style={styles.messageCard}>
          <Icon name="notifications-active" size={24} color="#f39c12" />
          <Text style={styles.messageText}>
            {order.message || getStatusMessage(order.status)}
          </Text>
        </View>

        {/* Order ID and Status */}
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderIdValue} numberOfLines={1} ellipsizeMode="middle">
            {order._id}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Icon name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </View>

        {/* Update Time */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="update" size={20} color="#666" />
            <Text style={styles.infoLabel}>Updated at:</Text>
            <Text style={styles.infoValue}>{formatDate(order.updatedAt)}</Text>
          </View>
        </View>

        {/* Order Items Section */}
        {order.items && order.items.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item, index) => {
              const itemPrice = parseFloat(item.price || 0);
              const itemQuantity = parseInt(item.quantity || 1);
              const subtotal = itemPrice * itemQuantity;
              const productImage = getProductImage(item);
              const itemName = item.name || item.productName || 'Product';

              return (
                <View key={index} style={styles.orderItemContainer}>
                  <View style={styles.orderItem}>
                    <View style={styles.itemImageContainer}>
                      {productImage ? (
                        <Image source={{ uri: productImage }} style={styles.itemImage} />
                      ) : (
                        <View style={styles.itemImagePlaceholder}>
                          <Icon name="image" size={24} color="#ccc" />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {itemName}
                      </Text>
                      <Text style={styles.itemPrice}>{formatCurrency(itemPrice)}</Text>
                      <View style={styles.itemQuantityRow}>
                        <Text style={styles.itemQuantity}>Qty: {itemQuantity}</Text>
                        <Text style={styles.itemSubtotal}>
                          Subtotal: {formatCurrency(subtotal)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noItemsContainer}>
            <Icon name="info-outline" size={24} color="#999" />
            <Text style={styles.noItemsText}>No item details available</Text>
          </View>
        )}

        {/* Order Summary */}
        {(order.itemsPrice > 0 || order.shippingPrice > 0 || order.taxPrice > 0 || order.total > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            {order.itemsPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Price</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.itemsPrice)}</Text>
              </View>
            )}
            
            {order.shippingPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Price</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.shippingPrice)}</Text>
              </View>
            )}

            {order.taxPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax Price</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.taxPrice)}</Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.contactButton]}
            onPress={() => {
              alert('Contact shop support at support@cvpetshop.com');
            }}
          >
            <Icon name="support-agent" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Contact Shop</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.closeButton]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Note about login */}
        <View style={styles.noteContainer}>
          <Icon name="info-outline" size={16} color="#999" />
          <Text style={styles.noteText}>
            To see full order details and tracking, please log in to your account
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  backIcon: {
    padding: 5,
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  orderId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  notificationBadgeText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
  },
  content: {
    padding: 15,
    paddingBottom: 30,
  },
  statusHeaderCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  messageCard: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  orderIdContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  orderItemContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: '#f39c12',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#999',
  },
  itemSubtotal: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  noItemsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noItemsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f39c12',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  contactButton: {
    backgroundColor: '#3498db',
  },
  closeButton: {
    backgroundColor: '#95a5a6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});