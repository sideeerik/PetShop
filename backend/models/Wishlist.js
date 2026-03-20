// CVPetShop/backend/models/Wishlist.js
const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        unique: true // This ensures one wishlist per user
    },
    items: [
        {
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {
    timestamps: true
});

// Simple index for performance (not unique)
wishlistSchema.index({ user: 1, 'items.product': 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);