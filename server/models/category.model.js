import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required.'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Category slug is required.'],
    unique: true,
    lowercase: true,
    // e.g., "it-software"
  },
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

export default Category;