// CVPetShop/frontend/src/Components/UserScreen/Orders/OrderDetails.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken, resetToAuth } from '../../../utils/helper';
import { sanitizeReviewComment } from '../../../utils/profanityFilter';
import UserDrawer from '../UserDrawer';
import Header from '../../layouts/Header';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Status color mapping - Updated to match your model's enum values
const STATUS_COLORS = {
  'Processing': '#FFA500',
  'Accepted': '#4A6FA5',
  'Out for Delivery': '#FFA500',
  'Delivered': '#4CAF50',
  'Cancelled': '#FF8A8A',
};

// Status step mapping for timeline - Updated to match your workflow
const STATUS_STEPS = ['Processing', 'Accepted', 'Out for Delivery', 'Delivered'];

export default function OrderDetails({ navigation, route }) {
  const { orderId, order: initialOrder } = route.params;
  const [order, setOrder] = useState(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Review states
  const [reviews, setReviews] = useState({});
  const [userReviews, setUserReviews] = useState({});
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState({});

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (!initialOrder) {
      fetchOrderDetails();
    } else {
      // If order is delivered, fetch reviews for all products
      if (initialOrder.orderStatus === 'Delivered') {
        fetchAllProductReviews();
      }
    }
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrderDetails();
    });

    return unsubscribe;
  }, [navigation, orderId]);

  useEffect(() => {
    // When order is updated and delivered, fetch reviews
    if (order && order.orderStatus === 'Delivered' && order.orderItems) {
      fetchAllProductReviews();
    }
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) {
        resetToAuth(navigation);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setOrder(response.data.order);
        // If order is delivered, fetch reviews
        if (response.data.order.orderStatus === 'Delivered') {
          fetchAllProductReviews();
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError(error.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductReviews = async () => {
    if (!order || !order.orderItems) return;
    
    const token = await getToken();
    if (!token) return;

    // Fetch reviews for each product in the order
    for (const item of order.orderItems) {
      const productId = item.product?._id || item.product;
      if (productId) {
        fetchProductReviews(productId);
        fetchUserProductReview(productId);
      }
    }
  };

  const fetchProductReviews = async (productId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/reviews?productId=${productId}`);
      if (response.data.success) {
        setReviews(prev => ({ ...prev, [productId]: response.data.reviews }));
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    }
  };

  const fetchUserProductReview = async (productId) => {
    try {
      setLoadingReviews(prev => ({ ...prev, [productId]: true }));
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${BACKEND_URL}/api/v1/review/user/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.review) {
        setUserReviews(prev => ({ ...prev, [productId]: response.data.review }));
      }
    } catch (error) {
      console.error('Error fetching user review:', error);
    } finally {
      setLoadingReviews(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleTrackOrder = () => {
    Alert.alert('Not Available', 'Tracking information is not available yet.');
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return STATUS_STEPS.indexOf(order.orderStatus);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openImageModal = (imageUri) => {
    dismissKeyboard(); // Dismiss keyboard when opening image modal
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const getProductImage = (item) => {
    // First check if the item has a direct image field (from order)
    if (item.image) {
      return item.image;
    }
    // Then check if the product is populated and has images
    if (item.product && item.product.images && item.product.images.length > 0) {
      return item.product.images[0].url || item.product.images[0];
    }
    return null;
  };

  const getAllProductImages = (item) => {
    const images = [];
    
    // Add the order item image if available
    if (item.image) {
      images.push(item.image);
    }
    
    // Add all product images if the product is populated
    if (item.product && item.product.images && item.product.images.length > 0) {
      item.product.images.forEach(img => {
        const imageUrl = img.url || img;
        if (!images.includes(imageUrl)) {
          images.push(imageUrl);
        }
      });
    }
    
    return images;
  };

  const openReviewModal = (product) => {
    dismissKeyboard(); // Dismiss keyboard when opening review modal
    const productId = product.product?._id || product.product;
    const existingReview = userReviews[productId];
    
    setSelectedProduct(product);
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setRating(0);
      setComment('');
    }
    setReviewModalVisible(true);
  };

  const submitReview = async () => {
    if (!selectedProduct) return;
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
        resetToAuth(navigation);
        return;
      }

      const productId = selectedProduct.product?._id || selectedProduct.product;
      const existingReview = userReviews[productId];
      
      const reviewData = {
        rating,
        comment: sanitizedComment.sanitizedText,
        productId,
        orderId: order._id,
      };

      let response;
      if (existingReview) {
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
          existingReview ? 'Review updated successfully!' : 'Review submitted successfully!'
        );
        setReviewModalVisible(false);
        dismissKeyboard(); // Dismiss keyboard after submission
        // Refresh reviews
        fetchProductReviews(productId);
        fetchUserProductReview(productId);
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

  const renderStars = (ratingValue, interactive = false, size = 20) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={interactive ? () => setRating(i) : null}
          disabled={!interactive}
        >
          <Icon
            name={i <= ratingValue ? 'star' : 'star-border'}
            size={size}
            color={i <= ratingValue ? '#FFD700' : '#ccc'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderReviewSection = (item) => {
    const productId = item.product?._id || item.product;
    if (!productId) return null;

    const productReviews = reviews[productId] || [];
    const userReview = userReviews[productId];
    const averageRating = productReviews.length > 0
      ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
      : 0;

    return (
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Product Reviews</Text>
          {userReview ? (
            <TouchableOpacity
              style={styles.editReviewButton}
              onPress={() => openReviewModal(item)}
            >
              <Icon name="edit" size={16} color="#FF6B6B" />
              <Text style={styles.editReviewText}>Edit Your Review</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => openReviewModal(item)}
            >
              <Icon name="rate-review" size={16} color="white" />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Average Rating */}
        {productReviews.length > 0 && (
          <View style={styles.averageRatingContainer}>
            <View style={styles.averageRatingRow}>
              <Text style={styles.averageRatingText}>{averageRating}</Text>
              <View style={styles.averageStars}>
                {renderStars(Math.round(averageRating), false, 16)}
              </View>
              <Text style={styles.totalReviews}>({productReviews.length} reviews)</Text>
            </View>
          </View>
        )}

        {/* User's Review (if exists) */}
        {userReview && (
          <View style={styles.userReviewContainer}>
            <Text style={styles.yourReviewLabel}>Your Review:</Text>
            <View style={styles.userReviewContent}>
              <View style={styles.userReviewStars}>
                {renderStars(userReview.rating, false, 16)}
              </View>
              <Text style={styles.userReviewComment}>{userReview.comment}</Text>
              <Text style={styles.userReviewDate}>
                {formatDate(userReview.createdAt)}
              </Text>
            </View>
          </View>
        )}

        {/* Other Reviews */}
        {productReviews.length > 0 && (
          <View style={styles.otherReviewsContainer}>
            <Text style={styles.otherReviewsTitle}>
              {userReview ? 'Other Customer Reviews' : 'Customer Reviews'}
            </Text>
            {productReviews
              .filter(r => !userReview || r._id !== userReview._id)
              .slice(0, 2)
              .map((review, index) => (
                <View key={index} style={styles.otherReviewItem}>
                  <View style={styles.otherReviewHeader}>
                    <Text style={styles.reviewerName}>{review.name}</Text>
                    <View style={styles.reviewerStars}>
                      {renderStars(review.rating, false, 12)}
                    </View>
                  </View>
                  <Text style={styles.reviewerComment}>{review.comment}</Text>
                  <Text style={styles.reviewerDate}>
                    {formatDate(review.createdAt)}
                  </Text>
                </View>
              ))}
            {productReviews.length > 2 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all {productReviews.length} reviews</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5E3C" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </UserDrawer>
    );
  }

  if (error || !order) {
    return (
      <UserDrawer>
        <SafeAreaView style={styles.safeArea}>
          <Header />
          <View style={styles.errorContainer}>
            <View style={styles.errorIconWrapper}>
              <Icon name="error-outline" size={48} color="#C4A882" />
            </View>
            <Text style={styles.errorTitle}>Order Not Found</Text>
            <Text style={styles.errorText}>
              {error || "We couldn't find this order. It may have been removed."}
            </Text>
            <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={18} color="white" />
              <Text style={styles.goBackBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </UserDrawer>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        
        {/* Image Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={28} color="white" />
            </TouchableOpacity>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

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
                    {userReviews[selectedProduct?.product?._id || selectedProduct?.product] 
                      ? 'Edit Your Review' 
                      : 'Write a Review'}
                  </Text>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => {
                    setReviewModalVisible(false);
                    dismissKeyboard();
                  }}>
                    <Icon name="close" size={22} color="#8B5E3C" />
                  </TouchableOpacity>
                </View>

                {selectedProduct && (
                  <View style={styles.reviewProductInfo}>
                    <View style={styles.reviewProductImageContainer}>
                      {getProductImage(selectedProduct) ? (
                        <Image 
                          source={{ uri: getProductImage(selectedProduct) }} 
                          style={styles.reviewProductImage} 
                        />
                      ) : (
                        <View style={styles.reviewProductImagePlaceholder}>
                          <Icon name="image" size={24} color="#C4A882" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewProductName}>{selectedProduct.name}</Text>
                  </View>
                )}

                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <View style={styles.starsContainer}>
                    {renderStars(rating, true, 32)}
                  </View>
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
                      {userReviews[selectedProduct?.product?._id || selectedProduct?.product] 
                        ? 'Update Review' 
                        : 'Submit Review'}
                    </Text>
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        
        {/* Main content with keyboard dismissal */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={22} color="#8B5E3C" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Order Details</Text>
                <Text style={styles.orderId}>#{order._id?.slice(-8).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[order.orderStatus] || '#B0A090') + '22' }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[order.orderStatus] || '#B0A090' }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[order.orderStatus] || '#B0A090' }]}>
                  {order.orderStatus}
                </Text>
              </View>
            </View>

            {/* Order Timeline - Only show for non-cancelled orders */}
            {order.orderStatus !== 'Cancelled' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Status</Text>
                <View style={styles.timeline}>
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    
                    return (
                      <View key={step} style={styles.timelineStep}>
                        <View style={[
                          styles.timelineDot,
                          isCompleted && styles.timelineDotCompleted,
                          isCurrent && styles.timelineDotCurrent,
                        ]}>
                          {isCompleted && <Icon name="check" size={12} color="white" />}
                        </View>
                        <Text style={[
                          styles.timelineText,
                          isCompleted && styles.timelineTextCompleted,
                        ]}>
                          {step}
                        </Text>
                        {index < STATUS_STEPS.length - 1 && (
                          <View style={[
                            styles.timelineLine,
                            isCompleted && styles.timelineLineCompleted,
                          ]} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Cancelled Order Message */}
            {order.orderStatus === 'Cancelled' && (
              <View style={styles.cancelledContainer}>
                <Icon name="cancel" size={24} color="#FF6B6B" />
                <Text style={styles.cancelledText}>This order has been cancelled</Text>
              </View>
            )}

            {/* Order Items with Multiple Images and Reviews */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {order.orderItems?.map((item, index) => {
                const productImages = getAllProductImages(item);
                const mainImage = getProductImage(item);
                
                return (
                  <View key={index} style={styles.orderItemContainer}>
                    <View style={styles.orderItem}>
                      <TouchableOpacity 
                        style={styles.itemImageContainer}
                        onPress={() => mainImage && openImageModal(mainImage)}
                      >
                        {mainImage ? (
                          <Image source={{ uri: mainImage }} style={styles.itemImage} />
                        ) : (
                          <View style={styles.itemImagePlaceholder}>
                            <Icon name="image" size={24} color="#ccc" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>₱{item.price?.toFixed(2)}</Text>
                        <View style={styles.itemQuantityRow}>
                          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                          <Text style={styles.itemSubtotal}>
                            Subtotal: ₱{(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* All Product Images */}
                    {productImages.length > 1 && (
                      <View style={styles.allImagesContainer}>
                        <Text style={styles.allImagesTitle}>All Product Images:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {productImages.map((imageUri, imgIndex) => (
                            <TouchableOpacity
                              key={imgIndex}
                              style={styles.thumbnailContainer}
                              onPress={() => openImageModal(imageUri)}
                            >
                              <Image source={{ uri: imageUri }} style={styles.thumbnail} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Reviews Section - Only show if order is delivered */}
                    {order.orderStatus === 'Delivered' && renderReviewSection(item)}
                  </View>
                );
              })}
            </View>

            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Price</Text>
                <Text style={styles.summaryValue}>₱{order.itemsPrice?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee</Text>
                <Text style={styles.summaryValue}>₱{order.shippingPrice?.toFixed(2) || '0.00'}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>₱{order.taxPrice?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₱{order.totalPrice?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>

            {/* Shipping Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shipping Address</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Icon name="location-on" size={16} color="#8B5E3C" />
                </View>
                <Text style={styles.infoText}>
                  {order.shippingInfo?.address}, {order.shippingInfo?.city}, {' '}
                  {order.shippingInfo?.postalCode}, {order.shippingInfo?.country}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Icon name="phone" size={16} color="#8B5E3C" />
                </View>
                <Text style={styles.infoText}>{order.shippingInfo?.phoneNo || 'N/A'}</Text>
              </View>
            </View>

            {/* Payment Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              
              <View style={styles.infoRow}>
                <Icon name="receipt" size={18} color="#666" />
                <Text style={styles.infoText}>
                  Payment Status: <Text style={[
                    styles.paymentStatus,
                    { color: order.paymentInfo?.status === 'paid' ? '#4CAF50' : '#FFA500' }
                  ]}>
                    {order.paymentInfo?.status || 'Pending'}
                  </Text>
                </Text>
              </View>

              {order.paidAt && (
                <View style={styles.infoRow}>
                  <Icon name="event" size={18} color="#666" />
                  <Text style={styles.infoText}>
                    Paid At: {formatDate(order.paidAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Order Dates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Timeline</Text>
              
              <View style={styles.dateRow}>
                <Icon name="event" size={16} color="#999" />
                <Text style={styles.dateLabel}>Order Placed:</Text>
                <Text style={styles.dateValue}>{formatDate(order.createdAt)}</Text>
              </View>
              
              {order.deliveredAt && (
                <View style={styles.dateRow}>
                  <Icon name="check-circle" size={16} color="#999" />
                  <Text style={styles.dateLabel}>Delivered:</Text>
                  <Text style={styles.dateValue}>{formatDate(order.deliveredAt)}</Text>
                </View>
              )}
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 30 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5E9DA',
  },
  loadingText: {
    fontSize: 15,
    color: '#B0A090',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorIconWrapper: {
    backgroundColor: '#FDF0E6',
    borderRadius: 50,
    padding: 22,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5E3C',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#B0A090',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FDF0E6',
    borderRadius: 10,
    padding: 7,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  goBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
  },
  goBackBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  orderId: {
    fontSize: 12,
    color: '#B0A090',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0D6C8',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5E3C',
    marginBottom: 14,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0EAE0',
    borderWidth: 2,
    borderColor: '#E0D6C8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineDotCompleted: {
    backgroundColor: '#A3B18A',
    borderColor: '#A3B18A',
  },
  timelineDotCurrent: {
    borderColor: '#8B5E3C',
    borderWidth: 3,
  },
  timelineText: {
    fontSize: 10,
    color: '#B0A090',
    textAlign: 'center',
  },
  timelineTextCompleted: {
    color: '#8B5E3C',
    fontWeight: '700',
  },
  timelineLine: {
    position: 'absolute',
    top: 12,
    right: -50,
    width: 80,
    height: 2,
    backgroundColor: '#E0D6C8',
  },
  timelineLineCompleted: {
    backgroundColor: '#A3B18A',
  },
  cancelledContainer: {
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FFD4D4',
  },
  cancelledText: {
    color: '#FF8A8A',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  orderItemContainer: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
    paddingBottom: 14,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
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
    fontSize: 14,
    color: '#8B5E3C',
    fontWeight: '700',
    marginBottom: 6,
  },
  itemQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '600',
  },
  itemSubtotal: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '600',
  },
  allImagesContainer: {
    marginTop: 8,
    marginLeft: 84,
  },
  allImagesTitle: {
    fontSize: 12,
    color: '#B0A090',
    marginBottom: 6,
    fontWeight: '500',
  },
  thumbnailContainer: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  thumbnail: {
    width: 52,
    height: 52,
  },
  reviewSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EAE0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5E3C',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  writeReviewText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  editReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  editReviewText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '600',
  },
  averageRatingContainer: {
    marginBottom: 12,
  },
  averageRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  averageRatingText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333333',
  },
  averageStars: {
    flexDirection: 'row',
  },
  totalReviews: {
    fontSize: 12,
    color: '#B0A090',
  },
  userReviewContainer: {
    backgroundColor: '#FDF7F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  yourReviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5E3C',
    marginBottom: 5,
  },
  userReviewContent: {
    marginLeft: 4,
  },
  userReviewStars: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  userReviewComment: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    marginBottom: 4,
  },
  userReviewDate: {
    fontSize: 10,
    color: '#B0A090',
  },
  otherReviewsContainer: {
    marginTop: 8,
  },
  otherReviewsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777777',
    marginBottom: 8,
  },
  otherReviewItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
  },
  otherReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333333',
  },
  reviewerStars: {
    flexDirection: 'row',
  },
  reviewerComment: {
    fontSize: 12,
    color: '#777777',
    lineHeight: 16,
    marginBottom: 4,
  },
  reviewerDate: {
    fontSize: 10,
    color: '#B0A090',
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '700',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIconWrapper: {
    backgroundColor: '#FDF0E6',
    borderRadius: 8,
    padding: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  paymentStatus: {
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 13,
    color: '#B0A090',
    marginLeft: 8,
    marginRight: 6,
  },
  dateValue: {
    flex: 1,
    fontSize: 13,
    color: '#555555',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(139,94,60,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  reviewModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(61,36,18,0.45)',
  },
  reviewModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: '#E0D6C8',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#FDF0E6',
    borderRadius: 8,
  },
  reviewProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#FDF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D6C8',
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
    fontWeight: '700',
    color: '#333333',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0D6C8',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#333333',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#FDF7F2',
  },
  submitReviewButton: {
    backgroundColor: '#8B5E3C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
