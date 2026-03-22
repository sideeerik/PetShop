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
        <View style={styles.errorIconWrap}>
          <Icon name="error-outline" size={48} color="#C4A882" />
        </View>
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
          <Icon name="arrow-back" size={22} color="#8B5E3C" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Order Update</Text>
          <Text style={styles.orderId}>#{order.orderNumber}</Text>
          {fromNotification && (
            <View style={styles.notificationBadge}>
              <Icon name="notifications" size={14} color="#8B5E3C" />
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
          <Icon name="notifications-active" size={22} color="#8B5E3C" />
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
            <Icon name="update" size={18} color="#8B5E3C" />
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
                          <Icon name="image" size={24} color="#C4A882" />
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
                <Text style={styles.summaryLabel}>Shipping Fee</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.shippingPrice)}</Text>
              </View>
            )}

            {order.taxPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.taxPrice)}</Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
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
            <Icon name="close" size={20} color="#8B5E3C" />
            <Text style={styles.secondaryActionText}>Close</Text>
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
    backgroundColor: '#F5E9DA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5E9DA',
  },
  errorIconWrap: {
    backgroundColor: '#FDF0E6',
    borderWidth: 1,
    borderColor: '#E0D6C8',
    borderRadius: 44,
    padding: 18,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#6D5848',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
  },
  backIcon: {
    padding: 7,
    marginRight: 12,
    borderRadius: 10,
    backgroundColor: '#FDF0E6',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  orderId: {
    fontSize: 12,
    color: '#B0A090',
    marginTop: 2,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FDF0E6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  notificationBadgeText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  statusHeaderCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0D6C8',
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
    fontWeight: '800',
  },
  messageCard: {
    backgroundColor: '#FFF8EF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8D7C3',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#6D5848',
    lineHeight: 20,
  },
  orderIdContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#B0A090',
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A3627',
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
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9B8A7A',
    width: 80,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#4A3627',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5E3C',
    marginBottom: 12,
  },
  orderItemContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
    paddingBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FDF7F2',
    borderWidth: 1,
    borderColor: '#E0D6C8',
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
    backgroundColor: '#FDF0E6',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: '#8B5E3C',
    fontWeight: '700',
    marginBottom: 4,
  },
  itemQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#B0A090',
  },
  itemSubtotal: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '600',
  },
  noItemsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  noItemsText: {
    fontSize: 14,
    color: '#B0A090',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#777777',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#8B5E3C',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    gap: 8,
  },
  contactButton: {
    backgroundColor: '#8B5E3C',
  },
  closeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B5E3C',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionText: {
    color: '#8B5E3C',
    fontSize: 14,
    fontWeight: '700',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7F2',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#9B8A7A',
    fontStyle: 'italic',
  },
  backButton: {
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
