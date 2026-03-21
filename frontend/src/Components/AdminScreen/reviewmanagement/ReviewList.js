import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchReviews,
  deleteReview,
  clearError,
  clearSuccess,
} from '../../../redux/slices/reviewSlice';

export default function ReviewListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: reviews, loading, error, success } = useSelector(
    (state) => state.reviews
  );
  
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    if (success) {
      dispatch(clearSuccess());
    }
  }, [error, success, dispatch]);

  useEffect(() => {
    filterReviews();
  }, [searchQuery, selectedRating, reviews]);

  const loadReviews = () => {
    dispatch(fetchReviews());
  };

  const onRefresh = () => {
    loadReviews();
  };

  const filterReviews = () => {
    let filtered = [...reviews];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        review =>
          review.productName?.toLowerCase().includes(query) ||
          review.user?.toLowerCase().includes(query) ||
          review.comment?.toLowerCase().includes(query)
      );
    }

    if (selectedRating !== 'all') {
      const rating = parseInt(selectedRating);
      filtered = filtered.filter(review => review.rating === rating);
    }

    setFilteredReviews(filtered);
  };

  const handleDelete = (review) => {
    Alert.alert(
      'Delete Review',
      `Are you sure you want to permanently delete this review by ${review.user}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteReview(review._id)).unwrap();
              Alert.alert('Success', 'Review deleted successfully');
            } catch (error) {
              Alert.alert('Error', error || 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const handleView = (review) => {
    navigation.navigate('ViewReview', { reviewId: review._id });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            const { logout } = await import('../../../utils/helper');
            await logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-border'}
          size={16}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderRatingFilter = () => {
    const ratings = ['all', '5', '4', '3', '2', '1'];
    const labels = { all: 'All', '5': '5★', '4': '4★', '3': '3★', '2': '2★', '1': '1★' };

    return (
      <View style={styles.ratingFilterContainer}>
        {ratings.map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingFilterChip,
              selectedRating === rating && styles.ratingFilterChipActive,
            ]}
            onPress={() => setSelectedRating(rating)}
          >
            <Text
              style={[
                styles.ratingFilterText,
                selectedRating === rating && styles.ratingFilterTextActive,
              ]}
            >
              {labels[rating]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRightActions = (review) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(review)}
      >
        <Icon name="delete" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.reviewCard}
        onPress={() => handleView(item)}
      >
        <View style={styles.reviewHeader}>
          <View style={styles.productInfo}>
            <Icon name="shopping-bag" size={20} color="#FF6B6B" />
            <Text style={styles.productName} numberOfLines={1}>
              {item.productName || 'Unknown Product'}
            </Text>
          </View>
          <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {item.user ? item.user.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.user || 'Anonymous'}</Text>
            <Text style={styles.userEmail}>{item.userEmail || 'No email'}</Text>
          </View>
        </View>

        <View style={styles.ratingContainer}>
          {renderStars(item.rating)}
          <Text style={styles.ratingText}>{item.rating}.0</Text>
        </View>

        <Text style={styles.reviewComment} numberOfLines={2}>
          {item.comment || 'No comment provided'}
        </Text>

        <View style={styles.reviewFooter}>
          <Icon name="chevron-right" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const ReviewListContent = () => (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product, user, or comment..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Toggle */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Icon name="filter-list" size={20} color="#FF6B6B" />
        <Text style={styles.filterToggleText}>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Text>
        <Icon
          name={showFilters ? 'expand-less' : 'expand-more'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {/* Rating Filters */}
      {showFilters && renderRatingFilter()}

      {/* Results Count */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'} found
        </Text>
      </View>

      <FlatList
        data={filteredReviews}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Icon name="rate-review" size={80} color="#E0E0E0" />
              <Text style={styles.emptyText}>No reviews found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedRating !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Reviews will appear here'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );

  if (loading && reviews.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ReviewListContent />
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterToggleText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  ratingFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ratingFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  ratingFilterChipActive: {
    backgroundColor: '#FF6B6B',
  },
  ratingFilterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  ratingFilterTextActive: {
    color: 'white',
  },
  resultsInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  swipeButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginLeft: 5,
    height: '100%',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});