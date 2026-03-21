import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchReviewById,
  deleteReview,
  clearError,
  clearSuccess,
  clearCurrentReview,
} from '../../../redux/slices/reviewSlice';

export default function ViewReview({ route, navigation }) {
  const { reviewId } = route.params;
  const dispatch = useDispatch();
  const { currentReview: review, loading, error, success } = useSelector(
    (state) => state.reviews
  );

  useEffect(() => {
    dispatch(fetchReviewById(reviewId));
    
    return () => {
      dispatch(clearCurrentReview());
    };
  }, [dispatch, reviewId]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    if (success) {
      Alert.alert('Success', 'Review deleted successfully');
      dispatch(clearSuccess());
      navigation.goBack();
    }
  }, [error, success, dispatch, navigation]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Review',
      `Are you sure you want to permanently delete this review by ${review?.user}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteReview(review._id));
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-border'}
          size={24}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  if (loading) {
    return (
      <AdminDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading review details...</Text>
        </View>
      </AdminDrawer>
    );
  }

  if (!review) {
    return (
      <AdminDrawer>
        <View style={styles.centered}>
          <Icon name="error-outline" size={80} color="#e0e0e0" />
          <Text style={styles.errorTitle}>Review Not Found</Text>
          <Text style={styles.errorText}>
            The review you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AdminDrawer>
    );
  }

  return (
    <AdminDrawer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Product Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Icon name="shopping-bag" size={24} color="#FF6B6B" />
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{review.productName || 'Unknown Product'}</Text>
                  <Text style={styles.productId}>Product ID: {review.productId || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* User Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviewer Information</Text>
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {review.user ? review.user.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{review.user || 'Anonymous'}</Text>
                <Text style={styles.userEmail}>{review.userEmail || 'No email provided'}</Text>
                {review.userId && (
                  <Text style={styles.userId}>User ID: {review.userId}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Review Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review Details</Text>
            
            <View style={styles.reviewCard}>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Rating:</Text>
                {renderStars(review.rating)}
                <Text style={styles.ratingValue}>{review.rating}.0 / 5.0</Text>
              </View>

              <View style={styles.commentContainer}>
                <Text style={styles.commentLabel}>Comment:</Text>
                <Text style={styles.commentText}>{review.comment || 'No comment provided'}</Text>
              </View>

              <View style={styles.datesContainer}>
                <View style={styles.dateRow}>
                  <Icon name="event" size={16} color="#666" />
                  <Text style={styles.dateLabel}>Created:</Text>
                  <Text style={styles.dateValue}>{formatDate(review.createdAt)}</Text>
                </View>
                
                {review.updatedAt && review.updatedAt !== review.createdAt && (
                  <View style={styles.dateRow}>
                    <Icon name="update" size={16} color="#666" />
                    <Text style={styles.dateLabel}>Updated:</Text>
                    <Text style={styles.dateValue}>{formatDate(review.updatedAt)}</Text>
                  </View>
                )}
              </View>

              {/* Status Badge - shows if active or not */}
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View style={[styles.statusBadge, review.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, review.isActive ? styles.activeText : styles.inactiveText]}>
                    {review.isActive ? 'Active' : 'Deleted'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Icon name="delete" size={20} color="white" />
              <Text style={styles.actionButtonText}>Delete Review</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
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
  productCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productDetails: {
    marginLeft: 12,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productId: {
    fontSize: 12,
    color: '#999',
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  commentContainer: {
    marginBottom: 12,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  commentText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  datesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    marginRight: 4,
    fontWeight: '500',
  },
  dateValue: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: '#e8f5e9',
  },
  inactiveBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeText: {
    color: '#2e7d32',
  },
  inactiveText: {
    color: '#c62828',
  },
  actionButtons: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});