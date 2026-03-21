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
import { getToken } from '../../../utils/helper';
import UserDrawer from '../UserDrawer';
import Header from '../../layouts/Header';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Status color mapping - Updated to match your model's enum values
const STATUS_COLORS = {
  'Processing': '#FFA500',
  'Accepted': '#4A6FA5',
  'Out for Delivery': '#FFA500',
  'Delivered': '#4CAF50',
  'Cancelled': '#FF6B6B',
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
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
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
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      Alert.alert('Error', 'Please enter a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const productId = selectedProduct.product?._id || selectedProduct.product;
      const existingReview = userReviews[productId];
      
      const reviewData = {
        rating,
        comment,
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
          <ActivityIndicator size="large" color="#FF6B6B" />
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
            <Icon name="error-outline" size={80} color="#e0e0e0" />
            <Text style={styles.errorTitle}>Order Not Found</Text>
            <Text style={styles.errorText}>
              {error || "The order you're looking for doesn't exist or has been removed."}
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
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
              <Icon name="close" size={30} color="white" />
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
                  <TouchableOpacity onPress={() => {
                    setReviewModalVisible(false);
                    dismissKeyboard();
                  }}>
                    <Icon name="close" size={24} color="#333" />
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
                          <Icon name="image" size={24} color="#ccc" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewProductName}>{selectedProduct.name}</Text>
                  </View>
                )}

                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <View style={styles.starsContainer}>
                    {renderStars(rating, true, 30)}
                  </View>
                </View>

                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Your Review</Text>
                  <TextInput
                    style={styles.commentInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Share your experience with this product..."
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
            {/* Header with Back Button */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Order Details</Text>
                <Text style={styles.orderId}>#{order._id?.slice(-8).toUpperCase()}</Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[order.orderStatus] || '#999' }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[order.orderStatus] || '#999' }]}>
                  {order.orderStatus}
                </Text>
              </View>
            </View>

            {/* Order Timeline - Only show for non-cancelled orders */}
            {order.orderStatus !== 'Cancelled' && (
              <View style={styles.timelineContainer}>
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
                <Text style={styles.summaryLabel}>Shipping Price</Text>
                <Text style={styles.summaryValue}>₱{order.shippingPrice?.toFixed(2) || '0.00'}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax Price</Text>
                <Text style={styles.summaryValue}>₱{order.taxPrice?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{order.totalPrice?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>

            {/* Shipping Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shipping Information</Text>
              
              <View style={styles.infoRow}>
                <Icon name="location-on" size={18} color="#666" />
                <Text style={styles.infoText}>
                  {order.shippingInfo?.address}, {order.shippingInfo?.city}, {' '}
                  {order.shippingInfo?.postalCode}, {order.shippingInfo?.country}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="phone" size={18} color="#666" />
                <Text style={styles.infoText}>{order.shippingInfo?.phoneNo || 'N/A'}</Text>
              </View>
            </View>

            {/* Payment Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              
              <View style={styles.infoRow}>
                <Icon name="payment" size={18} color="#666" />
                <Text style={styles.infoText}>
                  Payment ID: {order.paymentInfo?.id || 'N/A'}
                </Text>
              </View>
              
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  timelineContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  timelineDotCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timelineDotCurrent: {
    borderColor: '#FF6B6B',
    borderWidth: 3,
  },
  timelineText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  timelineTextCompleted: {
    color: '#333',
    fontWeight: '500',
  },
  timelineLine: {
    position: 'absolute',
    top: 11,
    right: -50,
    width: 80,
    height: 2,
    backgroundColor: '#f0f0f0',
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  cancelledContainer: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  cancelledText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  orderItemContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 8,
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
    color: '#FF6B6B',
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
  allImagesContainer: {
    marginTop: 8,
    marginLeft: 82, // Align with the image width + margin
  },
  allImagesTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  thumbnailContainer: {
    marginRight: 8,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  thumbnail: {
    width: 50,
    height: 50,
  },
  // Review Styles
  reviewSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  writeReviewText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
    fontWeight: '500',
  },
  editReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  editReviewText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '500',
  },
  averageRatingContainer: {
    marginBottom: 12,
  },
  averageRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRatingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
  averageStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  totalReviews: {
    fontSize: 12,
    color: '#999',
  },
  userReviewContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  yourReviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  userReviewContent: {
    marginLeft: 4,
  },
  userReviewStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  userReviewComment: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginBottom: 4,
  },
  userReviewDate: {
    fontSize: 10,
    color: '#999',
  },
  otherReviewsContainer: {
    marginTop: 8,
  },
  otherReviewsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  otherReviewItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  otherReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  reviewerStars: {
    flexDirection: 'row',
  },
  reviewerComment: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 4,
  },
  reviewerDate: {
    fontSize: 10,
    color: '#999',
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
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
  discountValue: {
    color: '#4CAF50',
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
    color: '#FF6B6B',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
  },
  paymentStatus: {
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
    marginRight: 4,
  },
  dateValue: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  // Review Modal Styles
  reviewModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  reviewModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
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
    color: '#333',
  },
  reviewProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
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
    backgroundColor: '#f0f0f0',
  },
  reviewProductName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});