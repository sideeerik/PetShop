// backend/utils/pushNotification.js
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single device
 * @param {string} pushToken - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send
 * @returns {Promise} - Promise that resolves when notification is sent
 */
exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
  try {
    console.log('📱 Preparing push notification...');
    console.log('Token:', pushToken ? pushToken.substring(0, 20) + '...' : 'none');
    console.log('Title:', title);
    console.log('Body:', body);

    // Check if the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`❌ Invalid Expo push token: ${pushToken}`);
      throw new Error(`Invalid Expo push token: ${pushToken}`);
    }

    // Create the notification message
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'order-updates', // For Android
    };

    console.log('📨 Sending push message:', JSON.stringify(message, null, 2));

    // Send the notification
    const ticket = await expo.sendPushNotificationsAsync([message]);
    
    console.log('✅ Push notification ticket:', JSON.stringify(ticket, null, 2));
    
    // Check for errors in the ticket
    if (ticket[0].status === 'error') {
      console.error('❌ Push notification error:', ticket[0].message);
      throw new Error(ticket[0].message);
    }

    return ticket;
  } catch (error) {
    console.error('❌ Error in sendPushNotification:', error);
    throw error;
  }
};

/**
 * Send order status update notification with complete order details
 * @param {Object} user - User object with pushToken
 * @param {Object} order - Order object with populated items
 * @param {string} status - New order status
 * @returns {Promise}
 */
exports.sendOrderStatusNotification = async (user, order, status) => {
  try {
    if (!user || !user.pushToken) {
      console.log('⚠️ No push token for user, skipping notification');
      return;
    }
    
    console.log(`📱 Preparing order status notification for #${order._id} to ${user.email}`);
    
    // Format items for notification with complete details
    const notificationItems = order.orderItems.map(item => ({
      _id: item.product?._id || item._id,
      name: item.product?.name || item.name || 'Product',
      price: item.price || 0,
      quantity: item.quantity || 1,
      image: item.product?.images?.[0]?.url || item.product?.images?.[0] || null,
      productId: item.product?._id || item.product
    }));
    
    // Calculate items price if not already calculated
    const itemsPrice = order.itemsPrice || 
      notificationItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Prepare notification data with complete order information
    const notificationData = {
      type: 'ORDER_STATUS_UPDATE',
      orderId: order._id.toString(),
      orderNumber: order._id.toString().slice(-8),
      status: status,
      updatedAt: new Date().toISOString(),
      // Complete items array for display
      items: notificationItems,
      // Pricing details
      itemsPrice: itemsPrice,
      shippingPrice: order.shippingPrice || 0,
      taxPrice: order.taxPrice || 0,
      total: order.totalPrice || itemsPrice,
      // User info for reference
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    };
    
    console.log(`📦 Notification items prepared: ${notificationItems.length} items`);
    
    // Customize message based on status
    let body = `Your order #${order._id.toString().slice(-8)} status changed to ${status}`;
    if (status === "Delivered") {
      body = `🎉 Your order #${order._id.toString().slice(-8)} has been delivered! Check your email for receipt.`;
    } else if (status === "Cancelled") {
      body = `❌ Your order #${order._id.toString().slice(-8)} has been cancelled.`;
    } else if (status === "Accepted") {
      body = `✅ Your order #${order._id.toString().slice(-8)} has been accepted and is being processed.`;
    } else if (status === "Out for Delivery") {
      body = `🚚 Your order #${order._id.toString().slice(-8)} is out for delivery!`;
    }
    
    // Use the existing sendPushNotification function
    return await exports.sendPushNotification(
      user.pushToken,
      `Order ${status}`,
      body,
      notificationData
    );
    
  } catch (error) {
    console.error('❌ Error sending order status notification:', error);
    // Don't throw - we don't want to block the order update
  }
};

/**
 * Send push notifications to multiple devices
 * @param {Array} messages - Array of message objects
 * @returns {Promise} - Promise that resolves when all notifications are sent
 */
exports.sendMultiplePushNotifications = async (messages) => {
  try {
    // Validate all tokens first
    const validMessages = messages.filter(msg => Expo.isExpoPushToken(msg.to));
    
    if (validMessages.length === 0) {
      console.log('No valid push tokens found');
      return [];
    }

    // Send notifications in chunks (Expo recommends chunks of 100)
    const chunks = expo.chunkPushNotifications(validMessages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    return tickets;
  } catch (error) {
    console.error('Error sending multiple push notifications:', error);
    throw error;
  }
};


exports.sendProductDiscountNotification = async (user, product, discountPercentage) => {
  try {
    if (!user || !user.pushToken) {
      console.log('⚠️ No push token for user, skipping notification');
      return;
    }
    
    console.log(`📱 Preparing product discount notification for ${product.name} to ${user.email}`);
    
    // Calculate discounted price
    const discountedPrice = product.price * (1 - discountPercentage / 100);
    
    // Prepare notification data with complete product information
    const notificationData = {
      type: 'PRODUCT_DISCOUNT',
      productId: product._id.toString(),
      discount: discountPercentage,
      updatedAt: new Date().toISOString(),
      // Complete product details for display
      productData: {
        _id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: discountedPrice,
        discountPercentage: discountPercentage,
        images: product.images,
        category: product.category,
        stock: product.stock,
        brand: product.brand,
        rating: product.rating,
        numReviews: product.numReviews
      }
    };
    
    console.log(`📦 Product notification prepared: ${product.name}`);
    
    // Customize message
    const body = `🔥 ${product.name} is now ${discountPercentage}% off! Only ₱${discountedPrice.toFixed(2)}`;
    
    // Use the existing sendPushNotification function
    return await exports.sendPushNotification(
      user.pushToken,
      `Special Discount!`,
      body,
      notificationData
    );
    
  } catch (error) {
    console.error('❌ Error sending product discount notification:', error);
  }
};