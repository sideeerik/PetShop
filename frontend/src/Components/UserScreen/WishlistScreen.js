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
            <View style={styles.emptyIconWrapper}>
                <Icon name="favorite-border" size={48} color="#C4A882" />
            </View>
            <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
            <Text style={styles.emptyText}>
                Save your favorite pet products here by tapping the heart icon on any product.
            </Text>
            <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('Home')}
            >
                <Icon name="storefront" size={18} color="white" />
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
                    {isOutOfStock && (
                        <View style={styles.outOfStockOverlay}>
                            <Text style={styles.outOfStockOverlayText}>Out of Stock</Text>
                        </View>
                    )}
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
                                <Icon name="add-shopping-cart" size={16} color="#8B5E3C" />
                                <Text style={styles.cartButtonText}>View Product</Text>
                            </TouchableOpacity>
                        )}

                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#FF8A8A" />
                        ) : (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => handleRemove(product._id, product.name)}
                            >
                                <Icon name="delete-outline" size={20} color="#FF8A8A" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.listHeader}>
            <View style={styles.headerContent}>
                <Text style={styles.title}>My Wishlist</Text>
                <Text style={styles.count}>
                    {localItems.length === 0
                        ? 'No saved items'
                        : `${localItems.length} ${localItems.length === 1 ? 'item saved' : 'items saved'}`}
                </Text>
            </View>
            {localItems.length > 0 && (
                <TouchableOpacity
                    style={[styles.clearButton, clearingAll && styles.disabledButton]}
                    onPress={handleClearAll}
                    disabled={clearingAll}
                >
                    {clearingAll ? (
                        <ActivityIndicator size="small" color="#FF8A8A" />
                    ) : (
                        <>
                            <Icon name="delete-sweep" size={20} color="#FF8A8A" />
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
                        <ActivityIndicator size="large" color="#8B5E3C" />
                        <Text style={styles.loadingText}>Loading your wishlist...</Text>
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
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#8B5E3C']}
                            tintColor="#8B5E3C"
                        />
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
        backgroundColor: '#F5E9DA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#B0A090',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E0D6C8',
        elevation: 2,
        shadowColor: '#8B5E3C',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#8B5E3C',
        marginBottom: 3,
    },
    count: {
        fontSize: 13,
        color: '#B0A090',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFD4D4',
        gap: 4,
    },
    disabledButton: {
        opacity: 0.5,
    },
    clearButtonText: {
        color: '#FF8A8A',
        fontSize: 13,
        fontWeight: '700',
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        marginBottom: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E0D6C8',
        elevation: 2,
        shadowColor: '#8B5E3C',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    productImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
        backgroundColor: '#FDF0E6',
    },
    outOfStockOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(139,94,60,0.6)',
        paddingVertical: 4,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        alignItems: 'center',
    },
    outOfStockOverlayText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '700',
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
        fontSize: 15,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 4,
    },
    productCategory: {
        fontSize: 12,
        color: '#A3B18A',
        marginBottom: 6,
        fontWeight: '500',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        flexWrap: 'wrap',
        gap: 4,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: '#8B5E3C',
    },
    originalPrice: {
        fontSize: 12,
        color: '#B0A090',
        textDecorationLine: 'line-through',
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: '#8B5E3C',
    },
    outOfStockBadge: {
        backgroundColor: '#F0EAE0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E0D6C8',
    },
    outOfStockText: {
        fontSize: 10,
        color: '#B0A090',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    cartButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FDF0E6',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0D6C8',
        gap: 4,
    },
    cartButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8B5E3C',
    },
    removeButton: {
        padding: 8,
        backgroundColor: '#FFF0F0',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FFD4D4',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyIconWrapper: {
        backgroundColor: '#FDF0E6',
        borderRadius: 50,
        padding: 24,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0D6C8',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#8B5E3C',
        marginTop: 14,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: '#B0A090',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    shopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B5E3C',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
        elevation: 3,
        shadowColor: '#8B5E3C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    shopButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default WishlistScreen;
