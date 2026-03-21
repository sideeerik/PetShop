// CVPetShop/frontend/src/Components/UserScreen/Cart.js
//
// API endpoints (matched to Cart controller):
//   GET    /api/v1/cart                                         → getCart
//   POST   /api/v1/cart/add        { productId }               → addToCart
//   PATCH  /api/v1/cart/update     { productId, action }       → updateCartItem
//   DELETE /api/v1/cart/remove/:productId                      → removeCartItem
//   DELETE /api/v1/cart/clear                                  → clearCart
//
// SQLite (expo-sqlite v2 async API):
//   • Synced every time backend responds successfully
//   • Used as offline fallback if backend is unreachable
//   • Cleared after successful checkout via clearCartSQLite()
//
// Install: npx expo install expo-sqlite

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
import { getToken } from '../../utils/helper';
import UserDrawer from './UserDrawer';
import Header from '../layouts/Header';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ─── SQLite helpers ───────────────────────────────────────────────────────────

let _db = null;

const getDB = async () => {
  if (_db) return _db;
  
  try {
    _db = await SQLite.openDatabaseAsync('cvpetshop.db');
    
    // First, check if the table exists
    const tableExists = await _db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='cart_items';"
    );
    
    if (!tableExists) {
      // Create new table with all columns
      await _db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS cart_items (
          id          TEXT PRIMARY KEY,
          productId   TEXT NOT NULL,
          name        TEXT,
          price       REAL,
          discountedPrice REAL,
          discountPercentage REAL,
          isOnSale    INTEGER DEFAULT 0,
          quantity    INTEGER DEFAULT 1,
          image       TEXT,
          category    TEXT
        );
      `);
      console.log('Created cart_items table with discount fields');
    } else {
      console.log('Table exists, checking for missing columns...');
      
      // Get current table info
      const tableInfo = await _db.getAllAsync('PRAGMA table_info(cart_items);');
      const columns = tableInfo.map(col => col.name);
      
      // Add missing columns if they don't exist
      if (!columns.includes('discountedPrice')) {
        console.log('Adding discountedPrice column...');
        await _db.execAsync('ALTER TABLE cart_items ADD COLUMN discountedPrice REAL;');
      }
      
      if (!columns.includes('discountPercentage')) {
        console.log('Adding discountPercentage column...');
        await _db.execAsync('ALTER TABLE cart_items ADD COLUMN discountPercentage REAL;');
      }
      
      if (!columns.includes('isOnSale')) {
        console.log('Adding isOnSale column...');
        await _db.execAsync('ALTER TABLE cart_items ADD COLUMN isOnSale INTEGER DEFAULT 0;');
      }
    }
  } catch (err) {
    console.error('Error setting up database:', err);
    // If there's an error, try to recreate the table
    try {
      await _db?.execAsync('DROP TABLE IF EXISTS cart_items;');
      await _db?.execAsync(`
        CREATE TABLE cart_items (
          id          TEXT PRIMARY KEY,
          productId   TEXT NOT NULL,
          name        TEXT,
          price       REAL,
          discountedPrice REAL,
          discountPercentage REAL,
          isOnSale    INTEGER DEFAULT 0,
          quantity    INTEGER DEFAULT 1,
          image       TEXT,
          category    TEXT
        );
      `);
      console.log('Recreated cart_items table');
    } catch (recreateErr) {
      console.error('Failed to recreate table:', recreateErr);
    }
  }
  
  return _db;
};

export const saveCartToSQLite = async (items) => {
  try {
    const db = await getDB();
    await db.execAsync('DELETE FROM cart_items;');
    
    for (const item of items) {
      const product = item.product || {};
      const id = item._id || product._id || String(Date.now() + Math.random());
      const productId = product._id || id;
      const name = product.name || '';
      const price = parseFloat(product.price || 0);
      
      // Handle discount fields - ensure they're properly parsed
      const discountedPrice = product.discountedPrice ? parseFloat(product.discountedPrice) : null;
      const discountPercentage = product.discountPercentage ? parseFloat(product.discountPercentage) : null;
      
      // Check if product is on sale - either by isOnSale flag OR by having discount fields
      let isOnSale = product.isOnSale ? 1 : 0;
      
      // If isOnSale is not set but there's a discountedPrice, consider it on sale
      if (!isOnSale && discountedPrice && discountedPrice > 0 && discountedPrice < price) {
        isOnSale = 1;
      }
      
      const quantity = item.quantity || 1;
      const image = product.images?.[0]?.url || '';
      const category = product.category || '';
      
      await db.runAsync(
        `INSERT OR REPLACE INTO cart_items
           (id, productId, name, price, discountedPrice, discountPercentage, isOnSale, quantity, image, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [id, productId, name, price, discountedPrice, discountPercentage, isOnSale, quantity, image, category]
      );
    }
    console.log(`Saved ${items.length} items to SQLite`);
  } catch (err) {
    console.error('SQLite save error:', err);
  }
};

