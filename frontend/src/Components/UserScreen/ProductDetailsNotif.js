import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeImages = (images = []) =>
  Array.isArray(images)
    ? images
        .map((image) => (typeof image === 'string' ? image : image?.url))
        .filter(Boolean)
    : [];

const normalizeProduct = (source = {}, productId, message, updatedAt) => ({
  _id: source._id || productId || null,
  name: source.name || source.productName || 'Product',
  description: source.description || 'No description available.',
  price: parseNumber(source.price),
  discountedPrice: parseNumber(source.discountedPrice),
  discountPercentage: parseNumber(source.discountPercentage || source.discount),
  images: normalizeImages(source.images),
  category: source.category || 'Uncategorized',
  stock: parseNumber(source.stock),
  brand: source.brand || 'Unknown',
  rating: parseNumber(source.rating || source.ratings),
  numReviews: parseNumber(source.numReviews || source.numOfReviews),
  discountEndDate: source.discountEndDate || source.endDate || null,
  updatedAt: updatedAt || source.updatedAt || source.timestamp || new Date().toISOString(),
  message:
    message ||
    source.message ||
    (parseNumber(source.discountPercentage || source.discount) > 0
      ? `✨ ${source.name || source.productName || 'This product'} is now on sale.`
      : `${source.name || source.productName || 'A wishlist item'} is back in stock.`),
});

