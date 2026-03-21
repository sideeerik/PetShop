// CVPetShop/frontend/src/Components/UserScreen/ProductDetailsNotif.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function ProductDetailsNotif({ route, navigation }) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  
  const { 
    productId,
    fromNotification,
    discount,
    message,
    updatedAt,
    productData: initialProductData
  } = route.params || {};

  useEffect(() => {
    console.log('🔍 ProductDetailsNotif received params:', { 
      productId, 
      discount,
      message,
      updatedAt,
      hasInitialData: !!initialProductData
    });

    // Process the data that was passed from the notification
    processNotificationData();
  }, []);

  const processNotificationData = () => {
    try {
      setLoading(true);

      // Use the productData from the notification (passed from App.js)
      if (initialProductData && Object.keys(initialProductData).length > 0) {
        console.log('📦 Using notification product data:', initialProductData);
        
        const processedProduct = {
          _id: initialProductData._id || productId,
          name: initialProductData.name || 'Product',
          description: initialProductData.description || 'No description available',
          price: parseFloat(initialProductData.price || 0),
          discountedPrice: parseFloat(initialProductData.discountedPrice || 0),
          discountPercentage: parseInt(discount || initialProductData.discountPercentage || 0),
          images: initialProductData.images || [],
          category: initialProductData.category || 'Uncategorized',
          stock: parseInt(initialProductData.stock || 0),
          brand: initialProductData.brand || 'Unknown',
          rating: parseFloat(initialProductData.rating || 0),
          numReviews: parseInt(initialProductData.numReviews || 0),
          discountEndDate: initialProductData.discountEndDate || updatedAt || new Date().toISOString(),
          message: message || initialProductData.message || `✨ Special discount available!`,
        };

        console.log('📊 Processed product:', {
          name: processedProduct.name,
          price: processedProduct.price,
          discountedPrice: processedProduct.discountedPrice,
          discountPercentage: processedProduct.discountPercentage
        });

        setProduct(processedProduct);
      } else {
        console.log('❌ No product data available in notification');
        // If no data, create a minimal product object from the params
        const minimalProduct = {
          _id: productId,
          name: 'Product',
          description: 'No description available',
          price: 0,
          discountedPrice: 0,
          discountPercentage: parseInt(discount || 0),
          images: [],
          category: 'Uncategorized',
          stock: 0,
          brand: 'Unknown',
          rating: 0,
          numReviews: 0,
          discountEndDate: updatedAt || new Date().toISOString(),
          message: message || 'Special discount available!',
        };
        setProduct(minimalProduct);
      }
    } catch (err) {
      console.error('❌ Error processing notification data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={80} color="#e74c3c" />
        <Text style={styles.errorText}>No product information available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  const calculateTimeLeft = (endDate) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const difference = end - now;

    if (difference <= 0) return 'Expired';

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} left`;
    } else {
      return 'Ending soon';
    }
  };

  const getSavings = () => {
    if (product.price && product.discountedPrice && product.discountedPrice < product.price) {
      return product.price - product.discountedPrice;
    }
    return 0;
  };

  const getStockStatus = () => {
    if (product.stock <= 0) return { text: 'Out of Stock', color: '#e74c3c' };
    if (product.stock < 10) return { text: `Only ${product.stock} left`, color: '#f39c12' };
    return { text: 'In Stock', color: '#2ecc71' };
  };

  const renderStars = () => {
    const rating = product.rating || 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);

    return (
      <View style={styles.ratingContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Icon key={`full-${i}`} name="star" size={16} color="#f39c12" />
        ))}
        {halfStar && <Icon name="star-half" size={16} color="#f39c12" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon key={`empty-${i}`} name="star-border" size={16} color="#f39c12" />
        ))}
        <Text style={styles.reviewCount}>({product.numReviews})</Text>
      </View>
    );
  };

  const getProductImage = () => {
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      return typeof firstImage === 'string' ? firstImage : firstImage?.url;
    }
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
          <Text style={styles.headerTitle}>Special Discount!</Text>
          {fromNotification && (
            <View style={styles.notificationBadge}>
              <Icon name="notifications" size={14} color="#f39c12" />
              <Text style={styles.notificationBadgeText}>New Discount</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {getProductImage() ? (
            <Image 
              source={{ uri: getProductImage() }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image" size={60} color="#ccc" />
            </View>
          )}
          
          {/* Discount Badge */}
          {product.discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {product.discountPercentage}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Notification Message Card */}
        <View style={styles.messageCard}>
          <Icon name="notifications-active" size={24} color="#f39c12" />
          <Text style={styles.messageText}>
            {product.message}
          </Text>
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.categoryBrandContainer}>
            <View style={styles.categoryBadge}>
              <Icon name="category" size={14} color="#3498db" />
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            <View style={styles.brandBadge}>
              <Icon name="business" size={14} color="#666" />
              <Text style={styles.brandText}>{product.brand}</Text>
            </View>
          </View>

          {renderStars()}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              {product.discountedPrice > 0 && product.discountedPrice < product.price ? (
                <>
                  <Text style={styles.originalPrice}>
                    {formatCurrency(product.price)}
                  </Text>
                  <Text style={styles.discountedPrice}>
                    {formatCurrency(product.discountedPrice)}
                  </Text>
                </>
              ) : (
                <Text style={styles.regularPrice}>
                  {formatCurrency(product.price)}
                </Text>
              )}
            </View>

            {product.discountPercentage > 0 && getSavings() > 0 && (
              <View style={styles.savingsContainer}>
                <Icon name="savings" size={16} color="#2ecc71" />
                <Text style={styles.savingsText}>
                  You save {formatCurrency(getSavings())}
                </Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={[styles.stockContainer, { backgroundColor: getStockStatus().color + '20' }]}>
            <Icon 
              name={product.stock > 0 ? "check-circle" : "cancel"} 
              size={16} 
              color={getStockStatus().color} 
            />
            <Text style={[styles.stockText, { color: getStockStatus().color }]}>
              {getStockStatus().text}
            </Text>
          </View>

          {/* Discount End Time */}
          {product.discountEndDate && product.discountPercentage > 0 && (
            <View style={styles.timeLeftContainer}>
              <Icon name="timer" size={16} color="#e74c3c" />
              <Text style={styles.timeLeftText}>
                {calculateTimeLeft(product.discountEndDate)}
              </Text>
            </View>
          )}

          {/* Update Time */}
          <View style={styles.updateRow}>
            <Icon name="update" size={16} color="#666" />
            <Text style={styles.updateLabel}>Discount added:</Text>
            <Text style={styles.updateValue}>{formatDate(updatedAt || product.discountEndDate)}</Text>
          </View>
        </View>

        {/* Product Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {product.description}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.buyButton]}
            onPress={() => {
              navigation.navigate('SingleProduct', { 
                productId: product._id,
                fromNotification: true 
              });
            }}
            disabled={product.stock <= 0}
          >
            <Icon name="shopping-cart" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
            </Text>
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
            Log in to your account to add this item to cart and complete your purchase
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
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
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
  imageContainer: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    height: 250,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  discountBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#e74c3c',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    elevation: 3,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 16,
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
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  categoryBrandContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5,
  },
  categoryText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5,
  },
  brandText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
  },
  priceSection: {
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountedPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  regularPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  savingsText: {
    fontSize: 13,
    color: '#2ecc71',
    fontWeight: '600',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 10,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 10,
  },
  timeLeftText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  updateLabel: {
    fontSize: 12,
    color: '#666',
  },
  updateValue: {
    flex: 1,
    fontSize: 12,
    color: '#999',
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
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  buyButton: {
    backgroundColor: '#e74c3c',
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