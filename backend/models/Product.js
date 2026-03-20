// PetShop/backend/models/Product.js
const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter product name'],
        trim: true,
        maxLength: [100, 'Product name cannot exceed 100 characters']
    },
    price: {
        type: Number,
        required: [true, 'Please enter product price'],
        maxLength: [5, 'Product price cannot exceed 5 characters'],
        default: 0.0
    },
    discountedPrice: {
        type: Number,
        default: null
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    discountStartDate: {
        type: Date,
        default: null
    },
    discountEndDate: {
        type: Date,
        default: null
    },
    isOnSale: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        required: [true, 'Please enter product description'],
    },
    ratings: {
        type: Number,
        default: 0
    },
    images: [
        {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            },
        }
    ],
    category: {
        type: String,
        required: [true, 'Please select category for this product'],
        enum: {
            values: [
                'Pet Food',
                'Pet Accessories',
                'Pet Toys',
                'Health & Wellness',
                'Grooming Supplies',
                'Feeding Supplies',
                'Housing & Cages'
            ],
            message: 'Please select correct category for product'
        }
    },
    supplier: {
        type: mongoose.Schema.ObjectId,
        ref: 'Supplier',
        required: false
    },
    stock: {
        type: Number,
        required: [true, 'Please enter product stock'],
        maxLength: [5, 'Product stock cannot exceed 5 characters'],
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Virtual for checking if product is on sale
productSchema.virtual('effectivePrice').get(function() {
    if (this.isOnSale && this.discountedPrice && this.discountEndDate) {
        const now = new Date();
        if (now >= this.discountStartDate && now <= this.discountEndDate) {
            return this.discountedPrice;
        }
    }
    return this.price;
});

// Method to check if discount is active
productSchema.methods.isDiscountActive = function() {
    if (!this.isOnSale || !this.discountStartDate || !this.discountEndDate) {
        return false;
    }
    const now = new Date();
    return now >= this.discountStartDate && now <= this.discountEndDate;
};

// Pre-save middleware to update isOnSale based on dates
productSchema.pre('save', function(next) {
    if (this.discountStartDate && this.discountEndDate && this.discountedPrice) {
        const now = new Date();
        this.isOnSale = now >= this.discountStartDate && now <= this.discountEndDate;
    } else {
        this.isOnSale = false;
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);