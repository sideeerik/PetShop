const fs = require('fs');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Review = require('../models/Review'); 
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/Cloudinary');
const { sendPushNotification } = require('../utils/pushNotification');
const User = require('../models/User');

// Helper to delete local temp file if exists
const safeUnlink = (path) => {
  if (!path) return;
  fs.unlink(path, (err) => {
    if (err) console.warn('Could not delete temp file', path, err.message);
  });
};

// Helper function to check if discount is active
const checkDiscountActive = (product) => {
  if (!product.discountedPrice || !product.discountStartDate || !product.discountEndDate) {
    return false;
  }
  
  const now = new Date();
  const startDate = new Date(product.discountStartDate);
  const endDate = new Date(product.discountEndDate);
  
  // Set time to beginning of day for start date and end of day for end date
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return now >= startDate && now <= endDate;
};

// Helper function to check for restocks and send notifications to wishlist users
const checkAndSendRestockNotifications = async (productId, oldStock, newStock) => {
    try {
        // Check if product was out of stock and now has stock
        if (oldStock <= 0 && newStock > 0) {
            console.log(`🔄 Product ${productId} restocked from ${oldStock} to ${newStock}`);
            
            // Find all users who have this product in their wishlist
            const Wishlist = require('../models/Wishlist');
            
            // Get all wishlists containing this product and populate user data
            const wishlists = await Wishlist.find({
                'items.product': productId
            }).populate('user', 'pushToken name email');
            
            console.log(`Found ${wishlists.length} users with this product in wishlist`);
            
            if (wishlists.length === 0) return;
            
            // Get product details for notification
            const product = await Product.findById(productId).select('name price');
            
            // Prepare notification content
            const notificationTitle = '🎉 Back in Stock!';
            const notificationBody = `${product.name} is now back in stock!`;
            
            const notificationData = {
                type: 'WISHLIST_RESTOCK',
                productId: productId,
                productName: product.name,
                timestamp: new Date().toISOString()
            };
            
            // Send to each user
            let successCount = 0;
            let failCount = 0;
            
            for (const wishlist of wishlists) {
                const user = wishlist.user;
                
                if (user && user.pushToken) {
                    try {
                        await sendPushNotification(
                            user.pushToken,
                            notificationTitle,
                            notificationBody,
                            notificationData
                        );
                        successCount++;
                        console.log(`✅ Restock notification sent to user ${user._id}`);
                        
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.error(`❌ Failed to send to user ${user._id}:`, error.message);
                        failCount++;
                        
                        // If token is invalid, clear it
                        if (error.message.includes('Invalid Expo push token')) {
                            await User.findByIdAndUpdate(user._id, { pushToken: null });
                        }
                    }
                }
            }
            
            console.log(`✅ Restock notifications: ${successCount} successful, ${failCount} failed`);
        }
    } catch (error) {
        console.error('❌ Error sending restock notifications:', error);
    }
};

