import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import * as SQLite from 'expo-sqlite';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken, resetToAuth } from '../../utils/helper';
import UserDrawer from './UserDrawer';
import Header from '../layouts/Header';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

let dbInstance = null;

const getDB = async () => {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await SQLite.openDatabaseAsync('cvpetshop.db');
    const tableExists = await dbInstance.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='cart_items';"
    );

    if (!tableExists) {
      await dbInstance.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS cart_items (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          name TEXT,
          price REAL,
          discountedPrice REAL,
          discountPercentage REAL,
          isOnSale INTEGER DEFAULT 0,
          quantity INTEGER DEFAULT 1,
          image TEXT,
          category TEXT
        );
      `);
    } else {
      const tableInfo = await dbInstance.getAllAsync('PRAGMA table_info(cart_items);');
      const columns = tableInfo.map((column) => column.name);

      if (!columns.includes('discountedPrice')) {
        await dbInstance.execAsync('ALTER TABLE cart_items ADD COLUMN discountedPrice REAL;');
      }
      if (!columns.includes('discountPercentage')) {
        await dbInstance.execAsync('ALTER TABLE cart_items ADD COLUMN discountPercentage REAL;');
      }
      if (!columns.includes('isOnSale')) {
        await dbInstance.execAsync('ALTER TABLE cart_items ADD COLUMN isOnSale INTEGER DEFAULT 0;');
      }
    }
  } catch (error) {
    console.error('Error setting up database:', error);
    try {
      await dbInstance?.execAsync('DROP TABLE IF EXISTS cart_items;');
      await dbInstance?.execAsync(`
        CREATE TABLE cart_items (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          name TEXT,
          price REAL,
          discountedPrice REAL,
          discountPercentage REAL,
          isOnSale INTEGER DEFAULT 0,
          quantity INTEGER DEFAULT 1,
          image TEXT,
          category TEXT
        );
      `);
    } catch (recreateError) {
      console.error('Failed to recreate table:', recreateError);
    }
  }

  return dbInstance;
};

export const saveCartToSQLite = async (items) => {
  try {
    const db = await getDB();
    await db.execAsync('DELETE FROM cart_items;');

    for (const item of items) {
      const product = item.product || {};
      const id = item._id || product._id || String(Date.now() + Math.random());
      const productId = product._id || id;
      const price = parseFloat(product.price || 0);
      const discountedPrice = product.discountedPrice ? parseFloat(product.discountedPrice) : null;
      const discountPercentage = product.discountPercentage ? parseFloat(product.discountPercentage) : null;
      let isOnSale = product.isOnSale ? 1 : 0;

      if (!isOnSale && discountedPrice && discountedPrice > 0 && discountedPrice < price) {
        isOnSale = 1;
      }

      await db.runAsync(
        `INSERT OR REPLACE INTO cart_items
          (id, productId, name, price, discountedPrice, discountPercentage, isOnSale, quantity, image, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          productId,
          product.name || '',
          price,
          discountedPrice,
          discountPercentage,
          isOnSale,
          item.quantity || 1,
          product.images?.[0]?.url || '',
          product.category || '',
        ]
      );
    }
  } catch (error) {
    console.error('SQLite save error:', error);
  }
};

export const loadCartFromSQLite = async () => {
  try {
    const db = await getDB();
    const rows = await db.getAllAsync('SELECT * FROM cart_items;');

    return rows.map((row) => {
      const hasDiscount = row.discountedPrice && row.discountedPrice > 0 && row.discountedPrice < row.price;
      return {
        _id: row.id,
        quantity: row.quantity,
        product: {
          _id: row.productId,
          name: row.name,
          price: row.price,
          discountedPrice: row.discountedPrice,
          discountPercentage: row.discountPercentage,
          isOnSale: row.isOnSale === 1 || hasDiscount,
          category: row.category,
          images: row.image ? [{ url: row.image }] : [],
        },
      };
    });
  } catch (error) {
    console.error('SQLite load error:', error);
    return [];
  }
};

export const clearCartSQLite = async () => {
  try {
    const db = await getDB();
    await db.execAsync('DELETE FROM cart_items;');
  } catch (error) {
    console.error('SQLite clear error:', error);
  }
};

const fetchFreshProductData = async (productId, token) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success && response.data.product) {
      return response.data.product;
    }
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error.message);
  }

  return null;
};

