// CVPetShop/frontend/src/Components/UserScreen/Checkout.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken, resetToAuth } from '../../utils/helper';
import UserDrawer from './UserDrawer';
import Header from '../layouts/Header';
import { clearCartSQLite } from './Cart';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const TAX_RATE = 0.1; // 10% VAT
const SHIPPING_PRICE = 50;

// ─── Image Carousel Component ─────────────────────────────────────────────────
const ImageCarousel = ({ images, onImagePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = images && images.length > 0 && images.some(img => img?.url);
  const urls = validImages ? images.filter(img => img?.url).map(img => img.url) : [];

  if (!validImages || urls.length === 0) {
    return (
      <TouchableOpacity onPress={onImagePress} style={styles.noImageContainer} activeOpacity={0.7}>
        <Icon name="pets" size={40} color="#C4A882" />
      </TouchableOpacity>
    );
  }

  const goPrev = () => {
    setCurrentIndex(prev => (prev === 0 ? urls.length - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentIndex(prev => (prev === urls.length - 1 ? 0 : prev + 1));
  };

  return (
    <View style={styles.carouselContainer}>
      <TouchableOpacity onPress={onImagePress} activeOpacity={0.9} style={styles.imageWrapper}>
        <Image source={{ uri: urls[currentIndex] }} style={styles.itemImage} resizeMode="cover" />
      </TouchableOpacity>

      {urls.length > 1 && (
        <>
          <TouchableOpacity style={styles.carouselArrowLeft} onPress={goPrev} activeOpacity={0.7}>
            <Text style={styles.carouselArrowText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.carouselArrowRight} onPress={goNext} activeOpacity={0.7}>
            <Text style={styles.carouselArrowText}>›</Text>
          </TouchableOpacity>

          <View style={styles.carouselDots} pointerEvents="none">
            {urls.map((_, i) => (
              <View
                key={i}
                style={[styles.carouselDot, i === currentIndex && styles.carouselDotActive]}
              />
            ))}
          </View>

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>{currentIndex + 1}/{urls.length}</Text>
          </View>
        </>
      )}
    </View>
  );
};

// ─── Full Screen Image Modal ─────────────────────────────────────────────────
const ImageViewerModal = ({ visible, images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  const validImages = images && images.length > 0 && images.some(img => img?.url);
  const urls = validImages ? images.filter(img => img?.url).map(img => img.url) : [];

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex || 0);
    }
  }, [visible, initialIndex]);

  if (!validImages || urls.length === 0) return null;

  const goPrev = () => {
    setCurrentIndex(prev => (prev === 0 ? urls.length - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentIndex(prev => (prev === urls.length - 1 ? 0 : prev + 1));
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
          <Icon name="close" size={30} color="#fff" />
        </TouchableOpacity>

        <View style={styles.modalImageContainer}>
          <Image source={{ uri: urls[currentIndex] }} style={styles.modalImage} resizeMode="contain" />

          {urls.length > 1 && (
            <>
              <TouchableOpacity style={styles.modalArrowLeft} onPress={goPrev}>
                <Text style={styles.modalArrowText}>‹</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalArrowRight} onPress={goNext}>
                <Text style={styles.modalArrowText}>›</Text>
              </TouchableOpacity>

              <View style={styles.modalCounter}>
                <Text style={styles.modalCounterText}>{currentIndex + 1} / {urls.length}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Checkout Item with Quantity Controls ────────────────────────────────────
const CheckoutItem = ({ item, onIncrease, onDecrease, disabled }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const product = item.product || {};
  const images = product.images || [];
  
  const price = product.isOnSale && product.discountedPrice 
    ? parseFloat(product.discountedPrice) 
    : parseFloat(item.price || product.price || 0);
    
  const originalPrice = product.isOnSale && product.discountedPrice 
    ? parseFloat(product.price) 
    : null;
    
  const quantity = item.quantity || 1;
  const name = item.name || product.name || 'Product';

  const handleImagePress = (index) => {
    setImageIndex(index);
    setModalVisible(true);
  };

  return (
    <View style={styles.orderItem}>
      <ImageCarousel 
        images={images} 
        onImagePress={() => handleImagePress(0)}
      />

      <View style={styles.orderItemDetails}>
        <Text style={styles.orderItemName} numberOfLines={2}>{name}</Text>
        
        <View style={styles.priceBlock}>
          {originalPrice ? (
            <>
              <View style={styles.originalPriceRow}>
                <Text style={styles.originalPrice}>₱{originalPrice.toFixed(2)}</Text>
                {product.discountPercentage && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{product.discountPercentage}% OFF</Text>
                  </View>
                )}
              </View>
              <Text style={styles.discountedPriceText}>₱{price.toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.orderItemPrice}>₱{price.toFixed(2)}</Text>
          )}
        </View>
        
        <View style={styles.orderItemPriceRow}>
          <Text style={styles.orderItemSubtotal}>
            Subtotal: ₱{(price * quantity).toFixed(2)}
          </Text>
        </View>

        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Qty:</Text>
          
          <TouchableOpacity
            style={[styles.qtyBtn, disabled && styles.qtyBtnDisabled]}
            onPress={() => onDecrease(item)}
            disabled={disabled}
          >
            <Icon name="remove" size={16} color="#8B5E3C" />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{quantity}</Text>

          <TouchableOpacity
            style={[styles.qtyBtn, disabled && styles.qtyBtnDisabled]}
            onPress={() => onIncrease(item)}
            disabled={disabled}
          >
            <Icon name="add" size={16} color="#8B5E3C" />
          </TouchableOpacity>
        </View>
      </View>

      <ImageViewerModal
        visible={modalVisible}
        images={images}
        initialIndex={imageIndex}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

// ─── Main Checkout Screen ─────────────────────────────────────────────────────
export default function Checkout({ route, navigation }) {
  const { 
    cartItems,           // For cart checkout (multiple items)
    totalAmount,         // For cart checkout
    onCheckoutSuccess,   // For cart checkout callback
    productId,           // For solo checkout (Buy Now)
    quantity = 1,        // For solo checkout quantity
    product              // For solo checkout (pre-loaded product)
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingQty, setUpdatingQty] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [soloProduct, setSoloProduct] = useState(product || null);
  const [orderItems, setOrderItems] = useState([]);
  const [totals, setTotals] = useState({
    itemsPrice: 0,
    taxPrice: 0,
    shippingPrice: SHIPPING_PRICE,
    totalPrice: 0,
    totalSavings: 0
  });
  
  // Determine checkout type
  const isSoloCheckout = !!productId || !!product;

  // Form state (pre-filled from user profile)
  const [formData, setFormData] = useState({
    street: '',
    barangay: '',
    city: '',
    zipcode: '',
    contact: '',
  });

  // Form errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    initializeCheckout();
  }, []);

  const initializeCheckout = async () => {
    // Validate checkout data
    if (!isSoloCheckout && (!cartItems || cartItems.length === 0)) {
      Alert.alert('Error', 'No items to checkout', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    await fetchUserProfile();
    
    if (isSoloCheckout) {
      if (soloProduct) {
        // Product was pre-loaded from navigation
        processSoloCheckout(soloProduct);
      } else if (productId) {
        // Need to fetch product details
        await fetchProductDetails();
      }
    } else {
      // Cart checkout - process all cart items
      processCartCheckout();
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        resetToAuth(navigation);
        return;
      }

      const res = await axios.get(`${BACKEND_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success || res.data.user) {
        const userData = res.data.user || res.data;
        setUserProfile(userData);
        
        // Extract address fields correctly - handle both nested and flat structures
        const address = userData.address || {};
        
        setFormData({
          street: address.street || userData.street || '',
          barangay: address.barangay || userData.barangay || '',
          city: address.city || userData.city || '',
          zipcode: address.zipcode || userData.zipcode || '',
          contact: userData.contact || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/products/${productId}`);
      if (res.data?.success) {
        const productData = res.data.product;
        setSoloProduct(productData);
        processSoloCheckout(productData);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product details', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getEffectivePrice = (product) => {
    return product.isOnSale && product.discountedPrice 
      ? parseFloat(product.discountedPrice) 
      : parseFloat(product.price || 0);
  };

  const processSoloCheckout = (productData) => {
    // Process single product for checkout
    const effectivePrice = getEffectivePrice(productData);
    const itemsPrice = effectivePrice * quantity;
    const originalPrice = productData.isOnSale && productData.discountedPrice 
      ? parseFloat(productData.price) * quantity 
      : itemsPrice;
    const savings = originalPrice - itemsPrice;
    
    const taxPrice = itemsPrice * TAX_RATE;
    const totalPrice = itemsPrice + taxPrice + SHIPPING_PRICE;
    
    setOrderItems([{
      product: productData,
      quantity: quantity,
      price: effectivePrice,
      originalPrice: productData.isOnSale && productData.discountedPrice ? parseFloat(productData.price) : null,
      name: productData.name,
      image: productData.images?.[0]?.url || ''
    }]);
    
    setTotals({
      itemsPrice,
      taxPrice,
      shippingPrice: SHIPPING_PRICE,
      totalPrice,
      totalSavings: savings
    });
  };

  const processCartCheckout = () => {
    // Process multiple cart items for checkout
    const items = cartItems.map(item => {
      const product = item.product || {};
      const effectivePrice = getEffectivePrice(product);
      const qty = item.quantity || 1;
      
      return {
        product: product,
        quantity: qty,
        price: effectivePrice,
        originalPrice: product.isOnSale && product.discountedPrice ? parseFloat(product.price) : null,
        name: product.name || 'Product',
        image: product.images?.[0]?.url || ''
      };
    });

    const itemsPrice = items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    const originalTotal = items.reduce(
      (sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 
      0
    );
    
    const savings = originalTotal - itemsPrice;
    const taxPrice = itemsPrice * TAX_RATE;
    const totalPrice = itemsPrice + taxPrice + SHIPPING_PRICE;

    setOrderItems(items);
    setTotals({
      itemsPrice,
      taxPrice,
      shippingPrice: SHIPPING_PRICE,
      totalPrice,
      totalSavings: savings
    });
  };

  // ─── Quantity Update Functions ─────────────────────────────────────────────
  const handleIncreaseQuantity = async (item) => {
    if (isSoloCheckout) {
      // For solo checkout, just update local state
      const newQuantity = item.quantity + 1;
      updateLocalQuantity(item, newQuantity);
    } else {
      // For cart checkout, update via API
      try {
        setUpdatingQty(true);
        const token = await getToken();
        
        await axios.patch(
          `${BACKEND_URL}/api/v1/cart/update`,
          { 
            productId: item.product._id, 
            action: 'increase' 
          },
          { 
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        
        // Update local state
        const updatedItems = orderItems.map(orderItem => {
          if (orderItem.product._id === item.product._id) {
            return { ...orderItem, quantity: orderItem.quantity + 1 };
          }
          return orderItem;
        });
        
        updateOrderItems(updatedItems);
      } catch (error) {
        console.error('Error updating quantity:', error);
        Alert.alert('Error', 'Failed to update quantity');
      } finally {
        setUpdatingQty(false);
      }
    }
  };

  const handleDecreaseQuantity = async (item) => {
    if (item.quantity <= 1) {
      // Ask if user wants to remove the item
      Alert.alert(
        'Remove Item',
        'Do you want to remove this item from your order?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => handleRemoveItem(item)
          }
        ]
      );
      return;
    }

    if (isSoloCheckout) {
      // For solo checkout, just update local state
      const newQuantity = item.quantity - 1;
      updateLocalQuantity(item, newQuantity);
    } else {
      // For cart checkout, update via API
      try {
        setUpdatingQty(true);
        const token = await getToken();
        
        await axios.patch(
          `${BACKEND_URL}/api/v1/cart/update`,
          { 
            productId: item.product._id, 
            action: 'decrease' 
          },
          { 
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        
        // Update local state
        const updatedItems = orderItems.map(orderItem => {
          if (orderItem.product._id === item.product._id) {
            return { ...orderItem, quantity: orderItem.quantity - 1 };
          }
          return orderItem;
        });
        
        updateOrderItems(updatedItems);
      } catch (error) {
        console.error('Error updating quantity:', error);
        Alert.alert('Error', 'Failed to update quantity');
      } finally {
        setUpdatingQty(false);
      }
    }
  };

  const handleRemoveItem = async (item) => {
    if (isSoloCheckout) {
      // For solo checkout, go back to previous screen
      navigation.goBack();
    } else {
      // For cart checkout, remove via API
      try {
        setUpdatingQty(true);
        const token = await getToken();
        
        await axios.delete(
          `${BACKEND_URL}/api/v1/cart/remove/${item.product._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Remove item from local state
        const updatedItems = orderItems.filter(
          orderItem => orderItem.product._id !== item.product._id
        );
        
        if (updatedItems.length === 0) {
          // No items left, go back
          Alert.alert('Cart Empty', 'Your cart is now empty', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          updateOrderItems(updatedItems);
        }
      } catch (error) {
        console.error('Error removing item:', error);
        Alert.alert('Error', 'Failed to remove item');
      } finally {
        setUpdatingQty(false);
      }
    }
  };

  const updateLocalQuantity = (item, newQuantity) => {
    const updatedItems = orderItems.map(orderItem => {
      if (orderItem.product._id === item.product._id) {
        return { ...orderItem, quantity: newQuantity };
      }
      return orderItem;
    });
    
    updateOrderItems(updatedItems);
  };

  const updateOrderItems = (updatedItems) => {
    setOrderItems(updatedItems);
    
    // Recalculate totals
    const itemsPrice = updatedItems.reduce(
      (sum, item) => sum + (parseFloat(item.price) * item.quantity), 
      0
    );
    
    const originalTotal = updatedItems.reduce(
      (sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 
      0
    );
    
    const savings = originalTotal - itemsPrice;
    const taxPrice = itemsPrice * TAX_RATE;
    const totalPrice = itemsPrice + taxPrice + SHIPPING_PRICE;

    setTotals({
      itemsPrice,
      taxPrice,
      shippingPrice: SHIPPING_PRICE,
      totalPrice,
      totalSavings: savings
    });
  };

  // ─── Form Validation ────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    // Check if at least one address field is filled (street or barangay)
    if (!formData.street.trim() && !formData.barangay.trim()) {
      newErrors.address = 'Street or Barangay is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.zipcode.trim()) {
      newErrors.zipcode = 'ZIP code is required';
    } else if (!/^\d{4}$/.test(formData.zipcode)) {
      newErrors.zipcode = 'ZIP code must be 4 digits';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^[0-9]{11}$/.test(formData.contact.replace(/\D/g, ''))) {
      newErrors.contact = 'Please enter a valid 11-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit Order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    Alert.alert(
      'Confirm Order',
      `Are you sure you want to place this order for ₱${totals.totalPrice.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const token = await getToken();

              let response;
              
              if (isSoloCheckout && soloProduct) {
                // Solo checkout - POST /api/v1/checkout/solo
                console.log('Placing solo checkout order for product:', soloProduct._id);
                response = await axios.post(
                  `${BACKEND_URL}/api/v1/checkout/solo`,
                  {
                    productId: soloProduct._id,
                    quantity: orderItems[0]?.quantity || quantity,
                  },
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
              } else {
                // Cart checkout - POST /api/v1/checkout
                console.log('Placing cart checkout order with', orderItems.length, 'items');
                response = await axios.post(
                  `${BACKEND_URL}/api/v1/checkout`,
                  {},
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
              }

              console.log('Order response:', response.data);

              if (response.data.success) {
                // Clear cart from SQLite if it was a cart checkout
                if (!isSoloCheckout && onCheckoutSuccess) {
                  await onCheckoutSuccess();
                  await clearCartSQLite();
                }

                // Navigate to order success screen
                navigation.replace('OrderSuccess', {
                  order: response.data.order,
                  orderId: response.data.order._id,
                  orderNumber: response.data.order.orderNumber,
                });
              }
            } catch (error) {
              console.error('Error placing order:', error);
              
              const errorMessage = error.response?.data?.message;
              const statusCode = error.response?.status;
              
              if (statusCode === 404) {
                Alert.alert(
                  'API Error',
                  'Checkout endpoint not found. Please check your backend routes.',
                );
              } else if (errorMessage?.includes('Shipping address incomplete')) {
                Alert.alert(
                  'Incomplete Profile',
                  'Please update your profile with a complete address and contact number before checking out.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Update Profile', 
                      onPress: () => navigation.navigate('Profile')
                    }
                  ]
                );
              } else if (errorMessage?.includes('Cart is empty')) {
                Alert.alert('Error', 'Your cart is empty');
                navigation.goBack();
              } else if (errorMessage?.includes('Product out of stock')) {
                Alert.alert('Error', 'This product is out of stock');
                navigation.goBack();
              } else {
                Alert.alert(
                  'Order Failed',
                  errorMessage || `Failed to place order. Status: ${statusCode || 'Unknown error'}`,
                );
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ─── Render Order Items ─────────────────────────────────────────────────────
  const renderOrderItems = () => {
    if (orderItems.length === 0) return null;

    return orderItems.map((item, index) => (
      <CheckoutItem
        key={index}
        item={item}
        onIncrease={handleIncreaseQuantity}
        onDecrease={handleDecreaseQuantity}
        disabled={submitting || updatingQty}
      />
    ));
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5E3C" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </UserDrawer>
    );
  }

  // Show empty state if no items to checkout
  if (orderItems.length === 0) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Icon name="shopping-cart" size={80} color="#C4A882" />
          </View>
          <Text style={styles.emptyText}>No items to checkout</Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Icon name="storefront" size={18} color="white" />
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </UserDrawer>
    );
  }

  // Check if address is complete for warning message
  const isAddressComplete = formData.street && formData.barangay && formData.city && formData.zipcode && formData.contact;

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Icon name="arrow-back" size={22} color="#8B5E3C" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Checkout</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                🛍️ Order Summary ({orderItems.length} {orderItems.length === 1 ? 'item' : 'items'})
              </Text>
              {renderOrderItems()}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 Price Details</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Items Subtotal</Text>
                <Text style={styles.priceValue}>₱{totals.itemsPrice.toFixed(2)}</Text>
              </View>
              
              {totals.totalSavings > 0 && (
                <View style={styles.savingsRow}>
                  <Icon name="savings" size={16} color="#4caf50" />
                  <Text style={styles.savingsText}>You save: ₱{totals.totalSavings.toFixed(2)}</Text>
                </View>
              )}
              
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Shipping Fee</Text>
                <Text style={styles.priceValue}>₱{totals.shippingPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax (10% VAT)</Text>
                <Text style={styles.priceValue}>₱{totals.taxPrice.toFixed(2)}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{totals.totalPrice.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📦 Shipping Information</Text>
              <Text style={styles.sectionSubtitle}>
                Please review your shipping details below
              </Text>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Icon name="location-on" size={18} color="#8B5E3C" />
                  <Text style={styles.infoLabel}>Street:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {formData.street || 'Not set'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="map" size={18} color="#8B5E3C" />
                  <Text style={styles.infoLabel}>Barangay:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {formData.barangay || 'Not set'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="location-city" size={18} color="#8B5E3C" />
                  <Text style={styles.infoLabel}>City:</Text>
                  <Text style={styles.infoValue}>
                    {formData.city || 'Not set'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="markunread-mailbox" size={18} color="#8B5E3C" />
                  <Text style={styles.infoLabel}>ZIP Code:</Text>
                  <Text style={styles.infoValue}>
                    {formData.zipcode || 'Not set'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { marginBottom: 0 }]}>
                  <Icon name="phone" size={18} color="#8B5E3C" />
                  <Text style={styles.infoLabel}>Contact:</Text>
                  <Text style={styles.infoValue}>
                    {formData.contact || 'Not set'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => navigation.navigate('Profile')}
              >
                <Icon name="edit" size={17} color="#8B5E3C" />
                <Text style={styles.editProfileText}>Update Shipping Info</Text>
              </TouchableOpacity>

              {!isAddressComplete && (
                <View style={styles.warningBox}>
                  <Icon name="warning" size={18} color="#b45309" />
                  <Text style={styles.warningText}>
                    Please update your profile with complete shipping information (Street, Barangay, City, ZIP Code, and Contact Number) before checkout
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.totalContainer}>
            <Text style={styles.bottomTotalLabel}>Total to Pay</Text>
            <Text style={styles.bottomTotalValue}>₱{totals.totalPrice.toFixed(2)}</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.placeOrderBtn,
              (submitting || updatingQty || !isAddressComplete) && styles.disabledBtn
            ]}
            onPress={handlePlaceOrder}
            disabled={submitting || updatingQty || !isAddressComplete}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="white" />
                <Text style={styles.placeOrderText}>Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  // —— Base —————————————————————————————————————————————————————————————————————
  safeArea: { flex: 1, backgroundColor: '#F5E9DA' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5E9DA', paddingHorizontal: 20,
  },
  loadingText: { fontSize: 15, color: '#B0A090', marginTop: 12 },
  emptyIconWrapper: {
    backgroundColor: '#FDF0E6', width: 100, height: 100,
    borderRadius: 50, justifyContent: 'center', alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: '#E0D6C8',
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8B5E3C', marginTop: 8, marginBottom: 20 },
  shopNowBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#8B5E3C', paddingHorizontal: 26, paddingVertical: 13,
    borderRadius: 25,
  },
  shopNowText: { color: 'white', fontSize: 15, fontWeight: '700', marginLeft: 7 },

  // —— Page Header —————————————————————————————————————————————————————————————
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0D6C8',
  },
  backButton: {
    width: 38, height: 38, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FDF0E6', borderRadius: 10, borderWidth: 1, borderColor: '#E0D6C8',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#8B5E3C' },

  // —— Sections ———————————————————————————————————————————————————————————————
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0D6C8',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#8B5E3C', marginBottom: 14 },
  sectionSubtitle: { fontSize: 13, color: '#B0A090', marginBottom: 14, marginTop: -6 },

  // —— Order Item —————————————————————————————————————————————————————————————
  orderItem: {
    flexDirection: 'row',
    backgroundColor: '#FDF7F2',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  noImageContainer: {
    width: 80, height: 80, borderRadius: 10,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  carouselContainer: {
    width: 80, height: 80, borderRadius: 10,
    overflow: 'hidden', backgroundColor: '#FDF0E6',
    marginRight: 12, position: 'relative',
  },
  imageWrapper: { width: '100%', height: '100%' },
  itemImage: { width: '100%', height: '100%' },
  carouselArrowLeft: {
    position: 'absolute', left: 2, top: '50%', transform: [{ translateY: -11 }],
    backgroundColor: 'rgba(139,94,60,0.45)', borderRadius: 11,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  carouselArrowRight: {
    position: 'absolute', right: 2, top: '50%', transform: [{ translateY: -11 }],
    backgroundColor: 'rgba(139,94,60,0.45)', borderRadius: 11,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  carouselArrowText: { color: 'white', fontSize: 15, fontWeight: 'bold', lineHeight: 18 },
  carouselDots: {
    position: 'absolute', bottom: 2, width: '100%',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  carouselDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 2 },
  carouselDotActive: { backgroundColor: '#8B5E3C', width: 6, height: 6, borderRadius: 3 },
  imageCounter: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(61,36,18,0.55)', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  imageCounterText: { color: 'white', fontSize: 8, fontWeight: '600' },

  // —— Item Details ———————————————————————————————————————————————————————————
  orderItemDetails: { flex: 1, justifyContent: 'space-between' },
  orderItemName: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6 },

  priceBlock: { marginBottom: 4 },
  originalPriceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  originalPrice: { fontSize: 12, color: '#B0A090', textDecorationLine: 'line-through', marginRight: 6 },
  discountBadge: { backgroundColor: '#FF8A8A', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  discountBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  discountedPriceText: { fontSize: 14, fontWeight: '700', color: '#8B5E3C' },
  orderItemPrice: { fontSize: 14, fontWeight: '700', color: '#8B5E3C' },

  orderItemPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  orderItemSubtotal: { fontSize: 12, color: '#B0A090', fontWeight: '500' },

  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  quantityLabel: { fontSize: 12, color: '#777777', marginRight: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#FDF0E6', borderWidth: 1, borderColor: '#E0D6C8',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyText: { fontSize: 14, fontWeight: '600', color: '#333333', minWidth: 28, textAlign: 'center' },

  // —— Modal ————————————————————————————————————————————————————————————————
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20, padding: 10 },
  modalImageContainer: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },
  modalArrowLeft: {
    position: 'absolute', left: 20, top: '50%', transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 30,
    width: 50, height: 50, justifyContent: 'center', alignItems: 'center',
  },
  modalArrowRight: {
    position: 'absolute', right: 20, top: '50%', transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 30,
    width: 50, height: 50, justifyContent: 'center', alignItems: 'center',
  },
  modalArrowText: { color: 'white', fontSize: 40, fontWeight: 'bold', lineHeight: 45 },
  modalCounter: {
    position: 'absolute', bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20,
  },
  modalCounterText: { color: 'white', fontSize: 14, fontWeight: '600' },

  // —— Price Breakdown ————————————————————————————————————————————————————————
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6,
  },
  priceLabel: { fontSize: 14, color: '#777777' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#333333' },
  savingsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0faf0', padding: 8, borderRadius: 8, marginVertical: 4,
  },
  savingsText: { fontSize: 13, fontWeight: '600', color: '#4caf50', marginLeft: 6 },
  divider: { height: 1, backgroundColor: '#E0D6C8', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#333333' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#8B5E3C' },

  // —— Shipping Info ——————————————————————————————————————————————————————————
  infoBox: {
    backgroundColor: '#FDF7F2', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoLabel: { fontSize: 13, color: '#B0A090', width: 72, marginLeft: 8 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333333' },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FDF0E6', paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#8B5E3C', borderStyle: 'dashed', marginTop: 4,
  },
  editProfileText: { fontSize: 14, fontWeight: '600', color: '#8B5E3C', marginLeft: 8 },
  warningBox: {
    flexDirection: 'row', backgroundColor: '#fef3c7',
    borderRadius: 10, padding: 12, marginTop: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#fcd34d',
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400e', marginLeft: 8, lineHeight: 18 },

  // —— Bottom Bar ————————————————————————————————————————————————————————————
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0D6C8',
    elevation: 10, shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  totalContainer: { flex: 1, marginRight: 12 },
  bottomTotalLabel: { fontSize: 12, color: '#B0A090', fontWeight: '500' },
  bottomTotalValue: { fontSize: 18, fontWeight: '900', color: '#8B5E3C' },
  placeOrderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#8B5E3C', paddingVertical: 14, borderRadius: 12, gap: 8,
    elevation: 2, shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  placeOrderText: { fontSize: 15, fontWeight: '700', color: 'white' },
  disabledBtn: { opacity: 0.5 },
});