export default function ProductDetailsNotif({ route, navigation }) {
  const {
    productId,
    fromNotification,
    discount,
    message,
    updatedAt,
    productData: initialProductData,
    notificationType,
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(() =>
    initialProductData ? normalizeProduct(initialProductData, productId, message, updatedAt) : null
  );
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError('');

      const fallbackProduct = initialProductData
        ? normalizeProduct(initialProductData, productId, message, updatedAt)
        : null;

      if (fallbackProduct && isMounted) {
        setProduct(fallbackProduct);
      }

      if (!productId) {
        if (isMounted) {
          setLoading(false);
          if (!fallbackProduct) {
            setError('No product information available.');
          }
        }
        return;
      }

      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/products/${productId}`);
        if (response.data?.success && response.data.product && isMounted) {
          const merged = normalizeProduct(
            {
              ...response.data.product,
              ...fallbackProduct,
              images:
                normalizeImages(response.data.product.images).length > 0
                  ? response.data.product.images
                  : fallbackProduct?.images || [],
              message: fallbackProduct?.message || message,
            },
            productId,
            fallbackProduct?.message || message,
            updatedAt
          );
          setProduct(merged);
        }
      } catch (fetchError) {
        console.error('Error fetching product details from notification:', fetchError);
        if (isMounted && !fallbackProduct) {
          setError(fetchError.response?.data?.message || 'Failed to load product details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId, initialProductData, message, updatedAt]);

  const isDiscountNotification = useMemo(() => {
    if (notificationType) {
      return ['discount', 'DISCOUNT', 'promotion', 'PRODUCT_DISCOUNT'].includes(notificationType);
    }
    return parseNumber(discount) > 0 || parseNumber(product?.discountPercentage) > 0;
  }, [discount, notificationType, product]);

  const titleText = isDiscountNotification ? 'Discount Details' : 'Wishlist Restock';
  const badgeText = isDiscountNotification ? 'Special Offer' : 'Back in Stock';

  const formatCurrency = (amount) => `₱${parseNumber(amount).toFixed(2)}`;

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date unavailable';
    }
  };

  const calculateTimeLeft = (endDate) => {
    if (!endDate) return '';
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const difference = end - now;

    if (difference <= 0) return 'Offer expired';

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Ending soon';
  };

  const getSavings = () => {
    if (!product) return 0;
    if (product.discountedPrice > 0 && product.discountedPrice < product.price) {
      return product.price - product.discountedPrice;
    }
    return 0;
  };

  const getStockMeta = () => {
    if (!product) return { text: 'Unavailable', color: '#B0A090', icon: 'help-outline' };
    if (product.stock <= 0) return { text: 'Out of Stock', color: '#D46A6A', icon: 'cancel' };
    if (product.stock < 10) return { text: `Only ${product.stock} left`, color: '#D79B3E', icon: 'warning' };
    return { text: 'In Stock', color: '#6E9B68', icon: 'check-circle' };
  };

  const renderStars = () => {
    const ratingValue = product?.rating || 0;
    const fullStars = Math.floor(ratingValue);
    const halfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(ratingValue);

    return (
      <View style={styles.ratingRow}>
        {[...Array(fullStars)].map((_, index) => (
          <Icon key={`full-${index}`} name="star" size={16} color="#D79B3E" />
        ))}
        {halfStar ? <Icon name="star-half" size={16} color="#D79B3E" /> : null}
        {[...Array(emptyStars)].map((_, index) => (
          <Icon key={`empty-${index}`} name="star-border" size={16} color="#D79B3E" />
        ))}
        <Text style={styles.reviewCount}>({product?.numReviews || 0})</Text>
      </View>
    );
  };

  const productImage = product?.images?.[0] || null;
  const stockMeta = getStockMeta();

  if (loading && !product) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5E3C" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorIconWrap}>
          <Icon name="error-outline" size={48} color="#C4A882" />
        </View>
        <Text style={styles.errorTitle}>Product Not Available</Text>
        <Text style={styles.errorText}>{error || 'No product information available.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#8B5E3C" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{titleText}</Text>
          {fromNotification ? (
            <View style={styles.notificationBadge}>
              <Icon name="notifications" size={14} color="#8B5E3C" />
              <Text style={styles.notificationBadgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroImageWrap}>
            {productImage ? (
              <Image source={{ uri: productImage }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Icon name="inventory-2" size={54} color="#C4A882" />
              </View>
            )}

            {isDiscountNotification && product.discountPercentage > 0 ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{product.discountPercentage}% OFF</Text>
              </View>
            ) : (
              <View style={styles.restockBadge}>
                <Icon name="favorite" size={14} color="#FFFFFF" />
                <Text style={styles.restockBadgeText}>Wishlist Update</Text>
              </View>
            )}
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.productName}>{product.name}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Icon name="category" size={14} color="#8B5E3C" />
                <Text style={styles.metaChipText}>{product.category}</Text>
              </View>
              <View style={styles.metaChip}>
                <Icon name="business" size={14} color="#8B5E3C" />
                <Text style={styles.metaChipText}>{product.brand}</Text>
              </View>
            </View>

            {renderStars()}

            <View style={styles.priceRow}>
              {product.discountedPrice > 0 && product.discountedPrice < product.price ? (
                <>
                  <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
                  <Text style={styles.discountedPrice}>{formatCurrency(product.discountedPrice)}</Text>
                </>
              ) : (
                <Text style={styles.regularPrice}>{formatCurrency(product.price)}</Text>
              )}
            </View>

            {getSavings() > 0 ? (
              <View style={styles.savingsPill}>
                <Icon name="savings" size={15} color="#6E9B68" />
                <Text style={styles.savingsText}>You save {formatCurrency(getSavings())}</Text>
              </View>
            ) : null}

            <View style={[styles.stockPill, { backgroundColor: `${stockMeta.color}20` }]}>
              <Icon name={stockMeta.icon} size={16} color={stockMeta.color} />
              <Text style={[styles.stockText, { color: stockMeta.color }]}>{stockMeta.text}</Text>
            </View>
          </View>
        </View>

        <View style={styles.messageCard}>
          <Icon
            name={isDiscountNotification ? 'local-offer' : 'inventory'}
            size={20}
            color="#8B5E3C"
          />
          <Text style={styles.messageText}>
            {product.message ||
              (isDiscountNotification
                ? 'A new deal is available for this product.'
                : 'A product from your wishlist is available again.')}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="update" size={16} color="#8B5E3C" />
            <Text style={styles.infoLabel}>Updated</Text>
            <Text style={styles.infoValue}>{formatDate(product.updatedAt)}</Text>
          </View>

          {isDiscountNotification && product.discountEndDate ? (
            <View style={styles.infoRow}>
              <Icon name="timer" size={16} color="#8B5E3C" />
              <Text style={styles.infoLabel}>Offer</Text>
              <Text style={styles.infoValue}>{calculateTimeLeft(product.discountEndDate)}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Icon name="inventory" size={16} color="#8B5E3C" />
            <Text style={styles.infoLabel}>Stock</Text>
            <Text style={styles.infoValue}>{product.stock}</Text>
          </View>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() =>
              navigation.navigate('MainApp', {
                screen: 'SingleProduct',
                params: { productId: product._id },
              })
            }
            disabled={!product._id}
          >
            <Icon name="shopping-bag" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Open Product</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]} onPress={() => navigation.goBack()}>
            <Icon name="close" size={18} color="#8B5E3C" />
            <Text style={styles.secondaryActionText}>Close</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5E9DA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8B5E3C',
    fontWeight: '600',
  },
  errorIconWrap: {
    backgroundColor: '#FDF0E6',
    borderWidth: 1,
    borderColor: '#E0D6C8',
    borderRadius: 44,
    padding: 18,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  errorText: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 21,
  },
  backButton: {
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
  },
  headerBack: {
    backgroundColor: '#FDF0E6',
    borderRadius: 10,
    padding: 7,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  notificationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    gap: 4,
  },
  notificationBadgeText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0D6C8',
    marginBottom: 14,
  },
  heroImageWrap: {
    height: 260,
    backgroundColor: '#FDF7F2',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#D46A6A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  restockBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8B5E3C',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restockBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  heroBody: {
    padding: 18,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3D2412',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDF0E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  metaChipText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewCount: {
    marginLeft: 6,
    fontSize: 12,
    color: '#9B8A7A',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  originalPrice: {
    fontSize: 17,
    color: '#B0A090',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountedPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D46A6A',
  },
  regularPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#8B5E3C',
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#EEF7EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  savingsText: {
    color: '#6E9B68',
    fontWeight: '700',
    fontSize: 12,
  },
  stockPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8EF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D7C3',
    padding: 16,
    marginBottom: 14,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#6D5848',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    padding: 16,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    width: 70,
    marginLeft: 8,
    fontSize: 13,
    color: '#9B8A7A',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#4A3627',
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5E3C',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6D5848',
    lineHeight: 21,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryAction: {
    backgroundColor: '#8B5E3C',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B5E3C',
  },
  secondaryActionText: {
    color: '#8B5E3C',
    fontWeight: '700',
    fontSize: 14,
  },
});
