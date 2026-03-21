// CVPetShop/frontend/src/context/WishlistContext.js
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getToken } from '../utils/helper';

const WishlistContext = createContext();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

export const WishlistProvider = ({ children }) => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [wishlistMap, setWishlistMap] = useState(new Map());
    const [lastFetchedToken, setLastFetchedToken] = useState(null);
    
    // Use ref to track if component is mounted
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchWishlist = useCallback(async (skipTokenCheck = false) => {
        try {
            setLoading(true);
            const token = await getToken();
            
            if (!token) {
                if (isMounted.current) {
                    setWishlistItems([]);
                    setWishlistCount(0);
                    setWishlistMap(new Map());
                    setLastFetchedToken(null);
                }
                return;
            }

            // Skip token check if forced
            if (!skipTokenCheck && token === lastFetchedToken && wishlistItems.length > 0) {
                setLoading(false);
                return;
            }

            console.log('Fetching wishlist from API...');
            const response = await axios.get(`${BACKEND_URL}/api/v1/wishlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Wishlist API response:', response.data);

            if (response.data.success && isMounted.current) {
                // Extract items from the response - handle both possible structures
                let items = [];
                
                if (response.data.wishlist && response.data.wishlist.items) {
                    items = response.data.wishlist.items;
                } else if (Array.isArray(response.data.wishlist)) {
                    items = response.data.wishlist;
                } else if (response.data.items) {
                    items = response.data.items;
                }
                
                console.log('Processed wishlist items:', items);
                
                setWishlistItems(items);
                setWishlistCount(items.length);
                
                // Create map for quick lookup
                const map = new Map();
                items.forEach(item => {
                    // Handle both { product: {...} } structure and direct product structure
                    const productId = item.product?._id || item._id;
                    if (productId) {
                        map.set(productId.toString(), true);
                    }
                });
                
                console.log('Wishlist map created:', Array.from(map.keys()));
                setWishlistMap(map);
                setLastFetchedToken(token);
            }
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            if (isMounted.current) {
                setWishlistItems([]);
                setWishlistCount(0);
                setWishlistMap(new Map());
                setLastFetchedToken(null);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [lastFetchedToken, wishlistItems.length]);

    const addToWishlist = async (product) => {
        try {
            const token = await getToken();
            
            if (!token) {
                throw new Error('Please login to add items to wishlist');
            }

            console.log('Adding to wishlist:', product._id);
            const response = await axios.post(
                `${BACKEND_URL}/api/v1/wishlist/add`,
                { productId: product._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Add to wishlist response:', response.data);

            if (response.data.success) {
                // Force fetch with skipTokenCheck=true to ensure we get latest data
                await fetchWishlist(true);
                return { success: true, message: `"${product.name}" added to wishlist!` };
            }
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            return { 
                success: false, 
                message: error.response?.data?.message || error.message 
            };
        }
    };

    const removeFromWishlist = async (productId, productName) => {
        try {
            const token = await getToken();
            
            if (!token) {
                throw new Error('Please login to remove items from wishlist');
            }

            console.log('Removing from wishlist:', productId);
            const response = await axios.delete(
                `${BACKEND_URL}/api/v1/wishlist/remove/${productId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Remove from wishlist response:', response.data);

            if (response.data.success) {
                // Force fetch with skipTokenCheck=true to ensure we get latest data
                await fetchWishlist(true);
                return { success: true, message: `"${productName}" removed from wishlist` };
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            return { 
                success: false, 
                message: error.response?.data?.message || error.message 
            };
        }
    };

    const toggleWishlist = async (product) => {
        const isInWishlist = wishlistMap.has(product._id.toString());
        console.log('Toggling wishlist for:', product._id, 'Currently in wishlist:', isInWishlist);
        
        if (isInWishlist) {
            return await removeFromWishlist(product._id, product.name);
        } else {
            return await addToWishlist(product);
        }
    };

    const isInWishlist = (productId) => {
        return wishlistMap.has(productId.toString());
    };

    const clearWishlist = async () => {
        try {
            const token = await getToken();
            
            if (!token) {
                throw new Error('Please login');
            }

            const response = await axios.delete(
                `${BACKEND_URL}/api/v1/wishlist/clear`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                await fetchWishlist(true);
                return { success: true, message: 'Wishlist cleared' };
            }
        } catch (error) {
            console.error('Error clearing wishlist:', error);
            return { 
                success: false, 
                message: error.response?.data?.message || error.message 
            };
        }
    };

    const resetWishlist = useCallback(() => {
        if (isMounted.current) {
            setWishlistItems([]);
            setWishlistCount(0);
            setWishlistMap(new Map());
            setLastFetchedToken(null);
        }
    }, []);

    // Fetch wishlist when component mounts or token changes
    useEffect(() => {
        const checkTokenAndFetch = async () => {
            const token = await getToken();
            
            if (token) {
                console.log('Token detected, fetching wishlist...');
                await fetchWishlist(true);
            } else {
                resetWishlist();
            }
        };

        checkTokenAndFetch();
    }, []); // Empty dependency array - run once on mount

    const value = {
        wishlistItems,
        wishlistCount,
        loading,
        wishlistMap,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        fetchWishlist,
        clearWishlist,
        resetWishlist
    };

    return (
        <WishlistContext.Provider value={value}>
            {children}
        </WishlistContext.Provider>
    );
};