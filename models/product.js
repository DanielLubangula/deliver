const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  quantity: { type: Number, required: true },
  images: [
    {
      path: { type: String, required: true }, // Chemin d'accès de l'image
      contentType: { type: String, required: true }, // Type de contenu (ex : "image/png")
    },
  ],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence à l'utilisateur vendeur
    required : true
  },
  infoUser : {
    type : Object
  }
  ,
  dateAdded: {
    type: Date,
    default: Date.now,
  },
});

const Product = mongoose.model("Product3", ProductSchema);

module.exports = Product;
