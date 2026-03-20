// CVPetShop/backend/routes/Wishlist.js
const express = require('express');
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    checkWishlistStatus,
    getWishlistCount
} = require('../controllers/Wishlist');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

// All wishlist routes require authentication
router.use(isAuthenticatedUser);

// These routes will be prefixed with /api/v1/wishlist
router.get('/wishlist', getWishlist);
router.post('/wishlist/add', addToWishlist);
router.delete('/wishlist/remove/:productId', removeFromWishlist);
router.delete('/wishlist/clear', clearWishlist);
router.get('/wishlist/check/:productId', checkWishlistStatus);
router.get('/wishlist/count', getWishlistCount);

module.exports = router;