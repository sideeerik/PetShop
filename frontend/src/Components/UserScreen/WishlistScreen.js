// CVPetShop/frontend/src/Components/UserScreen/WishlistScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWishlist } from '../../context/WishlistContext';
import UserDrawer from './UserDrawer';
import Header from '../layouts/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const WishlistScreen = () => {
    const navigation = useNavigation();
    const { 
        wishlistItems, 
        loading, 
        fetchWishlist,
        removeFromWishlist,
        clearWishlist: contextClearWishlist
    } = useWishlist();
    
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [localItems, setLocalItems] = useState([]);
    const [clearingAll, setClearingAll] = useState(false);

    // Helper function to get token
    const getToken = async () => {
        const possibleKeys = [
            'userToken',
            'token',
            'accessToken',
            'access_token',
            'authToken',
            'jwt'
        ];
        
        for (const key of possibleKeys) {
            const token = await AsyncStorage.getItem(key);
            if (token) {
                console.log(`Found token with key: ${key}`);
                return token;
            }
        }
        
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                if (parsed.token) return parsed.token;
                if (parsed.accessToken) return parsed.accessToken;
            }
        } catch (e) {
            console.error('Error parsing userData:', e);
        }
        
        return null;
    };

    // Update local items when wishlistItems changes
    useEffect(() => {
        console.log('Wishlist items updated:', wishlistItems);
        setLocalItems(wishlistItems);
    }, [wishlistItems]);

    // Refresh wishlist when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('WishlistScreen focused - fetching wishlist');
            fetchWishlist(true);
            return () => {
                // Cleanup if needed
            };
        }, [fetchWishlist])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchWishlist(true);
        setRefreshing(false);
    };

    const handleRemove = async (productId, productName) => {
        Alert.alert(
            'Remove from Wishlist',
            `Are you sure you want to remove "${productName}" from your wishlist?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(productId);
                        const result = await removeFromWishlist(productId, productName);
                        setProcessingId(null);
                        
                        if (result && !result.success) {
                            Alert.alert('Error', result.message);
                        }
                    }
                }
            ]
        );
    };

    // FIXED: Clear all items from wishlist with proper API call
    const handleClearAll = async () => {
        if (localItems.length === 0) return;
        
        Alert.alert(
            'Clear Wishlist',
            `Are you sure you want to remove all ${localItems.length} items from your wishlist?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        setClearingAll(true);
                        try {
                            const token = await getToken();
                            
                            if (!token) {
                                Alert.alert(
                                    'Session Expired',
                                    'Please login again',
                                    [
                                        { 
                                            text: 'OK', 
                                            onPress: () => navigation.navigate('Login') 
                                        }
                                    ]
                                );
                                return;
                            }

                            console.log('Clearing all wishlist items...');
                            
                            // Make API call to clear wishlist
                            const response = await axios.delete(
                                `${BACKEND_URL}/api/v1/wishlist/clear`,
                                { 
                                    headers: { 
                                        Authorization: `Bearer ${token}` 
                                    },
                                    timeout: 10000
                                }
                            );

                            console.log('Clear wishlist response:', response.data);

                            if (response.data.success) {
                                // Force fetch updated wishlist
                                await fetchWishlist(true);
                                Alert.alert('Success', 'Wishlist cleared successfully');
                            } else {
                                Alert.alert('Error', response.data.message || 'Failed to clear wishlist');
                            }
                        } catch (error) {
                            console.error('Error clearing wishlist:', error);
                            
                            // Handle specific error cases
                            if (error.response) {
                                // Server responded with error
                                console.error('Error response:', error.response.data);
                                
                                if (error.response.status === 401) {
                                    Alert.alert(
                                        'Session Expired',
                                        'Your session has expired. Please login again.',
                                        [
                                            { 
                                                text: 'OK', 
                                                onPress: () => navigation.navigate('Login') 
                                            }
                                        ]
                                    );
                                } else {
                                    Alert.alert(
                                        'Error', 
                                        error.response.data?.message || 'Failed to clear wishlist'
                                    );
                                }
                            } else if (error.request) {
                                // Request made but no response
                                console.error('No response received');
                                Alert.alert(
                                    'Connection Error',
                                    'Unable to connect to server. Please check your internet connection.'
                                );
                            } else {
                                // Something else happened
                                Alert.alert('Error', 'Failed to clear wishlist. Please try again.');
                            }
                        } finally {
                            setClearingAll(false);
                        }
                    }
                }
            ]
        );
    };

    const handleProductPress = (productId) => {
        navigation.navigate('SingleProduct', { productId });
    };

    const handleAddToCart = (product) => {
        // Navigate to product details or directly to cart
        navigation.navigate('SingleProduct', { productId: product._id });
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Icon name="favorite-border" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptyText}>
                Save your favorite items here by tapping the heart icon on products
            </Text>
            <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('Home')}
            >
                <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
        </View>
    );

    const renderItem = ({ item }) => {
        // Handle both { product: {...} } structure and direct product structure
        const product = item.product || item;
        if (!product || !product._id) {
            console.log('Invalid item in wishlist:', item);
            return null;
        }

        const isOutOfStock = product.stock <= 0;
        const isProcessing = processingId === product._id;
        
        // Determine price display
        const displayPrice = product.isOnSale && product.discountedPrice
            ? parseFloat(product.discountedPrice).toFixed(2)
            : parseFloat(product.price || 0).toFixed(2);
        
        const originalPrice = product.isOnSale && product.discountedPrice
            ? parseFloat(product.price).toFixed(2)
            : null;

        // Get first image
        const imageUrl = product.images && product.images.length > 0 
            ? (product.images[0].url || product.images[0])
            : 'https://via.placeholder.com/150';

        return (
            <View style={styles.productCard}>
                <TouchableOpacity
                    onPress={() => handleProductPress(product._id)}
                    activeOpacity={0.85}
                >
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                </TouchableOpacity>

                <View style={styles.productInfo}>
                    <TouchableOpacity
                        onPress={() => handleProductPress(product._id)}
                        activeOpacity={0.85}
                        style={styles.productDetails}
                    >
                        <Text style={styles.productName} numberOfLines={2}>
                            {product.name}
                        </Text>
                        
                        <Text style={styles.productCategory} numberOfLines={1}>
                            {product.category || 'Uncategorized'}
                        </Text>

                        <View style={styles.priceContainer}>
                            {product.isOnSale && product.discountedPrice ? (
                                <>
                                    <Text style={styles.originalPrice}>₱{originalPrice}</Text>
                                    <Text style={styles.discountedPrice}>₱{displayPrice}</Text>
                                </>
                            ) : (
                                <Text style={styles.productPrice}>₱{displayPrice}</Text>
                            )}
                        </View>

                        {isOutOfStock && (
                            <View style={styles.outOfStockBadge}>
                                <Text style={styles.outOfStockText}>Out of Stock</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.actionButtons}>
                        {!isOutOfStock && (
                            <TouchableOpacity
                                style={styles.cartButton}
                                onPress={() => handleAddToCart(product)}
                            >
                                <Icon name="add-shopping-cart" size={18} color="#FF6B6B" />
                                <Text style={styles.cartButtonText}>View Product</Text>
                            </TouchableOpacity>
                        )}

                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => handleRemove(product._id, product.name)}
                            >
                                <Icon name="delete-outline" size={22} color="#FF6B6B" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <Text style={styles.title}>My Wishlist</Text>
                <Text style={styles.count}>
                    {localItems.length} {localItems.length === 1 ? 'item' : 'items'}
                </Text>
            </View>
            {localItems.length > 0 && (
                <TouchableOpacity
                    style={[styles.clearButton, clearingAll && styles.disabledButton]}
                    onPress={handleClearAll}
                    disabled={clearingAll}
                >
                    {clearingAll ? (
                        <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                        <>
                            <Icon name="delete-sweep" size={22} color="#FF6B6B" />
                            <Text style={styles.clearButtonText}>Clear All</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading && !refreshing && localItems.length === 0) {
        return (
            <UserDrawer>
                <View style={styles.container}>
                    <Header />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FF6B6B" />
                    </View>
                </View>
            </UserDrawer>
        );
    }

    return (
        <UserDrawer>
            <View style={styles.container}>
                <Header />
                
                <FlatList
                    data={localItems}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => {
                        const product = item.product || item;
                        return product?._id || index.toString();
                    }}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </UserDrawer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 20,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    count: {
        fontSize: 14,
        color: '#666',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    disabledButton: {
        opacity: 0.5,
    },
    clearButtonText: {
        color: '#FF6B6B',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    productImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    productDetails: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    productCategory: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    productPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B6B',
    },
    originalPrice: {
        fontSize: 12,
        color: '#999',
        textDecorationLine: 'line-through',
        marginRight: 6,
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B6B',
    },
    outOfStockBadge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    outOfStockText: {
        fontSize: 10,
        color: '#999',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    cartButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff0f0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginRight: 10,
    },
    cartButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF6B6B',
        marginLeft: 4,
    },
    removeButton: {
        padding: 8,
        backgroundColor: '#fff0f0',
        borderRadius: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    shopButton: {
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 10,
    },
    shopButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default WishlistScreen;