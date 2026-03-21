import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchProducts,
  deleteProduct,
  clearError,
  clearSuccess,
} from '../../../redux/slices/productSlice';

export default function ProductListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: products, loading, error, success } = useSelector(
    (state) => state.products
  );

  useEffect(() => {
    loadProducts();
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

  const loadProducts = () => {
    dispatch(fetchProducts());
  };

  const onRefresh = () => {
    loadProducts();
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProduct(product._id)).unwrap();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              Alert.alert('Error', error || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (product) => {
    navigation.navigate('UpdateProduct', { productId: product._id });
  };

  const handleView = (product) => {
    navigation.navigate('ViewProduct', { productId: product._id });
  };

  const handleGoToTrash = () => {
    navigation.navigate('TrashProduct');
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

  const renderRightActions = (product) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.editButton]}
        onPress={() => handleEdit(product)}
      >
        <Icon name="edit" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(product)}
      >
        <Icon name="delete" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const displayPrice = item.isOnSale && item.discountedPrice 
      ? parseFloat(item.discountedPrice).toFixed(2) 
      : parseFloat(item.price || 0).toFixed(2);
    
    const originalPrice = item.isOnSale && item.discountedPrice 
      ? parseFloat(item.price).toFixed(2) 
      : null;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => handleView(item)}
        >
          <Image
            source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/100' }}
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            
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
            
            <Text style={styles.productCategory}>{item.category}</Text>
            <View style={styles.productMeta}>
              <Text style={styles.stockText}>
                Stock: <Text style={item.stock > 0 ? styles.inStock : styles.outOfStock}>
                  {item.stock}
                </Text>
              </Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color="#f39c12" />
                <Text style={styles.ratingText}>{item.ratings?.toFixed(1) || '0.0'}</Text>
                <Text style={styles.reviewCount}>({item.numOfReviews || 0})</Text>
              </View>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const ProductListContent = () => (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={80} color="#E0E0E0" />
              <Text style={styles.emptyText}>No products found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateProduct')}
              >
                <Text style={styles.emptyButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
      
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.trashButton]}
          onPress={handleGoToTrash}
        >
          <Icon name="delete" size={24} color="white" />
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Trash</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fab, styles.addButton]}
          onPress={() => navigation.navigate('CreateProduct')}
        >
          <Icon name="add" size={24} color="white" />
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Create</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ProductListContent />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  // ... keep all your existing styles
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
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  discountBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f1f2f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#666',
  },
  inStock: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  outOfStock: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 2,
    marginRight: 2,
    color: '#f39c12',
    fontWeight: 'bold',
  },
  reviewCount: {
    fontSize: 10,
    color: '#666',
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
  editButton: {
    backgroundColor: '#3498db',
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
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
  },
  addButton: {
    backgroundColor: '#2ecc71',
  },
  trashButton: {
    backgroundColor: '#e74c3c',
  },
  fabLabel: {
    marginLeft: 8,
  },
  fabLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});