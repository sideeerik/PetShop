// CVPetShop/frontend/src/Components/UserScreen/WishlistButton.js
import React, { useState, useRef, useEffect } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWishlist } from '../../context/WishlistContext';

const WishlistButton = ({ 
    product, 
    size = 24,
    showText = false,
    style = {},
    onPress,
    disabled = false
}) => {
    const { isInWishlist, toggleWishlist, loading: contextLoading, wishlistMap } = useWishlist();
    const [buttonLoading, setButtonLoading] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Get fresh wishlist status each time using the product ID
    const inWishlist = isInWishlist(product._id);

    // Log for debugging
    useEffect(() => {
        console.log(`WishlistButton for ${product._id} - inWishlist:`, inWishlist);
    }, [inWishlist, product._id]);

    const handlePress = async () => {
        if (disabled || buttonLoading || contextLoading) return;

        // Animate button
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: 150,
                useNativeDriver: true
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            })
        ]).start();

        setButtonLoading(true);
        try {
            console.log('Toggling wishlist for product:', product._id);
            const result = await toggleWishlist(product);
            console.log('Toggle result:', result);
            
            if (onPress) {
                onPress(result);
            }
            
            // Show error message if failed
            if (result && !result.success) {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            console.error('Wishlist button error:', error);
            Alert.alert('Error', 'Failed to update wishlist. Please try again.');
        } finally {
            setButtonLoading(false);
        }
    };

    const isDisabled = disabled || buttonLoading || contextLoading;

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={isDisabled}
            style={[
                styles.container,
                inWishlist ? styles.inWishlist : styles.notInWishlist,
                isDisabled && styles.disabled,
                style
            ]}
            activeOpacity={0.7}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {buttonLoading || contextLoading ? (
                    <ActivityIndicator 
                        size="small" 
                        color={inWishlist ? "#FF6B6B" : "#666"} 
                    />
                ) : (
                    <Icon
                        name={inWishlist ? "favorite" : "favorite-border"}
                        size={size}
                        color={inWishlist ? "#FF6B6B" : "#666"}
                    />
                )}
            </Animated.View>
            {showText && (
                <Text style={[
                    styles.text,
                    inWishlist && styles.textInWishlist
                ]}>
                    {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 8,
    },
    notInWishlist: {
        backgroundColor: 'transparent',
    },
    inWishlist: {
        backgroundColor: '#fff0f0',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        marginLeft: 6,
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    textInWishlist: {
        color: '#FF6B6B',
    }
});

export default WishlistButton;