export const loadCartFromSQLite = async () => {
  try {
    const db = await getDB();
    const rows = await db.getAllAsync('SELECT * FROM cart_items;');
    
    return rows.map(row => {
      // Check if product is on sale based on discounted price
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
          isOnSale: row.isOnSale === 1 || hasDiscount, // Consider on sale if either flag is true OR has valid discount
          category: row.category,
          images: row.image ? [{ url: row.image }] : [],
        },
      };
    });
  } catch (err) {
    console.error('SQLite load error:', err);
    return [];
  }
};

export const clearCartSQLite = async () => {
  try {
    const db = await getDB();
    await db.execAsync('DELETE FROM cart_items;');
    console.log('Cleared SQLite cart');
  } catch (err) {
    console.error('SQLite clear error:', err);
  }
};

// ─── Image Carousel (for cart item) ──────────────────────────────────────────
const ItemImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const urls = (images || []).filter(img => img?.url).map(img => img.url);

  if (urls.length === 0) {
    return (
      <View style={styles.itemImagePlaceholder}>
        <Icon name="pets" size={28} color="#ccc" />
      </View>
    );
  }

  const goPrev = () => setCurrentIndex(p => (p === 0 ? urls.length - 1 : p - 1));
  const goNext = () => setCurrentIndex(p => (p === urls.length - 1 ? 0 : p + 1));

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
            {urls.map((_, i) => (
              <View
                key={i}
                style={[styles.carouselDot, i === currentIndex && styles.carouselDotActive]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

// ─── Cart Item Row ────────────────────────────────────────────────────────────
const CartItem = ({ item, onIncrease, onDecrease, onRemove, disabled }) => {
  const product = item.product || {};
  
  // IMPROVED DISCOUNT DETECTION
  // Check multiple conditions for discount
  const hasDiscountedPrice = product.discountedPrice && 
                             parseFloat(product.discountedPrice) > 0 && 
                             parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
  
  const isOnSale = product.isOnSale === true || hasDiscountedPrice;
  
  // Use discounted price if on sale, otherwise use regular price
  const price = isOnSale && hasDiscountedPrice 
    ? parseFloat(product.discountedPrice) 
    : parseFloat(product.price || 0);
  
  const originalPrice = isOnSale && hasDiscountedPrice 
    ? parseFloat(product.price) 
    : null;
  
  const discountPercent = product.discountPercentage || 
    (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : null);
  
  const quantity = item.quantity || 1;

  // Debug log to see what's being received
  useEffect(() => {
    if (hasDiscountedPrice) {
      console.log('Discount detected for:', product.name, {
        price: product.price,
        discountedPrice: product.discountedPrice,
        isOnSale: product.isOnSale,
        hasDiscountedPrice
      });
    }
  }, []);

  return (
    <View style={styles.cartItem}>
      <View style={styles.itemImageBox}>
        <ItemImageCarousel images={product.images} />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {product.name || 'Unknown Product'}
        </Text>
        
        {/* Price display with discount */}
        <View style={styles.priceContainer}>
          {isOnSale && originalPrice && (
            <>
              <Text style={styles.originalPrice}>₱{originalPrice.toFixed(2)}</Text>
              {discountPercent && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                </View>
              )}
            </>
          )}
          <Text style={[styles.itemPrice, isOnSale && styles.discountedPrice]}>
            ₱{price.toFixed(2)}
          </Text>
        </View>

        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, disabled && styles.qtyBtnDisabled]}
            onPress={() => onDecrease(item)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="remove" size={16} color="#FF6B6B" />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{quantity}</Text>

          <TouchableOpacity
            style={[styles.qtyBtn, disabled && styles.qtyBtnDisabled]}
            onPress={() => onIncrease(item)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="add" size={16} color="#FF6B6B" />
          </TouchableOpacity>

          <Text style={styles.subtotalText}>
            = ₱{(price * quantity).toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Icon name="delete-outline" size={24} color="#ccc" />
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Cart({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { 
    getDB(); 
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchCart);
    return unsub;
  }, [navigation]);

  // ── GET /api/v1/cart ──────────────────────────────────────────────────────
  const fetchCart = async () => {
    try {
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.log('Fetching cart from backend...');
      const res = await axios.get(`${BACKEND_URL}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const items = res.data.cart?.items || [];
        console.log('Cart items received:', items.length);
        
        // Log first item to see if discount data exists
        if (items.length > 0) {
          console.log('Sample item:', JSON.stringify(items[0], null, 2));
        }
        
        setCartItems(items);
        await saveCartToSQLite(items);
      }
    } catch (error) {
      console.warn('Backend unreachable — loading SQLite cache');
      const cached = await loadCartFromSQLite();
      setCartItems(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => { 
    setRefreshing(true); 
    await fetchCart(); 
  };

  // ── PATCH /api/v1/cart/update ─────────────────────────────────────────────
  const updateQty = async (productId, action) => {
    try {
      setActionLoading(true);
      const token = await getToken();
      const res = await axios.patch(
        `${BACKEND_URL}/api/v1/cart/update`,
        { productId, action },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const items = res.data.cart?.items || [];
        setCartItems(items);
        await saveCartToSQLite(items);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIncrease = (item) => {
    const pid = item.product?._id;
    if (pid) updateQty(pid, 'increase');
  };

  const handleDecrease = (item) => {
    const pid = item.product?._id;
    if (pid) updateQty(pid, 'decrease');
  };

  // ── DELETE /api/v1/cart/remove/:productId ────────────────────────────────
  const handleRemove = (item) => {
    const pid = item.product?._id;
    const name = item.product?.name || 'this item';
    if (!pid) return;

    Alert.alert('Remove Item', `Remove "${name}" from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            const token = await getToken();
            const res = await axios.delete(
              `${BACKEND_URL}/api/v1/cart/remove/${pid}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
              const items = res.data.cart?.items || [];
              setCartItems(items);
              await saveCartToSQLite(items);
            }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || err.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── DELETE /api/v1/cart/clear ─────────────────────────────────────────────
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
            const res = await axios.delete(`${BACKEND_URL}/api/v1/cart/clear`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
              setCartItems([]);
              await clearCartSQLite();
            }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || err.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Updated Checkout to go to Checkout.js
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

  // ── Computed totals using discounted prices ───────────────────────────────
  const itemCount = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  
  const grandTotal = cartItems
    .reduce((s, i) => {
      const product = i.product || {};
      const hasDiscountedPrice = product.discountedPrice && 
                                 parseFloat(product.discountedPrice) > 0 && 
                                 parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
      const isOnSale = product.isOnSale === true || hasDiscountedPrice;
      const price = isOnSale && hasDiscountedPrice 
        ? parseFloat(product.discountedPrice) 
        : parseFloat(product.price || 0);
      return s + price * (i.quantity || 1);
    }, 0)
    .toFixed(2);

  const totalSavings = cartItems
    .reduce((s, i) => {
      const product = i.product || {};
      const hasDiscountedPrice = product.discountedPrice && 
                                 parseFloat(product.discountedPrice) > 0 && 
                                 parseFloat(product.discountedPrice) < parseFloat(product.price || 0);
      const isOnSale = product.isOnSale === true || hasDiscountedPrice;
      
      if (isOnSale && hasDiscountedPrice) {
        const original = parseFloat(product.price || 0);
        const discounted = parseFloat(product.discountedPrice);
        return s + (original - discounted) * (i.quantity || 1);
      }
      return s;
    }, 0)
    .toFixed(2);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </UserDrawer>
    );
  }

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />

        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBarTitle}>My Cart</Text>
            <Text style={styles.topBarSubtitle}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
          {cartItems.length > 0 && (
            <View style={styles.topBarActions}>
              {parseFloat(totalSavings) > 0 && (
                <View style={styles.savingsBadge}>
                  <Icon name="savings" size={16} color="#4caf50" />
                  <Text style={styles.savingsText}>Save ₱{totalSavings}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearCart}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Icon name="delete-sweep" size={20} color="#FF6B6B" />
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shopping-cart" size={90} color="#e0e0e0" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add products from the shop to get started
            </Text>
            <TouchableOpacity
              style={styles.shopNowBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Icon name="storefront" size={20} color="white" />
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              keyExtractor={(item, idx) => item._id || item.product?._id || String(idx)}
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
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B6B']} />
              }
              ListFooterComponent={
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Order Summary</Text>
                  {cartItems.map((item, i) => {
                    const p = item.product || {};
                    const hasDiscountedPrice = p.discountedPrice && 
                                               parseFloat(p.discountedPrice) > 0 && 
                                               parseFloat(p.discountedPrice) < parseFloat(p.price || 0);
                    const isOnSale = p.isOnSale === true || hasDiscountedPrice;
                    const price = isOnSale && hasDiscountedPrice 
                      ? parseFloat(p.discountedPrice) 
                      : parseFloat(p.price || 0);
                    const originalPrice = isOnSale && hasDiscountedPrice ? parseFloat(p.price) : null;
                    const qty = item.quantity || 1;
                    const itemTotal = price * qty;
                    
                    return (
                      <View key={i} style={styles.summaryRow}>
                        <View style={styles.summaryItemLeft}>
                          <Text style={styles.summaryItemName} numberOfLines={1}>
                            {p.name || 'Item'} × {qty}
                          </Text>
                          {originalPrice && (
                            <Text style={styles.summaryOriginalPrice}>
                              ₱{originalPrice.toFixed(2)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.summaryItemPrice}>
                          ₱{itemTotal.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                  
                  {parseFloat(totalSavings) > 0 && (
                    <View style={styles.savingsRow}>
                      <Icon name="savings" size={16} color="#4caf50" />
                      <Text style={styles.savingsRowText}>
                        You save: ₱{totalSavings}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>₱{grandTotal}</Text>
                  </View>
                  <View style={{ height: 110 }} />
                </View>
              }
            />

            <View style={styles.checkoutBar}>
              <View style={styles.checkoutTotalBox}>
                <Text style={styles.checkoutTotalLabel}>Total</Text>
                <Text style={styles.checkoutTotalValue}>₱{grandTotal}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, actionLoading && styles.disabledBtn]}
                onPress={handleCheckout}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Icon name="shopping-bag" size={22} color="white" />
                    <Text style={styles.checkoutBtnText}>Checkout</Text>
                  </>
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
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { fontSize: 15, color: '#999', marginTop: 12 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  topBarTitle: { fontSize: 22, fontWeight: '800', color: '#222' },
  topBarSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
    marginLeft: 4,
  },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff0f0', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: '#FF6B6B', marginLeft: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#555', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22, marginTop: 6 },
  shopNowBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF6B6B', paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 25, marginTop: 20,
  },
  shopNowText: { fontSize: 15, fontWeight: '700', color: 'white', marginLeft: 7 },
  listContent: { paddingHorizontal: 14, paddingTop: 14 },
  cartItem: {
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 14,
    marginBottom: 12, padding: 12, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  itemImageBox: {
    width: 88, height: 88, borderRadius: 10,
    overflow: 'hidden', backgroundColor: '#f5f5f5', marginRight: 12,
  },
  itemCarouselContainer: {
    width: '100%', height: '100%', position: 'relative',
  },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0',
  },
  carouselArrowLeft: {
    position: 'absolute', left: 2, top: '50%', transform: [{ translateY: -14 }],
    backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 14,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  carouselArrowRight: {
    position: 'absolute', right: 2, top: '50%', transform: [{ translateY: -14 }],
    backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 14,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  carouselArrowText: { color: 'white', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  carouselDots: {
    position: 'absolute', bottom: 4, width: '100%',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  carouselDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)', marginHorizontal: 2,
  },
  carouselDotActive: { backgroundColor: '#FF6B6B', width: 6, height: 6, borderRadius: 3 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 3, lineHeight: 20 },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#FF6B6B' },
  discountedPrice: {
    color: '#FF6B6B',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#FF6B6B',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#333', minWidth: 26, textAlign: 'center' },
  subtotalText: { fontSize: 12, color: '#999', marginLeft: 6 },
  removeBtn: { padding: 6, marginLeft: 4 },
  summaryCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18, marginTop: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 14 },
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 5 
  },
  summaryItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryItemName: { 
    fontSize: 13, 
    color: '#777', 
    flex: 1,
    marginRight: 8,
  },
  summaryOriginalPrice: {
    fontSize: 11,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  summaryItemPrice: { fontSize: 13, fontWeight: '600', color: '#444' },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  savingsRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4caf50',
    marginLeft: 6,
  },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  summaryTotalValue: { fontSize: 22, fontWeight: '900', color: '#FF6B6B' },
  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 22,
    backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 6, gap: 12,
  },
  checkoutTotalBox: { flex: 1 },
  checkoutTotalLabel: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  checkoutTotalValue: { fontSize: 20, fontWeight: '900', color: '#222' },
  checkoutBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF6B6B', paddingVertical: 15, borderRadius: 14, gap: 8,
  },
  checkoutBtnText: { fontSize: 16, fontWeight: '800', color: 'white', marginLeft: 6 },
  disabledBtn: { opacity: 0.5 },
});