// Create new product => /api/v1/admin/products
exports.createProduct = async (req, res, next) => {
  try {
    console.log('🆕 Creating new product...');

    // Supplier check if provided
    if (req.body.supplier) {
      const supplier = await Supplier.findOne({ _id: req.body.supplier, isActive: true });
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found or inactive' });
      }
    }

    const productImages = [];

    // If files were uploaded via Multer
    if (req.files && req.files.length > 0) {
      console.log(`📤 ${req.files.length} files received for upload`);
      for (const file of req.files) {
        try {
          const uploadResult = await uploadToCloudinary(file.path, 'harmoniahub/products');
          productImages.push({
            public_id: uploadResult.public_id,
            url: uploadResult.url
          });
        } catch (err) {
          safeUnlink(file.path);
          console.error('❌ Upload failed for file', file.path, err.message);
          return res.status(400).json({ success: false, message: 'Image upload failed: ' + err.message });
        } finally {
          safeUnlink(file.path);
        }
      }
    } else if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      for (const img of req.body.images) {
        productImages.push(img);
      }
    }

    const productData = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      supplier: req.body.supplier || undefined,
      stock: req.body.stock,
      images: productImages,
      // Initialize discount fields as null
      discountedPrice: null,
      discountPercentage: null,
      discountStartDate: null,
      discountEndDate: null,
      isOnSale: false
    };

    const product = await Product.create(productData);

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('❌ CREATE PRODUCT ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all products => /api/v1/products
exports.getAllProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ isActive: true })
            .populate('supplier', 'name email')
            .select('-reviews');

        // Get review counts and ratings for each product
        const productsWithReviews = await Promise.all(
            products.map(async (product) => {
                const reviews = await Review.find({ 
                    product: product._id, 
                    isActive: true 
                });
                
                const productObj = product.toObject();
                
                // Check if discount is active based on current date
                productObj.isOnSale = checkDiscountActive(product);
                
                productObj.numOfReviews = reviews.length;
                productObj.ratings = reviews.length > 0 
                    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
                    : 0;
                
                return productObj;
            })
        );

        res.status(200).json({
            success: true,
            count: productsWithReviews.length,
            products: productsWithReviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single product with reviews
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplier', 'name email phone address');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get reviews for this product
    const reviews = await Review.find({ 
      product: product._id, 
      isActive: true 
    })
    .populate('user', 'name')
    .sort({ createdAt: -1 });

    const productObj = product.toObject();
    
    // Check if discount is active based on current date
    productObj.isOnSale = checkDiscountActive(product);
    
    productObj.reviews = reviews;
    productObj.numOfReviews = reviews.length;
    productObj.ratings = reviews.length > 0 
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
      : 0;

    res.status(200).json({
      success: true,
      product: productObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update product => /api/v1/admin/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    console.log('📝 Updating product:', req.params.id);

    // Supplier validation if provided
    if (req.body.supplier) {
      if (req.body.supplier === '') {
        req.body.supplier = undefined;
      } else {
        const supplier = await Supplier.findOne({ _id: req.body.supplier, isActive: true });
        if (!supplier) {
          return res.status(404).json({ success: false, message: 'Supplier not found or inactive' });
        }
      }
    }

    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) return res.status(404).json({ success: false, message: 'Product not found' });

    // Store old stock value BEFORE update
    const oldStock = currentProduct.stock;

    // existingImages handling
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        if (typeof req.body.existingImages === 'string') {
          try {
            existingImages = JSON.parse(req.body.existingImages);
          } catch (jsonErr) {
            existingImages = req.body.existingImages.split(',').map(id => ({ public_id: id }));
          }
        } else {
          existingImages = req.body.existingImages;
        }
      } catch (err) {
        console.error('Error parsing existingImages:', err);
        existingImages = [];
      }
    }

    const newImages = [...existingImages];
    const imagesToDelete = [];

    // Image deletion logic
    for (const oldImg of currentProduct.images) {
      const found = existingImages.some(i => 
        (i.public_id && i.public_id === oldImg.public_id) || 
        (i._id && i._id === oldImg._id) ||
        (i.url && i.url === oldImg.url)
      );
      if (!found && oldImg.public_id && !oldImg.public_id.startsWith('local_')) {
        imagesToDelete.push(oldImg.public_id);
      }
    }

    // Upload new files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await uploadToCloudinary(file.path, 'harmoniahub/products');
          newImages.push({
            public_id: uploadResult.public_id,
            url: uploadResult.url
          });
        } catch (err) {
          console.error('❌ New image upload failed:', err.message);
        } finally {
          safeUnlink(file.path);
        }
      }
    }

    // Delete old images
    for (const publicId of imagesToDelete) {
      try {
        await deleteFromCloudinary(publicId);
        console.log('✅ Deleted old image from Cloudinary:', publicId);
      } catch (deleteError) {
        console.warn('⚠️ Could not delete image from Cloudinary:', deleteError.message);
      }
    }

    // Prepare update payload with discount fields
    const updatePayload = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      stock: req.body.stock,
      images: newImages
    };

    // Track if discount was added/updated
    let discountAdded = false;
    let discountDetails = {};

    // Handle discount fields
    if (req.body.discountedPrice !== undefined) {
      updatePayload.discountedPrice = req.body.discountedPrice || null;
      if (req.body.discountedPrice && req.body.discountedPrice > 0) {
        discountAdded = true;
        discountDetails.discountedPrice = req.body.discountedPrice;
      }
    }
    
    if (req.body.discountPercentage !== undefined) {
      updatePayload.discountPercentage = req.body.discountPercentage || null;
      if (req.body.discountPercentage && req.body.discountPercentage > 0) {
        discountAdded = true;
        discountDetails.discountPercentage = req.body.discountPercentage;
      }
    }
    
    if (req.body.discountStartDate !== undefined) {
      updatePayload.discountStartDate = req.body.discountStartDate || null;
      if (req.body.discountStartDate) {
        discountDetails.discountStartDate = req.body.discountStartDate;
      }
    }
    
    if (req.body.discountEndDate !== undefined) {
      updatePayload.discountEndDate = req.body.discountEndDate || null;
      if (req.body.discountEndDate) {
        discountDetails.discountEndDate = req.body.discountEndDate;
      }
    }

    // Calculate isOnSale based on dates
    if (updatePayload.discountStartDate && updatePayload.discountEndDate && updatePayload.discountedPrice) {
      const now = new Date();
      const startDate = new Date(updatePayload.discountStartDate);
      const endDate = new Date(updatePayload.discountEndDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      updatePayload.isOnSale = now >= startDate && now <= endDate;
    } else {
      updatePayload.isOnSale = false;
    }

    // Handle supplier
    if (req.body.supplier === '' || req.body.supplier === null) {
      updatePayload.supplier = undefined;
    } else if (req.body.supplier) {
      updatePayload.supplier = req.body.supplier;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updatePayload, { 
      new: true, 
      runValidators: true 
    }).populate('supplier', 'name email');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Send push notifications if a discount was added
    if (discountAdded && product.discountedPrice) {
      try {
        console.log('🎉 Discount added! Sending push notifications to users...');
        
        // Calculate discount percentage if not provided
        const discountPercent = product.discountPercentage || 
          Math.round(((product.price - product.discountedPrice) / product.price) * 100);
        
        // Get all users with push tokens
        const users = await User.find({ 
          pushToken: { $exists: true, $ne: null },
          isActive: true 
        }).select('pushToken');
        
        console.log(`Found ${users.length} users with push tokens`);

        // Prepare notification message
        const notificationTitle = '🎉 New Discount Alert!';
        const notificationBody = `${product.name} is now ${discountPercent}% OFF! Only ₱${product.discountedPrice}`;
        
        // COMPLETE product data for the notification
        const notificationData = {
          type: 'discount',
          productId: product._id.toString(),
          productName: product.name,
          name: product.name, // Add both formats for compatibility
          discountPercentage: discountPercent,
          discount: discountPercent, // Add both formats
          discountedPrice: product.discountedPrice,
          price: product.price,
          originalPrice: product.price,
          description: product.description,
          category: product.category,
          brand: product.brand || 'Unknown',
          stock: product.stock,
          rating: product.rating || 0,
          numReviews: product.numReviews || 0,
          images: product.images || [],
          discountEndDate: product.discountEndDate,
          endDate: product.discountEndDate, // Add both formats
          updatedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        };

        console.log('📦 Sending notification with complete product data:', {
          productId: notificationData.productId,
          name: notificationData.name,
          price: notificationData.price,
          discountedPrice: notificationData.discountedPrice,
          discountPercentage: notificationData.discountPercentage,
          hasImages: notificationData.images.length > 0
        });

        // Send to each user
        let successCount = 0;
        let failCount = 0;
        
        for (const user of users) {
          if (user.pushToken) {
            try {
              await sendPushNotification(
                user.pushToken,
                notificationTitle,
                notificationBody,
                notificationData
              );
              successCount++;
              
              // Add small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Failed to send to user ${user._id}:`, error.message);
              failCount++;
              
              // If token is invalid, clear it
              if (error.message.includes('Invalid Expo push token')) {
                await User.findByIdAndUpdate(user._id, { pushToken: null });
              }
            }
          }
        }
        
        console.log(`✅ Push notifications sent: ${successCount} successful, ${failCount} failed`);
      } catch (notifError) {
        console.error('❌ Error sending push notifications:', notifError);
        // Don't fail the whole request if notifications fail
      }
    }

    // Check for restock and send wishlist notifications
    if (oldStock <= 0 && product.stock > 0) {
      await checkAndSendRestockNotifications(req.params.id, oldStock, product.stock);
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('❌ UPDATE PRODUCT ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get active suppliers for dropdown => /api/v1/suppliers/dropdown
exports.getActiveSuppliers = async (req, res, next) => {
    try {
        const suppliers = await Supplier.find({ isActive: true })
            .select('name email');

        res.status(200).json({
            success: true,
            suppliers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get deleted products
exports.getDeletedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: false })
      .sort({ updatedAt: -1 })
      .populate('supplier', 'name');

    // Get review counts for deleted products
    const productsWithReviews = await Promise.all(
      products.map(async (product) => {
        const reviewCount = await Review.countDocuments({ 
          product: product._id, 
          isActive: true 
        });
        
        const productObj = product.toObject();
        
        // Check if discount is active based on current date (even for deleted products)
        productObj.isOnSale = checkDiscountActive(product);
        
        productObj.numOfReviews = reviewCount;
        return productObj;
      })
    );

    res.status(200).json({
      success: true,
      count: productsWithReviews.length,
      products: productsWithReviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore product
exports.restoreProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product restored successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete product
exports.softDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product soft-deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Permanently delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete images from Cloudinary first
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.public_id && !img.public_id.startsWith('local_')) {
          try {
            await deleteFromCloudinary(img.public_id);
            console.log('✅ Deleted image from Cloudinary:', img.public_id);
          } catch (err) {
            console.warn('⚠️ Could not delete image from Cloudinary:', err.message);
          }
        }
      }
    }

    // Delete all reviews associated with this product
    await Review.deleteMany({ product: req.params.id });
    console.log(`✅ Deleted all reviews for product: ${req.params.id}`);

    // Remove the product from DB
    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product permanently deleted from database'
    });
  } catch (error) {
    console.error('❌ DELETE PRODUCT ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get product reviews (for admin panel)
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const reviews = await Review.find({ product: productId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get products on sale
exports.getProductsOnSale = async (req, res, next) => {
    try {
        const now = new Date();
        
        // Find products that are on sale based on current date
        const products = await Product.find({
            isActive: true,
            discountedPrice: { $ne: null, $exists: true },
            discountStartDate: { $lte: now },
            discountEndDate: { $gte: now }
        })
        .populate('supplier', 'name email')
        .select('-reviews');

        // Get review counts and ratings for each product
        const productsWithReviews = await Promise.all(
            products.map(async (product) => {
                const reviews = await Review.find({ 
                    product: product._id, 
                    isActive: true 
                });
                
                const productObj = product.toObject();
                
                // Set isOnSale to true for these products
                productObj.isOnSale = true;
                
                productObj.numOfReviews = reviews.length;
                productObj.ratings = reviews.length > 0 
                    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
                    : 0;
                
                return productObj;
            })
        );

        res.status(200).json({
            success: true,
            count: productsWithReviews.length,
            products: productsWithReviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get discount notifications
exports.getDiscountNotifications = async (req, res, next) => {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Get newly discounted products (discount started in last 7 days)
        const newDiscounts = await Product.find({
            isActive: true,
            discountedPrice: { $ne: null },
            discountStartDate: { 
                $gte: sevenDaysAgo,
                $lte: now
            }
        })
        .populate('supplier', 'name')
        .select('name price discountedPrice discountPercentage images category');

        // Get ending soon discounts (discount ending in next 7 days)
        const endingSoonDiscounts = await Product.find({
            isActive: true,
            discountedPrice: { $ne: null },
            discountEndDate: { 
                $gte: now,
                $lte: sevenDaysFromNow
            }
        })
        .populate('supplier', 'name')
        .select('name price discountedPrice discountPercentage images category discountEndDate');

        res.status(200).json({
            success: true,
            notifications: {
                newDiscounts,
                endingSoonDiscounts,
                total: newDiscounts.length + endingSoonDiscounts.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

