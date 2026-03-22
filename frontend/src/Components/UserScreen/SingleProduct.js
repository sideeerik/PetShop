// CVPetShop/frontend/src/Components/UserScreen/SingleProduct.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../../utils/helper';
import { sanitizeReviewComment } from '../../utils/profanityFilter';
import UserDrawer from './UserDrawer';
import Header from '../layouts/Header';
import { useWishlist } from '../../context/WishlistContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

// Function to dismiss keyboard
const dismissKeyboard = () => {
  Keyboard.dismiss();
};

// ─── Image Carousel ───────────────────────────────────────────────────────────
const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = images && images.length > 0 && images.some(img => img && (img.url || typeof img === 'string'));
  const urls = validImages 
    ? images.filter(img => img && (img.url || typeof img === 'string')).map(img => img.url || img) 
    : [];

  if (!validImages || urls.length === 0) {
    return (
      <View style={styles.noImageBox}>
        <Icon name="pets" size={64} color="#C4A882" />
        <Text style={styles.noImageText}>No image available</Text>
      </View>
    );
  }

  return (
    <View style={styles.carouselContainer}>
      <Image source={{ uri: urls[currentIndex] }} style={styles.mainImage} resizeMode="cover" />

      {urls.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>{currentIndex + 1} / {urls.length}</Text>
        </View>
      )}

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
        </>
      )}

      {urls.length > 1 && (
        <View style={styles.dotsContainer} pointerEvents="none">
          {urls.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      {urls.length > 1 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.thumbnailStrip}
          contentContainerStyle={styles.thumbnailContent}
        >
          {urls.map((url, i) => (
            <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)} activeOpacity={0.8}>
              <Image
                source={{ uri: url }}
                style={[styles.thumbnail, i === currentIndex && styles.thumbnailActive]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// ─── Star Rating Component ───────────────────────────────────────────────────
const StarRating = ({ rating, size = 16, showRating = false, interactive = false, onRate = null }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  const renderStars = () => {
    if (interactive) {
      return (
        <View style={styles.interactiveStarsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => onRate && onRate(i)}>
              <Icon
                name={i <= rating ? 'star' : 'star-border'}
                size={size}
                color={i <= rating ? '#FFD700' : '#C4A882'}
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    } else {
      return (
        <View style={styles.starsRow}>
          {[...Array(fullStars)].map((_, i) => (
            <Icon key={`full-${i}`} name="star" size={size} color="#FFD700" />
          ))}
          {halfStar && <Icon name="star-half" size={size} color="#FFD700" />}
          {[...Array(emptyStars)].map((_, i) => (
            <Icon key={`empty-${i}`} name="star-border" size={size} color="#C4A882" />
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.starRatingContainer}>
      {renderStars()}
      {showRating && !interactive && (
        <Text style={styles.ratingText}>({rating.toFixed(1)})</Text>
      )}
    </View>
  );
};

// ─── Stock Badge ──────────────────────────────────────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === undefined || stock === null) return null;
  const inStock = stock > 0;
  return (
    <View style={[styles.stockBadge, inStock ? styles.stockIn : styles.stockOut]}>
      <Icon name={inStock ? 'check-circle' : 'cancel'} size={14} color={inStock ? '#2e7d32' : '#c62828'} />
      <Text style={[styles.stockText, inStock ? styles.stockTextIn : styles.stockTextOut]}>
        {inStock ? `In Stock (${stock})` : 'Out of Stock'}
      </Text>
    </View>
  );
};

// ─── Discount Badge ────────────────────────────────────────────────────────────
const DiscountBadge = ({ percentage }) => {
  if (!percentage) return null;
  return (
    <View style={styles.discountBadge}>
      <Text style={styles.discountBadgeText}>{percentage}% OFF</Text>
    </View>
  );
};

// ─── Review Item Component ───────────────────────────────────────────────────
const ReviewItem = ({ review, isUserReview = false }) => {
  return (
    <View style={[styles.reviewItem, isUserReview && styles.userReviewItem]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerAvatarText}>
              {review.name ? review.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>{review.name || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, opacity }) => (
  <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
    <Text style={styles.toastText}>{message}</Text>
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SingleProduct({ route, navigation }) {
  const { productId } = route.params;

  const [product,      setProduct]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [cartLoading,  setCartLoading]  = useState(false);
  const [buyLoading,   setBuyLoading]   = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Wishlist
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [wishlistLoading, setWishlistLoading] = useState(false);
  
  // Review states
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingUserReview, setLoadingUserReview] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { 
    fetchProduct(); 
  }, [productId]);

  useEffect(() => {
    if (product) {
      fetchProductReviews();
      checkUserReview();
      checkReviewEligibility();
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/products/${productId}`);
      if (res.data?.success) setProduct(res.data.product);
    } catch (e) {
      console.error('Error fetching product:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch all reviews for this product ────────────────────────────────────
  const fetchProductReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await axios.get(`${BACKEND_URL}/api/v1/reviews?productId=${productId}`);
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  // ── Check if current user has already reviewed this product ───────────────
  const checkUserReview = async () => {
    try {
      setLoadingUserReview(true);
      const token = await getToken();
      if (!token) {
        setUserReview(null);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/review/user/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.review) {
        setUserReview(response.data.review);
        setRating(response.data.review.rating);
        setComment(response.data.review.comment);
      }
    } catch (error) {
      console.error('Error checking user review:', error);
    } finally {
      setLoadingUserReview(false);
    }
  };

  const checkReviewEligibility = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setReviewOrderId(null);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data.success) {
        setReviewOrderId(null);
        return;
      }

      const eligibleOrder = (response.data.orders || []).find((order) => {
        if (order.orderStatus === 'Cancelled') {
          return false;
        }

        return (order.orderItems || []).some((item) => {
          const orderedProductId = item.product?._id || item.product;
          return orderedProductId === productId;
        });
      });

      setReviewOrderId(eligibleOrder?._id || null);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setReviewOrderId(null);
    }
  };

  // ── Calculate average rating ──────────────────────────────────────────────
  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return sum / reviews.length;
  };

  const averageRating = getAverageRating();
  const displayedReviews = expandedReviews ? reviews : reviews.slice(0, 3);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  // ── Handle Wishlist Toggle ────────────────────────────────────────────────
  const handleWishlistToggle = async () => {
    try {
      setWishlistLoading(true);
      const result = await toggleWishlist(product);
      if (result && result.message) {
        showToast(result.message);
      }
    } catch (error) {
      showToast('❌ Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  // ── POST /api/v1/cart/add ─────────────────────────────────────────────────
  const handleAddToCart = async () => {
    try {
      setCartLoading(true);
      const token = await getToken();
      if (!token) { navigation.navigate('Login'); return; }

      const res = await axios.post(
        `${BACKEND_URL}/api/v1/cart/add`,
        { productId: product._id },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showToast(`✅ "${product.name}" added to cart!`);
      }
    } catch (e) {
      console.error('Error adding to cart:', e);
      showToast(`❌ ${e.response?.data?.message || e.message}`);
    } finally {
      setCartLoading(false);
    }
  };

  // ── Buy Now ───────────────────────────────────────────────────────────────
  const handleBuyNow = () => {
    navigation.navigate('Checkout', {
      productId: product._id,
      quantity: 1,
      product: {
        ...product,
        effectivePrice: product.isOnSale && product.discountedPrice ? product.discountedPrice : product.price
      },
    });
  };

  // ── Open review modal ─────────────────────────────────────────────────────
  const openReviewModal = () => {
    dismissKeyboard(); // Dismiss keyboard when opening review modal

    if (!reviewOrderId && !userReview) {
      return;
    }

    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment);
    } else {
      setRating(0);
      setComment('');
    }
    setReviewModalVisible(true);
  };

  // ── Submit review ─────────────────────────────────────────────────────────
  const submitReview = async () => {
    const sanitizedComment = sanitizeReviewComment(comment);

    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    if (!sanitizedComment.sanitizedText) {
      Alert.alert('Error', 'Please enter a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const token = await getToken();
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const reviewData = {
        rating,
        comment: sanitizedComment.sanitizedText,
        productId,
        orderId: reviewOrderId,
      };

      let response;
      if (userReview) {
        // Update existing review
        response = await axios.put(`${BACKEND_URL}/api/v1/review/update`, reviewData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new review
        response = await axios.post(`${BACKEND_URL}/api/v1/review/create`, reviewData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        setComment(sanitizedComment.sanitizedText);
        Alert.alert(
          'Success',
          userReview ? 'Review updated successfully!' : 'Review submitted successfully!'
        );
        setReviewModalVisible(false);
        dismissKeyboard(); // Dismiss keyboard after submission
        // Refresh reviews
        await fetchProductReviews();
        await checkUserReview();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5E3C" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </UserDrawer>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <Icon name="search-off" size={64} color="#C4A882" />
          <Text style={styles.notFoundText}>Product not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </UserDrawer>
    );
  }

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const canShowReviewButton = Boolean(userReview || reviewOrderId);
  
  // Determine which price to display
  const displayPrice = product.isOnSale && product.discountedPrice 
    ? parseFloat(product.discountedPrice).toFixed(2) 
    : parseFloat(product.price || 0).toFixed(2);
  
  const originalPrice = product.isOnSale && product.discountedPrice 
    ? parseFloat(product.price).toFixed(2) 
    : null;

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        
        {/* Main content with keyboard dismissal */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ImageCarousel images={product.images} />

            <View style={styles.detailsCard}>
              <View style={styles.chipRow}>
                <View style={styles.categoryChip}>
                  <Icon name="category" size={13} color="#8B5E3C" />
                  <Text style={styles.categoryChipText}>{product.category || 'Uncategorized'}</Text>
                </View>
                {product.isOnSale && product.discountPercentage && (
                  <DiscountBadge percentage={product.discountPercentage} />
                )}
                {/* Wishlist Button moved to chip row for better visibility */}
                <TouchableOpacity 
                  style={styles.wishlistChip}
                  onPress={handleWishlistToggle}
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? (
                    <ActivityIndicator size="small" color="#FF8A8A" />
                  ) : (
                    <Icon 
                      name={isInWishlist(product._id) ? "favorite" : "favorite-border"} 
                      size={18} 
                      color="#FF8A8A" 
                    />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.productName}>{product.name}</Text>

              {/* Price with discount display */}
              <View style={styles.priceContainer}>
                {originalPrice && (
                  <>
                    <Text style={styles.originalPrice}>₱{originalPrice}</Text>
                    {product.discountPercentage && (
                      <View style={styles.discountBadgeLarge}>
                        <Text style={styles.discountBadgeLargeText}>{product.discountPercentage}% OFF</Text>
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.productPrice}>₱{displayPrice}</Text>
              </View>

              {/* Show discount period if on sale */}
              {product.isOnSale && product.discountStartDate && product.discountEndDate && (
                <View style={styles.discountPeriodContainer}>
                  <Icon name="event" size={16} color="#FF8A8A" />
                  <Text style={styles.discountPeriodText}>
                    Sale ends: {new Date(product.discountEndDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.priceStockRow}>
                <StockBadge stock={product.stock} />
              </View>

              {/* Reviews Summary Section */}
              {reviews.length > 0 && (
                <View style={styles.reviewsSummaryContainer}>
                  <View style={styles.reviewsSummaryHeader}>
                    <Text style={styles.reviewsSummaryTitle}>Customer Reviews</Text>
                    <TouchableOpacity 
                      style={styles.viewAllReviewsButton}
                      onPress={() => setExpandedReviews(!expandedReviews)}
                    >
                      <Text style={styles.viewAllReviewsText}>
                        {expandedReviews ? 'Show Less' : `View All (${reviews.length})`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.averageRatingContainer}>
                    <Text style={styles.averageRatingText}>{averageRating.toFixed(1)}</Text>
                    <StarRating rating={averageRating} size={18} showRating={false} />
                    <Text style={styles.totalReviewsText}>({reviews.length} reviews)</Text>
                  </View>
                </View>
              )}

              {/* Write Review Button */}
              {canShowReviewButton && (
                <TouchableOpacity 
                  style={styles.writeReviewButton}
                  onPress={openReviewModal}
                >
                  <Icon name="rate-review" size={20} color="white" />
                  <Text style={styles.writeReviewButtonText}>
                    {userReview ? 'Edit Your Review' : 'Write a Review'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Reviews List */}
              {loadingReviews ? (
                <View style={styles.reviewsLoader}>
                  <ActivityIndicator size="small" color="#8B5E3C" />
                  <Text style={styles.loadingReviewsText}>Loading reviews...</Text>
                </View>
              ) : (
                <>
                  {/* User's Review (if exists) */}
                  {userReview && (
                    <View style={styles.userReviewSection}>
                      <Text style={styles.sectionSubtitle}>Your Review</Text>
                      <ReviewItem review={userReview} isUserReview={true} />
                    </View>
                  )}

                  {/* Other Reviews */}
                  {displayedReviews.length > 0 && (
                    <View style={styles.reviewsList}>
                      {displayedReviews
                        .filter(r => !userReview || r._id !== userReview._id)
                        .map((review, index) => (
                          <ReviewItem key={index} review={review} />
                        ))}
                    </View>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>
                {product.description || 'No description available for this product.'}
              </Text>

              {(product.brand || product.weight) && (
                <>
                  <View style={styles.divider} />
                  {product.brand && (
                    <View style={styles.infoRow}>
                      <Icon name="storefront" size={18} color="#8B5E3C" />
                      <Text style={styles.infoLabel}>Brand</Text>
                      <Text style={styles.infoValue}>{product.brand}</Text>
                    </View>
                  )}
                  {product.weight && (
                    <View style={styles.infoRow}>
                      <Icon name="fitness-center" size={18} color="#8B5E3C" />
                      <Text style={styles.infoLabel}>Weight</Text>
                      <Text style={styles.infoValue}>{product.weight}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={{ height: 120 }} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        <Toast message={toastMessage} opacity={toastOpacity} />

        {/* Review Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reviewModalVisible}
          onRequestClose={() => {
            setReviewModalVisible(false);
            dismissKeyboard();
          }}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.reviewModalContainer}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.reviewModalContent}
              >
                <View style={styles.reviewModalHeader}>
                  <Text style={styles.reviewModalTitle}>
                    {userReview ? 'Edit Your Review' : 'Write a Review'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setReviewModalVisible(false);
                    dismissKeyboard();
                  }}>
                    <Icon name="close" size={22} color="#8B5E3C" />
                  </TouchableOpacity>
                </View>

                <View style={styles.reviewProductInfo}>
                  <View style={styles.reviewProductImageContainer}>
                    {product.images && product.images.length > 0 ? (
                      <Image 
                        source={{ uri: product.images[0].url || product.images[0] }} 
                        style={styles.reviewProductImage} 
                      />
                    ) : (
                      <View style={styles.reviewProductImagePlaceholder}>
                        <Icon name="image" size={24} color="#C4A882" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.reviewProductName}>{product.name}</Text>
                </View>

                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <StarRating 
                    rating={rating} 
                    size={30} 
                    interactive={true} 
                    onRate={setRating}
                  />
                </View>

                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Your Review</Text>
                  <TextInput
                    style={styles.commentInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Share your experience with this product..."
                    placeholderTextColor="#B0A090"
                    value={comment}
                    onChangeText={setComment}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitReviewButton, submittingReview && styles.submitButtonDisabled]}
                  onPress={submitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitReviewText}>
                      {userReview ? 'Update Review' : 'Submit Review'}
                    </Text>
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Bottom Bar - Changes based on stock */}
        <View style={styles.bottomBar}>
          {isOutOfStock ? (
            // Only show Wishlist button for out of stock products
            <TouchableOpacity
              style={styles.fullWidthWishlistButton}
              onPress={handleWishlistToggle}
              disabled={wishlistLoading}
              activeOpacity={0.8}
            >
              {wishlistLoading ? (
                <ActivityIndicator size="small" color="#FF8A8A" />
              ) : (
                <>
                  <Icon 
                    name={isInWishlist(product._id) ? "favorite" : "favorite-border"} 
                    size={22} 
                    color="#FF8A8A" 
                  />
                  <Text style={styles.wishlistButtonText}>
                    {isInWishlist(product._id) ? 'In Wishlist' : 'Add to Wishlist'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            // Show both buttons for in stock products
            <>
              <TouchableOpacity
                style={styles.cartButton}
                onPress={handleAddToCart}
                disabled={cartLoading}
                activeOpacity={0.8}
              >
                {cartLoading ? (
                  <ActivityIndicator size="small" color="#8B5E3C" />
                ) : (
                  <>
                    <Icon name="add-shopping-cart" size={22} color="#8B5E3C" />
                    <Text style={styles.cartButtonText}>Add to Cart</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buyButton}
                onPress={handleBuyNow}
                disabled={buyLoading}
                activeOpacity={0.8}
              >
                {buyLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Icon name="bolt" size={22} color="white" />
                    <Text style={styles.buyButtonText}>Buy Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5E9DA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5E9DA', gap: 12 },
  loadingText: { fontSize: 15, color: '#B0A090', marginTop: 8 },
  notFoundText: { fontSize: 18, fontWeight: 'bold', color: '#8B5E3C', marginTop: 12 },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#8B5E3C', borderRadius: 25 },
  backBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  scrollView: { flex: 1 },
  toast: {
    position: 'absolute', bottom: 90, left: 20, right: 20,
    backgroundColor: 'rgba(61,36,18,0.92)',
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
    zIndex: 999, elevation: 10,
    shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  toastText: { color: '#FFF5EC', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  carouselContainer: { backgroundColor: '#FDF7F2' },
  mainImage: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT },
  noImageBox: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT, backgroundColor: '#FDF0E6', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#C4A882', fontSize: 14, marginTop: 8 },
  imageCounter: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(61,36,18,0.55)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  imageCounterText: { color: 'white', fontSize: 13, fontWeight: '600' },
  arrowLeft: {
    position: 'absolute', left: 10, top: IMAGE_HEIGHT / 2 - 22,
    backgroundColor: 'rgba(139,94,60,0.45)', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  arrowRight: {
    position: 'absolute', right: 10, top: IMAGE_HEIGHT / 2 - 22,
    backgroundColor: 'rgba(139,94,60,0.45)', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  arrowText: { color: 'white', fontSize: 30, fontWeight: 'bold', lineHeight: 36 },
  dotsContainer: { position: 'absolute', bottom: 70, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 3 },
  dotActive: { backgroundColor: '#8B5E3C', width: 10, height: 10 },
  thumbnailStrip: { backgroundColor: '#FDF7F2', borderTopWidth: 1, borderTopColor: '#E0D6C8' },
  thumbnailContent: { paddingHorizontal: 12, paddingVertical: 10 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbnailActive: { borderColor: '#8B5E3C' },
  detailsCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    marginTop: -16, paddingHorizontal: 20, paddingTop: 24,
    elevation: 4, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8,
    borderTopWidth: 1, borderLeftWidth: 0, borderRightWidth: 0, borderColor: '#E0D6C8',
  },
  chipRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FDF0E6', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  categoryChipText: { fontSize: 12, color: '#8B5E3C', fontWeight: '600', marginLeft: 4 },
  wishlistChip: {
    backgroundColor: '#FFF0F0', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginLeft: 'auto',
    borderWidth: 1, borderColor: '#FFD4D4',
  },
  discountBadge: {
    backgroundColor: '#FF8A8A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productName: { fontSize: 22, fontWeight: '800', color: '#333333', marginBottom: 12, lineHeight: 30 },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  productPrice: { fontSize: 28, fontWeight: '900', color: '#8B5E3C' },
  originalPrice: {
    fontSize: 18,
    color: '#B0A090',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadgeLarge: {
    backgroundColor: '#FF8A8A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 10,
  },
  discountBadgeLargeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  discountPeriodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#FFD4D4',
  },
  discountPeriodText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF8A8A',
    fontWeight: '600',
  },
  priceStockRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start', 
    marginBottom: 16 
  },
  stockBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  stockIn: { backgroundColor: '#e8f5e9' },
  stockOut: { backgroundColor: '#ffebee' },
  stockText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  stockTextIn: { color: '#2e7d32' },
  stockTextOut: { color: '#c62828' },
  
  // Review-related styles
  reviewsSummaryContainer: {
    backgroundColor: '#FDF7F2',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  reviewsSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewsSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5E3C',
  },
  viewAllReviewsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllReviewsText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '600',
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  averageRatingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333333',
  },
  totalReviewsText: {
    fontSize: 14,
    color: '#777777',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
  },
  writeReviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  reviewsLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingReviewsText: {
    fontSize: 14,
    color: '#B0A090',
  },
  userReviewSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  reviewsList: {
    gap: 12,
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    marginBottom: 12,
  },
  userReviewItem: {
    backgroundColor: '#FDF7F2',
    borderColor: '#8B5E3C',
    borderWidth: 1.5,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5E3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  reviewDate: {
    fontSize: 10,
    color: '#B0A090',
  },
  reviewComment: {
    fontSize: 14,
    color: '#777777',
    lineHeight: 20,
    marginTop: 8,
  },
  starRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactiveStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#777777',
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Review Modal Styles
  reviewModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(61,36,18,0.45)',
  },
  reviewModalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 24,
    maxHeight: '90%',
    borderTopWidth: 1, borderColor: '#E0D6C8',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5E3C',
  },
  reviewProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12, backgroundColor: '#FDF7F2', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0D6C8',
  },
  reviewProductImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  reviewProductImage: {
    width: '100%',
    height: '100%',
  },
  reviewProductImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
  },
  reviewProductName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333', marginBottom: 10,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333', marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1, borderColor: '#E0D6C8', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#333333',
    minHeight: 100, textAlignVertical: 'top', backgroundColor: '#FDF7F2',
  },
  submitReviewButton: {
    backgroundColor: '#8B5E3C', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    elevation: 2, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  
  divider: { height: 1, backgroundColor: '#E0D6C8', marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#8B5E3C', marginBottom: 8 },
  descriptionText: { fontSize: 15, color: '#555555', lineHeight: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: '#B0A090', flex: 0.3, marginLeft: 8 },
  infoValue: { fontSize: 14, color: '#333333', fontWeight: '600', flex: 0.7 },
  bottomBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 20,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0D6C8',
    elevation: 8, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 6, gap: 10,
  },
  cartButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FDF0E6', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#8B5E3C', gap: 8,
  },
  cartButtonText: { fontSize: 15, fontWeight: '700', color: '#8B5E3C', marginLeft: 6 },
  buyButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#8B5E3C', paddingVertical: 14, borderRadius: 14, gap: 8,
    elevation: 3, shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  buyButtonText: { fontSize: 15, fontWeight: '700', color: 'white', marginLeft: 6 },
  fullWidthWishlistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF8A8A',
    gap: 8,
  },
  wishlistButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8A8A',
    marginLeft: 6,
  },
  disabledButton: { opacity: 0.45 },
});
