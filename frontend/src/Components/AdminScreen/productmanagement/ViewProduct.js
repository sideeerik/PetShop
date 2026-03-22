import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchProductById,
  clearError,
  clearCurrentProduct,
} from '../../../redux/slices/productSlice';

export default function ViewProductScreen({ navigation, route }) {
  const { productId } = route.params;
  const dispatch = useDispatch();
  const { currentProduct: product, loading, error } = useSelector(
    (state) => state.products
  );
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    dispatch(fetchProductById(productId));
    
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, productId]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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

  const ViewProductContent = () => {
    if (!product) return null;

    const displayPrice = product.isOnSale && product.discountedPrice 
      ? parseFloat(product.discountedPrice).toFixed(2) 
      : parseFloat(product.price || 0).toFixed(2);
    
    const originalPrice = product.isOnSale && product.discountedPrice 
      ? parseFloat(product.price).toFixed(2) 
      : null;

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color="#7A4B2A" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Admin</Text>
            <Text style={styles.headerTitle}>Product Details</Text>
          </View>
          <View style={styles.headerBadge}>
            <Icon name="inventory" size={18} color="#7A4B2A" />
          </View>
        </View>

        {product.images && product.images.length > 0 && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: product.images[imageIndex]?.url }}
              style={styles.mainImage}
            />
            {product.images.length > 1 && (
              <FlatList
                horizontal
                data={product.images}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity onPress={() => setImageIndex(index)}>
                    <Image
                      source={{ uri: item.url }}
                      style={[
                        styles.thumbnail,
                        index === imageIndex && styles.selectedThumbnail,
                      ]}
                    />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.thumbnailContainer}
              />
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.title}>{product.name}</Text>
          
          <View style={styles.priceContainer}>
            <View>
              {product.isOnSale && product.discountedPrice ? (
                <>
                  <View style={styles.discountRow}>
                    <Text style={styles.originalPrice}>₱{originalPrice}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {product.discountPercentage ? `${product.discountPercentage}% OFF` : 'SALE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.discountedPrice}>₱{displayPrice}</Text>
                </>
              ) : (
                <Text style={styles.price}>₱{displayPrice}</Text>
              )}
            </View>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={18} color="#f39c12" />
              <Text style={styles.rating}>{product.ratings?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.reviewCount}>({product.numOfReviews || 0} reviews)</Text>
            </View>
          </View>

          {product.isOnSale && product.discountStartDate && product.discountEndDate && (
            <View style={styles.discountPeriodContainer}>
              <Icon name="event" size={16} color="#e74c3c" />
              <Text style={styles.discountPeriodText}>
                Sale ends: {new Date(product.discountEndDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{product.category}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Stock:</Text>
            <Text style={[
              styles.value,
              product.stock > 0 ? styles.inStock : styles.outOfStock
            ]}>
              {product.stock} {product.stock > 0 ? 'available' : 'out of stock'}
            </Text>
          </View>

          {product.supplier && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Supplier:</Text>
              <Text style={styles.value}>{product.supplier?.name || 'N/A'}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {product.supplier && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplier Information</Text>
              <Text style={styles.text}>{product.supplier.name}</Text>
              <Text style={styles.text}>{product.supplier.email}</Text>
              <Text style={styles.text}>{product.supplier.phone}</Text>
              <Text style={styles.text}>{product.supplier.address?.city}, {product.supplier.address?.state}</Text>
            </View>
          )}
        </View>

        {product.reviews && product.reviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Customer Reviews ({product.reviews.length})</Text>
            {product.reviews.map((review) => (
              <View key={review._id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
                  <View style={styles.reviewRating}>
                    <Icon name="star" size={16} color="#f39c12" />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('UpdateProduct', { productId: product._id })}
          >
            <Icon name="edit" size={20} color="white" />
            <Text style={styles.buttonText}>Edit Product</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color="#7A4B2A" />
            <Text style={styles.backButtonText}>Back to List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Icon name="error-outline" size={80} color="#e0e0e0" />
        <Text style={styles.errorTitle}>Product Not Found</Text>
        <Text style={styles.errorText}>
          The product you're looking for doesn't exist or has been Update.
        </Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ViewProductContent />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6EDE3',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8B5E3C',
    borderRadius: 25,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FDF7F1',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
  },
  headerBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A87B54',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  mainImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  thumbnailContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#8B5E3C',
  },
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 15,
    color: '#3E2A1F',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5E3C',
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5E3C',
  },
  discountBadge: {
    backgroundColor: '#C95E52',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountPeriodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7E3DE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  discountPeriodText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#C95E52',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 18,
    color: '#f39c12',
    fontWeight: 'bold',
    marginLeft: 5,
    marginRight: 5,
  },
  reviewCount: {
    fontSize: 14,
    color: '#7C6555',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE0D2',
  },
  label: {
    fontSize: 16,
    color: '#7C6555',
    fontWeight: '700',
  },
  value: {
    fontSize: 16,
    color: '#5C3B28',
  },
  inStock: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  outOfStock: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  section: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EFE0D2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    color: '#3E2A1F',
  },
  description: {
    fontSize: 16,
    color: '#5C3B28',
    lineHeight: 24,
  },
  text: {
    fontSize: 14,
    color: '#5C3B28',
    marginBottom: 5,
  },
  reviewItem: {
    backgroundColor: '#F9F2EB',
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2A1F',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#f39c12',
    fontWeight: 'bold',
  },
  reviewComment: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginBottom: 30,
  },
  editButton: {
    backgroundColor: '#8B5E3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginRight: 5,
  },
  backButton: {
    backgroundColor: '#EEE2D6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: '#D7B99A',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '800',
  },
  backButtonText: {
    color: '#7A4B2A',
    marginLeft: 5,
    fontWeight: '800',
  },
});
