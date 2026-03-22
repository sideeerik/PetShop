// C&V PetShop/frontend/src/Components/AuthenticationScreen/LandingPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getUser, getToken } from '../../utils/helper';
import GuestDrawer from './GuestDrawer';
import Header from '../layouts/Header';
import { useWishlist } from '../../context/WishlistContext';
import WishlistButton from '../UserScreen/WishlistButton';
import { useFocusEffect } from '@react-navigation/native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

const CATEGORIES = [
  'All', 'Pet Food', 'Pet Accessories', 'Pet Toys',
  'Health & Wellness', 'Grooming Supplies', 'Feeding Supplies', 'Housing & Cages',
];

const BANNERS = [
  {
    image: require('../sliding/1.png'),
    title: 'Premium Pet Food',
    subtitle: 'Up to 40% Off',
    buttonText: 'Shop Now'
  },
  {
    image: require('../sliding/2.png'),
    title: 'New Arrivals',
    subtitle: 'Latest Toys & Accessories',
    buttonText: 'Explore'
  },
  {
    image: require('../sliding/3.png'),
    title: 'Health & Wellness',
    subtitle: 'Vet Recommended Products',
    buttonText: 'Learn More'
  },
];

// ─── Product Image Carousel ───────────────────────────────────────────────────
const ProductImageCarousel = ({ images, onCardPress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = images && images.length > 0 && images.some(img => img && (img.url || typeof img === 'string'));
  const urls = validImages 
    ? images.filter(img => img && (img.url || typeof img === 'string')).map(img => img.url || img) 
    : [];

  if (!validImages || urls.length === 0) {
    return (
      <TouchableOpacity onPress={onCardPress} activeOpacity={0.85} style={styles.noImage}>
        <Icon name="pets" size={40} color="#C4A882" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.imageCarouselContainer}>
      <TouchableOpacity onPress={onCardPress} activeOpacity={0.85} style={{ flex: 1 }}>
        <Image source={{ uri: urls[currentIndex] }} style={styles.productImage} resizeMode="cover" />
      </TouchableOpacity>

      {urls.length > 1 && (
        <>
          <TouchableOpacity
            style={styles.arrowLeft}
            onPress={() => setCurrentIndex(p => (p === 0 ? urls.length - 1 : p - 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.arrowRight}
            onPress={() => setCurrentIndex(p => (p === urls.length - 1 ? 0 : p + 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
          <View style={styles.imageIndicatorContainer} pointerEvents="none">
            {urls.map((_, i) => (
              <View key={i} style={[styles.imageIndicatorDot, i === currentIndex && styles.imageIndicatorDotActive]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

// ─── Star Rating Component ───────────────────────────────────────────────────
const StarRating = ({ rating, size = 12, showRating = false }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={styles.starRatingContainer}>
      <View style={styles.starsRow}>
        {[...Array(fullStars)].map((_, i) => (
          <Icon key={`full-${i}`} name="star" size={size} color="#FFD700" />
        ))}
        {halfStar && <Icon name="star-half" size={size} color="#FFD700" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon key={`empty-${i}`} name="star-border" size={size} color="#C4A882" />
        ))}
      </View>
      {showRating && <Text style={styles.ratingText}>({rating.toFixed(1)})</Text>}
    </View>
  );
};

// ─── Toast Component ──────────────────────────────────────────────────────────
const Toast = ({ message, opacity }) => (
  <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
    <Text style={styles.toastText}>{message}</Text>
  </Animated.View>
);

// ─── Banner Component with Text Overlay ───────────────────────────────────────
const BannerItem = ({ item, onPress }) => (
  <TouchableOpacity 
    style={styles.bannerContainer} 
    activeOpacity={0.9}
    onPress={onPress}
  >
    <Image source={item.image} style={styles.bannerImage} />
    
    {/* Text Overlay with Gradient Effect */}
    <View style={styles.bannerOverlay}>
      <View style={styles.bannerTextContainer}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
        <View style={styles.bannerButton}>
          <Text style={styles.bannerButtonText}>{item.buttonText}</Text>
          <Icon name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Home Screen (Landing Page) ──────────────────────────────────────────────
export default function LandingPage({ navigation }) {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortAscending, setSortAscending] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [cart, setCart] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Review states
  const [productReviews, setProductReviews] = useState({});
  const [loadingReviews, setLoadingReviews] = useState({});

  // Wishlist
  const { isInWishlist, toggleWishlist, fetchWishlist, wishlistMap } = useWishlist();

  const flatListRef = useRef(null);
  const autoSlideTimer = useRef(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const token = await getToken();
      const authenticated = !!token;
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const userData = await getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
      
      return authenticated;
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  }, []);

  // Refresh wishlist when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkAuth();
      if (isAuthenticated) {
        fetchWishlist();
      }
      return () => {
        // Cleanup if needed
      };
    }, [checkAuth, isAuthenticated, fetchWishlist])
  );

  useEffect(() => {
    loadInitialData();
    startAutoSlide();
    return () => stopAutoSlide();
  }, []);

  useEffect(() => { 
    filterAndSortProducts(); 
  }, [products, selectedCategory, searchQuery, sortAscending]);

  useEffect(() => {
    if (BANNERS.length > 1) startAutoSlide();
    return () => stopAutoSlide();
  }, [currentBannerIndex]);

  // Fetch reviews for all products when products are loaded
  useEffect(() => {
    if (products.length > 0) {
      fetchAllProductReviews();
    }
  }, [products]);

  const startAutoSlide = () => {
    stopAutoSlide();
    autoSlideTimer.current = setInterval(() => {
      const next = (currentBannerIndex + 1) % BANNERS.length;
      flatListRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
      setCurrentBannerIndex(next);
    }, 3000);
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) { 
      clearInterval(autoSlideTimer.current); 
      autoSlideTimer.current = null; 
    }
  };

  const handleScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== currentBannerIndex) setCurrentBannerIndex(idx);
  };

  // Handle banner press
  const handleBannerPress = (banner) => {
    // Navigate based on banner type or category
    if (banner.title.includes('Pet Food')) {
      selectCategory('Pet Food');
    } else if (banner.title.includes('New Arrivals')) {
      setSortAscending(false); // Sort by newest (assuming highest price as proxy)
      showToast('Showing new arrivals');
    } else if (banner.title.includes('Health')) {
      selectCategory('Health & Wellness');
    }
  };

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const loadInitialData = async () => {
    try {
      await checkAuth();
      await fetchProducts();
      if (isAuthenticated) {
        await fetchCart();
        await fetchWishlist();
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { 
    setRefreshing(true); 
    await loadInitialData(); 
    await fetchAllProductReviews();
    setRefreshing(false); 
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/products`);
      if (res.data?.success) {
        setProducts(res.data.products || []);
        setFilteredProducts(res.data.products || []);
      }
    } catch (e) { 
      console.error('Error fetching products:', e.message); 
    }
  };

  const fetchCart = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.cart) setCart(res.data.cart.items || []);
    } catch (e) { 
      console.error('Error fetching cart:', e); 
    }
  };

  // ── Fetch reviews for all products ────────────────────────────────────────
  const fetchAllProductReviews = async () => {
    if (!products || products.length === 0) return;
    
    const reviewPromises = products.map(product => 
      fetchProductReviews(product._id)
    );
    
    await Promise.all(reviewPromises);
  };

  const fetchProductReviews = async (productId) => {
    try {
      setLoadingReviews(prev => ({ ...prev, [productId]: true }));
      
      const response = await axios.get(`${BACKEND_URL}/api/v1/reviews?productId=${productId}`);
      
      if (response.data.success) {
        setProductReviews(prev => ({ 
          ...prev, 
          [productId]: response.data.reviews || [] 
        }));
      }
    } catch (error) {
      console.error(`Error fetching reviews for product ${productId}:`, error);
      setProductReviews(prev => ({ ...prev, [productId]: [] }));
    } finally {
      setLoadingReviews(prev => ({ ...prev, [productId]: false }));
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];
    if (selectedCategory !== 'All') filtered = filtered.filter(p => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    
    filtered.sort((a, b) => {
      const priceA = a.isOnSale && a.discountedPrice ? parseFloat(a.discountedPrice) : parseFloat(a.price || 0);
      const priceB = b.isOnSale && b.discountedPrice ? parseFloat(b.discountedPrice) : parseFloat(b.price || 0);
      return sortAscending ? priceA - priceB : priceB - priceA;
    });
    
    setFilteredProducts(filtered);
  };

  // ── Calculate average rating for a product ───────────────────────────────
  const getProductAverageRating = (productId) => {
    const reviews = productReviews[productId] || [];
    if (reviews.length === 0) return 0;
    
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return sum / reviews.length;
  };

  // UPDATED: Handle add to cart - redirect to Login for guests
  const handleAddToCart = async (product) => {
    try {
      const authenticated = await checkAuth();
      if (!authenticated) {
        navigation.navigate('Login');
        return;
      }

      const token = await getToken();
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/cart/add`,
        { productId: product._id },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setCart(res.data.cart.items || []);
        showToast(`✅ "${product.name}" added to cart!`);
      }
    } catch (e) {
      console.error('Error adding to cart:', e);
      showToast(`❌ ${e.response?.data?.message || e.message}`);
    }
  };

  // UPDATED: Handle buy now - redirect to Login for guests
  const handleBuyNow = (product) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('Checkout', {
      productId: product._id,
      quantity: 1,
      product: {
        ...product,
        effectivePrice: product.isOnSale && product.discountedPrice ? product.discountedPrice : product.price
      },
    });
  };

  // UPDATED: Handle wishlist toggle - redirect to Login for guests
  const handleWishlistToggle = async (product, result) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    
    if (result && result.message) {
      showToast(result.message);
    }
    setProducts([...products]);
  };

  // UPDATED: Handle product press - redirect to Login for guests instead of SingleProduct
  const handleProductPress = (product) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('SingleProduct', { productId: product._id });
  };

  const toggleSort = () => setSortAscending(p => !p);
  const selectCategory = (cat) => { setSelectedCategory(cat); setShowCategories(false); };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderBannerItem = ({ item }) => (
    <BannerItem item={item} onPress={() => handleBannerPress(item)} />
  );

  const renderProductItem = ({ item }) => {
    const displayPrice = item.isOnSale && item.discountedPrice 
      ? parseFloat(item.discountedPrice).toFixed(2) 
      : parseFloat(item.price || 0).toFixed(2);
    
    const originalPrice = item.isOnSale && item.discountedPrice 
      ? parseFloat(item.price).toFixed(2) 
      : null;

    const averageRating = getProductAverageRating(item._id);
    const reviewCount = (productReviews[item._id] || []).length;
    const isLoadingReview = loadingReviews[item._id];
    const isOutOfStock = item.stock <= 0;

    return (
      <View style={styles.productCard}>
        {/* Only show Wishlist heart button for in-stock products and authenticated users */}
        {!isOutOfStock && isAuthenticated && (
          <View style={styles.wishlistButtonContainer}>
            <WishlistButton 
              product={item}
              size={22}
              onPress={(result) => handleWishlistToggle(item, result)}
            />
          </View>
        )}

        <View style={styles.imageContainer}>
          <ProductImageCarousel images={item.images} onCardPress={() => handleProductPress(item)} />
        </View>

        <TouchableOpacity onPress={() => handleProductPress(item)} activeOpacity={0.85}>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productCategory} numberOfLines={1}>{item.category || 'Uncategorized'}</Text>
            
            {/* Rating Display */}
            {!isLoadingReview && reviewCount > 0 ? (
              <View style={styles.reviewSummaryContainer}>
                <StarRating rating={averageRating} size={12} showRating={true} />
                <Text style={styles.reviewCount}>({reviewCount})</Text>
              </View>
            ) : isLoadingReview ? (
              <ActivityIndicator size="small" color="#8B5E3C" style={styles.reviewLoader} />
            ) : null}
            
            {/* Price with discount display */}
            <View style={styles.priceContainer}>
              {item.isOnSale && item.discountedPrice ? (
                <>
                  <Text style={styles.originalPrice}>₱{originalPrice}</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                      {item.discountPercentage ? `${item.discountPercentage}% OFF` : 'SALE'}
                    </Text>
                  </View>
                  <Text style={styles.discountedPrice}>₱{displayPrice}</Text>
                </>
              ) : (
                <Text style={styles.productPrice}>₱{displayPrice}</Text>
              )}
            </View>

            {/* Out of Stock Badge */}
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOutOfStock ? (
            <>
              {isAuthenticated ? (
                <TouchableOpacity 
                  style={styles.fullWidthWishlistButton}
                  onPress={async () => {
                    const result = await toggleWishlist(item);
                    if (result && result.message) {
                      showToast(result.message);
                    }
                    setProducts(prevProducts => [...prevProducts]);
                  }}
                >
                  <Icon 
                    name={isInWishlist(item._id) ? "favorite" : "favorite-border"} 
                    size={20} 
                    color="#FF8A8A"
                  />
                  <Text style={styles.wishlistButtonText}>
                    {isInWishlist(item._id) ? 'In Wishlist' : 'Add to Wishlist'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.fullWidthWishlistButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Icon name="favorite-border" size={20} color="#FF8A8A" />
                  <Text style={styles.wishlistButtonText}>Add to Wishlist</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.cartButton} 
                onPress={() => handleAddToCart(item)}
              >
                <Icon name="add-shopping-cart" size={20} color="#8B5E3C" />
                <Text style={styles.cartButtonText}>Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.buyButton} 
                onPress={() => handleBuyNow(item)}
              >
                <Icon name="shopping-cart-checkout" size={20} color="white" />
                <Text style={styles.buyButtonText}>Buy Now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryItem, selectedCategory === item && styles.selectedCategoryItem]}
      onPress={() => selectCategory(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.categoryItemText, selectedCategory === item && styles.selectedCategoryItemText]}>
        {item}
      </Text>
      {selectedCategory === item && <Icon name="check" size={18} color="#8B5E3C" />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5E3C" />
      </View>
    );
  }

  return (
    <GuestDrawer>
      <View style={styles.container}>
        <Header />
        
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#8B5E3C']}
              tintColor="#8B5E3C"
            />
          }
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#8B5E3C" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for pet products..."
              placeholderTextColor="#B0A090"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={20} color="#8B5E3C" />
              </TouchableOpacity>
            )}
          </View>

          {/* Banner Slider with Text Overlay */}
          <View style={styles.bannerWrapper}>
            <FlatList
              ref={flatListRef}
              data={BANNERS}
              renderItem={renderBannerItem}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onScrollBeginDrag={stopAutoSlide}
              onScrollEndDrag={startAutoSlide}
            />
            <View style={styles.indicatorContainer}>
              {BANNERS.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    flatListRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: true });
                    setCurrentBannerIndex(idx);
                  }}
                >
                  <View style={[styles.indicator, currentBannerIndex === idx && styles.activeIndicator]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Filter Row */}
          <View style={styles.filterContainer}>
            <TouchableOpacity style={styles.categorySelector} onPress={() => setShowCategories(true)} activeOpacity={0.7}>
              <Icon name="category" size={20} color="#8B5E3C" />
              <Text style={styles.categorySelectorText} numberOfLines={1}>{selectedCategory}</Text>
              <Icon name="arrow-drop-down" size={24} color="#8B5E3C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.priceFilterButton} onPress={toggleSort}>
              <Icon name="attach-money" size={20} color="#8B5E3C" />
              <Text style={styles.priceFilterText} numberOfLines={1}>Price {sortAscending ? '↑' : '↓'}</Text>
            </TouchableOpacity>
          </View>

          {/* Products Header */}
          <View style={styles.productsHeader}>
            <Text style={styles.productsTitle}>Featured Products</Text>
            <Text style={styles.productCount}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {filteredProducts.map(item => (
                <View key={item._id} style={styles.gridItem}>
                  {renderProductItem({ item })}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="search-off" size={60} color="#C4A882" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try different search or category</Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <Toast message={toastMessage} opacity={toastOpacity} />

        {/* Category Modal */}
        <Modal visible={showCategories} transparent animationType="fade" onRequestClose={() => setShowCategories(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategories(false)}>
            <View style={styles.categoriesDropdown}>
              <Text style={styles.categoriesTitle}>Select Category</Text>
              <FlatList
                data={CATEGORIES}
                renderItem={renderCategoryItem}
                keyExtractor={(_, i) => i.toString()}
                style={styles.categoriesList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </GuestDrawer>
  );
}

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: '#F5E9DA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5E9DA' },
  scrollView: { flex: 1 },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: 'rgba(61,36,18,0.92)',
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
    zIndex: 999, elevation: 10,
    shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  toastText: { color: '#FFF5EC', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // ── Search ────────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginTop: 15, marginBottom: 15,
    paddingHorizontal: 15, borderRadius: 25,
    borderWidth: 1, borderColor: '#E0D6C8',
    elevation: 2, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333333' },

  // ── Banner ────────────────────────────────────────────────────────────────
  bannerWrapper: { height: BANNER_HEIGHT, marginBottom: 15, position: 'relative' },
  bannerContainer: { width: SCREEN_WIDTH, height: BANNER_HEIGHT, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dark overlay for better text visibility
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  bannerTextContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    maxWidth: '70%',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  indicatorContainer: {
    position: 'absolute', bottom: 10, width: '100%',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 4 },
  activeIndicator: { backgroundColor: '#8B5E3C', width: 12, height: 12 },

  // ── Filters ───────────────────────────────────────────────────────────────
  filterContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 20,
  },
  categorySelector: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 25,
    borderWidth: 1, borderColor: '#E0D6C8', flex: 0.48,
    elevation: 2, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  categorySelectorText: { fontSize: 13, color: '#333333', marginHorizontal: 6, flex: 1, fontWeight: '500' },
  priceFilterButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 25, borderWidth: 1, borderColor: '#E0D6C8', flex: 0.48,
    elevation: 2, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  priceFilterText: { fontSize: 13, color: '#333333', marginLeft: 5, fontWeight: '500' },

  // ── Products Header ───────────────────────────────────────────────────────
  productsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  productsTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B5E3C' },
  productCount: { fontSize: 13, color: '#777777' },

  // ── Products Grid ─────────────────────────────────────────────────────────
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  gridItem: { width: '50%', paddingHorizontal: 4 },
  productCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14,
    elevation: 3, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 5, overflow: 'hidden',
    position: 'relative', borderWidth: 1, borderColor: '#E0D6C8',
  },

  // ── Wishlist Button (card overlay) ────────────────────────────────────────
  wishlistButtonContainer: {
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 4,
    elevation: 5, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },

  // ── Product Image ─────────────────────────────────────────────────────────
  imageContainer: { height: 120, backgroundColor: '#FDF7F2' },
  imageCarouselContainer: { width: '100%', height: '100%', position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  noImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF0E6' },
  arrowLeft: {
    position: 'absolute', left: 4, top: '50%', transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(139,94,60,0.5)', borderRadius: 16, width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  arrowRight: {
    position: 'absolute', right: 4, top: '50%', transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(139,94,60,0.5)', borderRadius: 16, width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  arrowText: { color: 'white', fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  imageIndicatorContainer: { position: 'absolute', bottom: 4, width: '100%', flexDirection: 'row', justifyContent: 'center' },
  imageIndicatorDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 2 },
  imageIndicatorDotActive: { backgroundColor: '#8B5E3C', width: 7, height: 7 },

  // ── Product Info ──────────────────────────────────────────────────────────
  productInfo: { padding: 10, flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: '#333333', marginBottom: 3, height: 38 },
  productCategory: { fontSize: 11, color: '#A3B18A', marginBottom: 5, fontWeight: '500' },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#8B5E3C' },

  // ── Reviews ───────────────────────────────────────────────────────────────
  reviewSummaryContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  starRatingContainer: { flexDirection: 'row', alignItems: 'center' },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 11, color: '#777777', marginLeft: 3, fontWeight: '500' },
  reviewCount: { fontSize: 10, color: '#B0A090', marginLeft: 2 },
  reviewLoader: { marginBottom: 5, alignSelf: 'flex-start' },

  // ── Price / Discount ──────────────────────────────────────────────────────
  priceContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 3 },
  originalPrice: { fontSize: 11, color: '#B0A090', textDecorationLine: 'line-through', marginRight: 5 },
  discountedPrice: { fontSize: 15, fontWeight: 'bold', color: '#8B5E3C' },
  discountBadge: {
    backgroundColor: '#FF8A8A', paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4, marginRight: 5,
  },
  discountBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  // ── Out of Stock ──────────────────────────────────────────────────────────
  outOfStockBadge: {
    backgroundColor: '#F0EAE0', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, alignSelf: 'flex-start', marginTop: 4,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  outOfStockText: { fontSize: 10, color: '#B0A090', fontWeight: '500' },

  // ── Action Buttons ────────────────────────────────────────────────────────
  actionButtons: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0EAE0',
    paddingHorizontal: 8, paddingVertical: 8,
  },
  cartButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FDF0E6', paddingVertical: 8, borderRadius: 8, marginRight: 4,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  cartButtonText: { fontSize: 12, fontWeight: '600', color: '#8B5E3C', marginLeft: 4 },
  buyButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#8B5E3C', paddingVertical: 8, borderRadius: 8, marginLeft: 4,
    elevation: 2, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3,
  },
  buyButtonText: { fontSize: 12, fontWeight: '600', color: 'white', marginLeft: 4 },
  fullWidthWishlistButton: {
    flex: 1, backgroundColor: '#FDF0E6', paddingVertical: 8, borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  wishlistButtonText: { fontSize: 12, fontWeight: '600', color: '#FF8A8A', marginLeft: 4 },
  disabledButton: { backgroundColor: '#F5F0EB', flex: 1, marginRight: 4 },
  disabledText: { color: '#B0A090' },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#8B5E3C', marginTop: 15, marginBottom: 5 },
  emptySubtext: { fontSize: 14, color: '#B0A090', textAlign: 'center' },

  // ── Category Modal ────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,36,18,0.45)', justifyContent: 'flex-start', paddingTop: 120 },
  categoriesDropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E0D6C8',
    marginHorizontal: 20, maxHeight: 400,
    elevation: 6, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  categoriesTitle: {
    fontSize: 17, fontWeight: 'bold', color: '#8B5E3C',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0EAE0',
  },
  categoriesList: { maxHeight: 350 },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0EAE0',
  },
  selectedCategoryItem: { backgroundColor: '#FDF0E6' },
  categoryItemText: { fontSize: 15, color: '#333333' },
  selectedCategoryItemText: { color: '#8B5E3C', fontWeight: '600' },
});