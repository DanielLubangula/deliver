const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/product"); // Modèle de produit
const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/User");
const Message = require("../models/Message");
const Vendor = require("../models/Vendor");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const ProductComment = require("../models/ProductComment");
const Preference = require("../models/Preference");
const likedProduct = require("../models/likeProduct");
const Admin = require("../models/Admin")

// Page de connexion admin
exports.loginAdmin = (req, res) => {
    res.render('admin/loginAdmin')
}

// Page view utilisateur
exports.viewUserAdmin = async (req, res) => {

  if(!req.session.admin) return res.redirect('/deliver')

  res.render('admin/viewUserAdmin')
}

// Traitement de la connexion
exports.loginTraitement = async (req, res) => {
    
  const { email, password } = req.body;

  try {
    // Vérifier si l'email existe
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    req.session.admin = admin

    // Réponse en cas de succès
    res.status(200).json({ message: 'Connexion réussie' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

exports.findAlluser = async (req, res) => {
  // Récupérer tous les utilisateurs
  try {
    const users = await User.find(); // Récupère les acheteurs
    const vendors = await Vendor.find(); // Récupérer les vendeurs

    // Ajout d'une propriété type pour chaque objet
    const buyersWithType = users.map((buyer) => ({
      ...buyer.toObject(),
      type : "Acheteur"
    }))

    // Ajout d'une propriété type pour chaque objet
    const sellersWithType = vendors.map((seller) => ({
      ...seller.toObject(),
      type : "vendeur"
    }))

    // Fusion des deux tableaux
    let mergedUsers = [...buyersWithType, ...sellersWithType]

    // Trier par date du plus récent au plus ancien
    mergedUsers = mergedUsers.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return dateB - dateA
    })

    res.json(mergedUsers);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
  }
}

// Route pour bloquer ou débloquer un utilsateur
exports.toggleStatus = async (req, res) => {
  if(!req.session.admin) return res.redirect('/deliver')
  try {
    const user = await User.findById(req.params.id) || await Vendor.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé." });

    user.status = user.status === "active" ? "blocked" : "active";
    await user.save();

    res.json({ message: "Statut modifié avec succès.", user });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la modification du statut." });
  }
}

exports.deleteUser = async (req, res) => {
// Supprimer un utilisateur
  try {
    await User.findByIdAndDelete(req.params.id) || await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: "Utilisateur supprimé avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur." });
  }
}

// Acceder à la page produit
exports.viewProduct = async (req, res) => {
  if(!req.session.admin) return res.redirect('/deliver')
  res.render("admin/viewProduct")
}

// Route pour récupérer tous les produits
exports.findAllProduct = async (req, res) =>{
  if(!req.session.admin) return res.redirect('/deliver')
  try {
    const products = await Product.find().sort({dateAdded : -1}); // Charger les infos du vendeur

    const addUser = await Promise.all(
      products.map( async (product) => {
        const user = await User.findById(product.seller) || await Vendor.findById(product.seller)

        return{
          ...product.toObject(),
          user
        }
      })
    )

    res.status(200).json(addUser);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des produits." });
  }
}

// Route pour supprimer un produit
exports.deleteProductAdmin = async (req, res) => {
  try {
    const productId = req.params.id;
    await Product.findByIdAndDelete(productId);
    res.status(200).json({ message: "Produit supprimé avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression du produit." });
  }
}
