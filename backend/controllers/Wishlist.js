// CVPetShop/backend/controllers/Wishlist.js
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        let wishlist = await Wishlist.findOne({ user: userId })
            .populate({
                path: 'items.product',
                select: 'name price discountedPrice discountPercentage images category stock isOnSale discountStartDate discountEndDate description',
                populate: {
                    path: 'supplier',
                    select: 'name'
                }
            });

        // If no wishlist exists, return empty items array instead of creating one
        // This way we don't create empty wishlist documents
        if (!wishlist) {
            return res.status(200).json({
                success: true,
                wishlist: {
                    user: userId,
                    items: []
                }
            });
        }

        // Add isOnSale status to each product based on dates
        const now = new Date();
        const wishlistObj = wishlist.toObject();
        
        wishlistObj.items = wishlistObj.items.map(item => {
            if (item.product) {
                const product = item.product;
                // Check if product is on sale based on dates
                const isOnSale = product.discountedPrice && 
                    product.discountStartDate && 
                    product.discountEndDate &&
                    now >= new Date(product.discountStartDate) && 
                    now <= new Date(product.discountEndDate);
                
                return {
                    ...item,
                    product: {
                        ...product,
                        isOnSale: isOnSale
                    }
                };
            }
            return item;
        });

        // Return in the format expected by frontend
        res.status(200).json({
            success: true,
            wishlist: wishlistObj
        });
    } catch (error) {
        console.error('❌ Get wishlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add item to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        // Check if product exists and is active
        const product = await Product.findOne({ 
            _id: productId, 
            isActive: true 
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
        }

        // Find or create wishlist (only create when actually adding an item)
        let wishlist = await Wishlist.findOne({ user: userId });
        
        if (!wishlist) {
            wishlist = await Wishlist.create({
                user: userId,
                items: []
            });
        }

        // Check if product already in wishlist
        const existingItem = wishlist.items.find(
            item => item.product.toString() === productId
        );

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        // Add to wishlist
        wishlist.items.push({
            product: productId,
            addedAt: new Date()
        });

        await wishlist.save();

        // Populate the product details for response
        await wishlist.populate({
            path: 'items.product',
            select: 'name price discountedPrice discountPercentage images category stock isOnSale'
        });

        res.status(200).json({
            success: true,
            message: 'Product added to wishlist',
            wishlist
        });
    } catch (error) {
        console.error('❌ Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// Remove item from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Remove item
        wishlist.items = wishlist.items.filter(
            item => item.product.toString() !== productId
        );

        // Check if wishlist is now empty
        if (wishlist.items.length === 0) {
            // Delete the entire wishlist document from database
            await Wishlist.deleteOne({ _id: wishlist._id });
            
            console.log(`✅ Wishlist deleted for user ${userId} as it became empty`);
            
            return res.status(200).json({
                success: true,
                message: 'Product removed from wishlist and wishlist deleted',
                wishlist: null, // Indicate that wishlist no longer exists
                wishlistDeleted: true // Flag to help frontend know wishlist was deleted
            });
        } else {
            // Save the updated wishlist if it still has items
            await wishlist.save();

            return res.status(200).json({
                success: true,
                message: 'Product removed from wishlist',
                wishlist,
                wishlistDeleted: false
            });
        }
    } catch (error) {
        console.error('❌ Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Clear entire wishlist
exports.clearWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Delete the entire wishlist document
        await Wishlist.deleteOne({ _id: wishlist._id });

        console.log(`✅ Wishlist deleted for user ${userId}`);

        res.status(200).json({
            success: true,
            message: 'Wishlist cleared and deleted successfully',
            wishlist: null,
            wishlistDeleted: true
        });
    } catch (error) {
        console.error('❌ Clear wishlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check if product is in user's wishlist
exports.checkWishlistStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            return res.status(200).json({
                success: true,
                isInWishlist: false
            });
        }

        const isInWishlist = wishlist.items.some(
            item => item.product.toString() === productId
        );

        res.status(200).json({
            success: true,
            isInWishlist
        });
    } catch (error) {
        console.error('❌ Check wishlist status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get wishlist count
exports.getWishlistCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlist = await Wishlist.findOne({ user: userId });

        res.status(200).json({
            success: true,
            count: wishlist ? wishlist.items.length : 0
        });
    } catch (error) {
        console.error('❌ Get wishlist count error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};