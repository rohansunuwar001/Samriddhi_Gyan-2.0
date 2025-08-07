import mongoose from "mongoose";

const SearchSuggestionSchema = new mongoose.Schema({
  term: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
});

export const SearchSuggestion = mongoose.model("SearchSuggestion", SearchSuggestionSchema);