const enrichCartItemsWithFreshData = async (cartItems, token) => {
  if (!cartItems || cartItems.length === 0) return [];

  return Promise.all(
    cartItems.map(async (item) => {
      const productId = item.product?._id;
      if (!productId) return item;

      const freshProduct = await fetchFreshProductData(productId, token);
      if (freshProduct) {
        return { ...item, product: { ...item.product, ...freshProduct } };
      }

      return item;
    })
  );
};

const ItemImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const urls = (images || []).filter((image) => image?.url).map((image) => image.url);

  if (urls.length === 0) {
    return (
      <View style={styles.itemImagePlaceholder}>
        <Icon name="pets" size={28} color="#C4A882" />
      </View>
    );
  }

  const goPrev = () => setCurrentIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
  const goNext = () => setCurrentIndex((prev) => (prev === urls.length - 1 ? 0 : prev + 1));

  return (
    <View style={styles.itemCarouselContainer}>
      <Image source={{ uri: urls[currentIndex] }} style={styles.itemImage} resizeMode="cover" />

      {urls.length > 1 && (
        <>
          <TouchableOpacity style={styles.carouselArrowLeft} onPress={goPrev} activeOpacity={0.7}>
            <Text style={styles.carouselArrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.carouselArrowRight} onPress={goNext} activeOpacity={0.7}>
            <Text style={styles.carouselArrowText}>›</Text>
          </TouchableOpacity>
          <View style={styles.carouselDots} pointerEvents="none">
            {urls.map((_, index) => (
              <View
                key={index}
                style={[styles.carouselDot, index === currentIndex && styles.carouselDotActive]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const CartItem = ({ item, onIncrease, onDecrease, onRemove, disabled }) => {
  const product = item.product || {};
  const hasDiscountedPrice =
    product.discountedPrice &&
    parseFloat(product.discountedPrice) > 0 &&
    parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
  const isOnSale = product.isOnSale === true || hasDiscountedPrice;
  const price = isOnSale && hasDiscountedPrice
    ? parseFloat(product.discountedPrice)
    : parseFloat(product.price || 0);
  const originalPrice = isOnSale && hasDiscountedPrice ? parseFloat(product.price) : null;
  const discountPercent = product.discountPercentage ||
    (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : null);
  const quantity = item.quantity || 1;

  return (
    <View style={styles.cartItem}>
      <View style={styles.itemImageBox}>
        <ItemImageCarousel images={product.images} />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {product.name || 'Unknown Product'}
        </Text>

        <View style={styles.priceBlock}>
          {isOnSale && originalPrice ? (
            <>
              <View style={styles.originalPriceRow}>
                <Text style={styles.originalPrice}>₱{originalPrice.toFixed(2)}</Text>
                {discountPercent && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                  </View>
                )}
              </View>
              <Text style={styles.discountedPriceText}>₱{price.toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.itemPrice}>₱{price.toFixed(2)}</Text>
          )}
        </View>

        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, disabled && styles.qtyBtnDisabled]}
            onPress={() => onDecrease(item)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="remove" size={15} color="#8B5E3C" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, disabled && styles.qtyBtnDisabled]}
            onPress={() => onIncrease(item)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="add" size={15} color="#8B5E3C" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Icon name="delete-outline" size={22} color="#C4A882" />
      </TouchableOpacity>
    </View>
  );
};

export default function Cart({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getDB();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchCart);
    return unsubscribe;
  }, [navigation]);

  const fetchCart = async () => {
    try {
      const token = await getToken();
      if (!token) {
        resetToAuth(navigation);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        let items = response.data.cart?.items || [];
        items = await enrichCartItemsWithFreshData(items, token);
        setCartItems(items);
        await saveCartToSQLite(items);
      }
    } catch (error) {
      console.warn('Backend unreachable, loading SQLite cache');
      const cached = await loadCartFromSQLite();
      if (cached.length > 0) {
        try {
          const token = await getToken();
          if (token) {
            const updatedCached = await enrichCartItemsWithFreshData(cached, token);
            setCartItems(updatedCached);
            await saveCartToSQLite(updatedCached);
          } else {
            setCartItems(cached);
          }
        } catch (enrichError) {
          console.error('Failed to enrich cached items:', enrichError);
          setCartItems(cached);
        }
      } else {
        setCartItems(cached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCart();
  };

  const updateQty = async (productId, action) => {
    try {
      setActionLoading(true);
      const token = await getToken();
      const response = await axios.patch(
        `${BACKEND_URL}/api/v1/cart/update`,
        { productId, action },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        let items = response.data.cart?.items || [];
        items = await enrichCartItemsWithFreshData(items, token);
        setCartItems(items);
        await saveCartToSQLite(items);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIncrease = (item) => {
    const productId = item.product?._id;
    if (productId) updateQty(productId, 'increase');
  };

  const handleDecrease = (item) => {
    const productId = item.product?._id;
    if (productId) updateQty(productId, 'decrease');
  };

  const handleRemove = (item) => {
    const productId = item.product?._id;
    const name = item.product?.name || 'this item';
    if (!productId) return;

    Alert.alert('Remove Item', `Remove "${name}" from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            const token = await getToken();
            const response = await axios.delete(
              `${BACKEND_URL}/api/v1/cart/remove/${productId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
              let items = response.data.cart?.items || [];
              items = await enrichCartItemsWithFreshData(items, token);
              setCartItems(items);
              await saveCartToSQLite(items);
            }
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            const token = await getToken();
            const response = await axios.delete(`${BACKEND_URL}/api/v1/cart/clear`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.success) {
              setCartItems([]);
              await clearCartSQLite();
            }
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Add some products before checking out.');
      return;
    }

    navigation.navigate('Checkout', {
      cartItems,
      totalAmount: grandTotal,
      onCheckoutSuccess: async () => {
        await clearCartSQLite();
        setCartItems([]);
      },
    });
  };

  const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const grandTotal = cartItems
    .reduce((sum, item) => {
      const product = item.product || {};
      const hasDiscountedPrice =
        product.discountedPrice &&
        parseFloat(product.discountedPrice) > 0 &&
        parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
      const isOnSale = product.isOnSale === true || hasDiscountedPrice;
      const price = isOnSale && hasDiscountedPrice
        ? parseFloat(product.discountedPrice)
        : parseFloat(product.price || 0);
      return sum + price * (item.quantity || 1);
    }, 0)
    .toFixed(2);

  const totalSavings = cartItems
    .reduce((sum, item) => {
      const product = item.product || {};
      const hasDiscountedPrice =
        product.discountedPrice &&
        parseFloat(product.discountedPrice) > 0 &&
        parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
      const isOnSale = product.isOnSale === true || hasDiscountedPrice;

      if (isOnSale && hasDiscountedPrice) {
        const original = parseFloat(product.price || 0);
        const discounted = parseFloat(product.discountedPrice);
        return sum + (original - discounted) * (item.quantity || 1);
      }
      return sum;
    }, 0)
    .toFixed(2);

  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5E3C" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </UserDrawer>
    );
  }

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />

        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>My Cart</Text>
          {cartItems.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearCart}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              <Icon name="delete-sweep" size={17} color="#FF8A8A" />
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {cartItems.length > 0 && parseFloat(totalSavings) > 0 && (
          <View style={styles.savingsBanner}>
            <Icon name="savings" size={14} color="#4caf50" />
            <Text style={styles.savingsBannerText}>
              You're saving ₱{totalSavings} on this order!
            </Text>
          </View>
        )}

        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Icon name="shopping-cart" size={52} color="#C4A882" />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Add products from the shop to get started</Text>
            <TouchableOpacity
              style={styles.shopNowBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Icon name="storefront" size={18} color="white" />
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              keyExtractor={(item, index) => item._id || item.product?._id || String(index)}
              renderItem={({ item }) => (
                <CartItem
                  item={item}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                  onRemove={handleRemove}
                  disabled={actionLoading}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#8B5E3C']}
                  tintColor="#8B5E3C"
                />
              }
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              ListFooterComponent={
                <View style={styles.summarySection}>
                  {cartItems.map((item, index) => {
                    const product = item.product || {};
                    const hasDiscountedPrice =
                      product.discountedPrice &&
                      parseFloat(product.discountedPrice) > 0 &&
                      parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
                    const isOnSale = product.isOnSale === true || hasDiscountedPrice;
                    const price = isOnSale && hasDiscountedPrice
                      ? parseFloat(product.discountedPrice)
                      : parseFloat(product.price || 0);
                    const originalPrice = isOnSale && hasDiscountedPrice ? parseFloat(product.price) : null;
                    const quantity = item.quantity || 1;
                    const itemTotal = price * quantity;

                    return (
                      <View key={index} style={styles.summaryRow}>
                        <View style={styles.summaryItemLeft}>
                          <Text style={styles.summaryItemName} numberOfLines={1}>
                            {product.name || 'Item'} x {quantity}
                          </Text>
                          {originalPrice && (
                            <Text style={styles.summaryOriginalPrice}>₱{originalPrice.toFixed(2)}</Text>
                          )}
                        </View>
                        <Text style={styles.summaryItemPrice}>₱{itemTotal.toFixed(2)}</Text>
                      </View>
                    );
                  })}

                  {parseFloat(totalSavings) > 0 && (
                    <View style={styles.savingsRow}>
                      <Icon name="savings" size={15} color="#4caf50" />
                      <Text style={styles.savingsRowText}>You save: ₱{totalSavings}</Text>
                    </View>
                  )}

                  <View style={styles.summaryDivider} />
                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>₱{grandTotal}</Text>
                  </View>
                  <View style={{ height: 110 }} />
                </View>
              }
            />

            <View style={styles.checkoutBar}>
              <TouchableOpacity
                style={[styles.checkoutBtn, actionLoading && styles.disabledBtn]}
                onPress={handleCheckout}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.checkoutBtnText}>CHECKOUT</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { fontSize: 14, color: '#B0A090', marginTop: 10 },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#333333', letterSpacing: 0.2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD4D4',
  },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: '#FF8A8A', marginLeft: 4 },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf0',
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  savingsBannerText: { fontSize: 13, color: '#2e7d32', fontWeight: '500', marginLeft: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyIconWrapper: {
    backgroundColor: '#FDF0E6',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333333', marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: '#B0A090', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  shopNowText: { fontSize: 14, fontWeight: '700', color: 'white', marginLeft: 7 },
  listContent: { paddingTop: 4 },
  itemSeparator: { height: 1, backgroundColor: '#F0EAE0', marginHorizontal: 16 },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'flex-start',
  },
  itemImageBox: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FDF0E6',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  itemCarouselContainer: { width: '100%', height: '100%', position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
  },
  carouselArrowLeft: {
    position: 'absolute',
    left: 2,
    top: '50%',
    transform: [{ translateY: -11 }],
    backgroundColor: 'rgba(139,94,60,0.4)',
    borderRadius: 11,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  carouselArrowRight: {
    position: 'absolute',
    right: 2,
    top: '50%',
    transform: [{ translateY: -11 }],
    backgroundColor: 'rgba(139,94,60,0.4)',
    borderRadius: 11,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  carouselArrowText: { color: 'white', fontSize: 15, fontWeight: 'bold', lineHeight: 18 },
  carouselDots: {
    position: 'absolute',
    bottom: 4,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  carouselDotActive: { backgroundColor: '#8B5E3C', width: 5, height: 5, borderRadius: 3 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 8, lineHeight: 21 },
  priceBlock: { marginBottom: 12 },
  originalPriceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  originalPrice: { fontSize: 13, color: '#B0A090', textDecorationLine: 'line-through', marginRight: 6 },
  discountBadge: {
    backgroundColor: '#FF8A8A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  discountedPriceText: { fontSize: 16, fontWeight: '800', color: '#8B5E3C' },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#8B5E3C' },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#333333', minWidth: 32, textAlign: 'center' },
  removeBtn: { padding: 4, marginLeft: 6, marginTop: 2 },
  summarySection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EAE0',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  summaryItemName: { fontSize: 13, color: '#777777', flex: 1, marginRight: 6 },
  summaryOriginalPrice: { fontSize: 11, color: '#B0A090', textDecorationLine: 'line-through' },
  summaryItemPrice: { fontSize: 13, fontWeight: '600', color: '#444444' },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  savingsRowText: { fontSize: 13, fontWeight: '600', color: '#4caf50', marginLeft: 6 },
  summaryDivider: { height: 1, backgroundColor: '#E0D6C8', marginVertical: 14 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtotalLabel: { fontSize: 16, fontWeight: '700', color: '#333333' },
  subtotalValue: { fontSize: 20, fontWeight: '900', color: '#333333' },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
    elevation: 10,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  checkoutBtn: {
    backgroundColor: '#8B5E3C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  checkoutBtnText: { fontSize: 15, fontWeight: '800', color: 'white', letterSpacing: 1.5 },
  disabledBtn: { opacity: 0.5 },
});
