import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },

    price: { type: Number, required: true },
    description: String,

    gender: {
      type: String,
      enum: ["men", "women", "unisex"],
      required: true
    },

    category: {
      type: String,
      enum: [
        "upper-wear",
        "lower-wear",
        "winter-wear",
        "summer-wear",
        "dresses",
        "shoes"
      ],
      required: true
    },

    season: {
      type: String,
      enum: ["summer", "winter", "all"],
      default: "all"
    },

    ageGroup: {
      type: String,
      enum: ["kids", "adult"],
      required: true
    },

    brand: String,

    image: String,
    images: [String],

    sizes: [String],

    stock: {
      type: Number,
      default: 0
    },

    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);


const Product = mongoose.model('Product', productSchema)
export default Product
