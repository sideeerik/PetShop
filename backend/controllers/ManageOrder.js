// backend/controllers/ManageOrderController.js
const Order = require("../models/Order");
const sendEmail = require("../utils/Mailer");
const { generateOrderEmailTemplate } = require("../utils/emailTemplate");
const { generateReceiptPDF } = require("../utils/pdfGenerator");
const { sendPushNotification } = require("../utils/pushNotification");

const ORDER_STATUS_TRANSITIONS = {
  Processing: ["Accepted", "Cancelled"],
  Accepted: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

// 🟢 Get all orders (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders." });
  }
};

// 🟢 Get a single order by ID (Admin)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found." });

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order details." });
  }
};

// 🟢 Update order status (Admin) - FIXED: Include full item details in notification
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = Object.keys(ORDER_STATUS_TRANSITIONS);

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Allowed: Processing, Accepted, Cancelled, Out For Delivery, Delivered.",
      });
    }

    // FIXED: Use populate with explicit field selection including +pushToken
    const order = await Order.findById(id)
      .populate({
        path: "user",
        select: "name email +pushToken"
      })
      .populate("orderItems.product", "name images price"); // Make sure to include images and price

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const oldStatus = order.orderStatus;
    const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[oldStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          allowedNextStatuses.length > 0
            ? `Invalid status transition. ${oldStatus} can only change to: ${allowedNextStatuses.join(", ")}.`
            : `Orders with status ${oldStatus} cannot be changed anymore.`,
      });
    }

    // Log user data for debugging
    console.log('📱 Order update - User data:', {
      userId: order.user?._id,
      name: order.user?.name,
      email: order.user?.email,
      hasPushToken: !!order.user?.pushToken,
      pushTokenValue: order.user?.pushToken ? `${order.user.pushToken.substring(0, 20)}...` : 'none'
    });

    order.orderStatus = status;
    
    if (status === "Delivered") {
      order.deliveredAt = Date.now();
    }

    await order.save();

    // Send push notification if user has token
    if (order.user && order.user.pushToken) {
      try {
        console.log(`📱 Attempting to send push notification for order #${order._id}`);
        
        let notificationBody = `Your order #${order._id.toString().slice(-8)} status changed to ${status}`;
        
        // Format items for notification - THIS IS THE KEY FIX
        const formattedItems = order.orderItems.map(item => ({
          _id: item.product?._id || item._id,
          name: item.product?.name || item.name || 'Product',
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.product?.images?.[0]?.url || item.product?.images?.[0] || null,
          product: item.product ? {
            _id: item.product._id,
            name: item.product.name,
            images: item.product.images
          } : null
        }));

        // Calculate items price if not already calculated
        const itemsPrice = order.itemsPrice || 
          formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Enhanced notification data with COMPLETE order information
        let notificationData = {
          type: 'ORDER_STATUS_UPDATE',
          orderId: order._id.toString(),
          orderNumber: order._id.toString().slice(-8),
          status: status,
          oldStatus: oldStatus,
          updatedAt: new Date().toISOString(),
          // Add user information to notification data
          user: {
            id: order.user._id.toString(),
            name: order.user.name,
            email: order.user.email
          },
          // Add COMPLETE order items (THIS IS WHAT YOU NEED)
          items: formattedItems,
          // Add order summary with all pricing details
          itemsPrice: itemsPrice,
          shippingPrice: order.shippingPrice || 0,
          taxPrice: order.taxPrice || 0,
          total: order.totalPrice || itemsPrice,
          // Keep the summary for backward compatibility
          orderSummary: {
            totalAmount: order.totalPrice || itemsPrice,
            itemCount: formattedItems.length,
            items: formattedItems.map(item => ({
              productName: item.name,
              quantity: item.quantity,
              price: item.price
            }))
          }
        };

        console.log('📦 Notification items prepared:', {
          count: formattedItems.length,
          firstItem: formattedItems[0] ? {
            name: formattedItems[0].name,
            price: formattedItems[0].price,
            quantity: formattedItems[0].quantity,
            hasImage: !!formattedItems[0].image
          } : 'no items'
        });

        // Special message for delivered orders
        if (status === "Delivered") {
          notificationBody = `🎉 Your order #${order._id.toString().slice(-8)} has been delivered! Check your email for receipt.`;
        }

        // Send the push notification
        const pushResult = await sendPushNotification(
          order.user.pushToken,
          `Order ${status}`,
          notificationBody,
          notificationData
        );
        
        console.log(`✅ Push notification sent successfully for order #${order._id}`);
        console.log('Push result:', pushResult);
      } catch (pushError) {
        console.error("❌ Failed to send push notification:", pushError);
        console.error("Push error details:", pushError.stack);
        // Continue even if push fails - don't block the order update
      }
    } else {
      console.log(`ℹ️ No push token found for user: ${order.user?.email || 'unknown'}`);
    }

    // Send email notification for status change
    try {
      const emailTemplate = generateOrderEmailTemplate(order, order.user, status);
      const emailOptions = {
        email: order.user.email,
        subject: `Order ${status} - #${order._id}`,
        message: emailTemplate,
      };

      // Only attach PDF for Delivered status
      if (status === "Delivered") {
        try {
          console.log(`📄 Generating PDF receipt for order #${order._id}`);
          const pdfBuffer = await generateReceiptPDF(order, order.user);
          
          emailOptions.attachments = [
            {
              filename: `HarmoniaHub_Receipt_${order._id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ];
          console.log(`✅ PDF receipt generated and attached for order #${order._id}`);
        } catch (pdfError) {
          console.error('❌ Failed to generate PDF:', pdfError);
        }
      }

      console.log(`📧 Sending ${status} email to: ${order.user.email}`);
      
      // Small delay to ensure PDF is ready (if generated)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await sendEmail(emailOptions);
      console.log(`✅ Status update email sent for order #${order._id} to ${order.user.email}`);

    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
    }

    res.status(200).json({ 
      success: true, 
      message: "Order status updated and notifications sent.", 
      order 
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ success: false, message: "Failed to update order." });
  }
};
// 🟢 Delete order (Admin)
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found." });

    await order.deleteOne();
    res.status(200).json({ success: true, message: "Order deleted successfully." });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ success: false, message: "Failed to delete order." });
  }
};
