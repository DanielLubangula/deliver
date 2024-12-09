const User = require("../models/User");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const Vendor = require("../models/Vendor"); // Assurez-vous d'inclure votre modèle Vendor
const Product = require("../models/product");

// Page dashbordVendor pour vendeur
exports.dashbordVendor = (req, res) => {

  if (!req.session.vendor.profileImagePath){
    req.session.vendor.profileImagePath = "/images/defaultUserProfil.jpg"
  }


  res.render("dashbordVendor", {
    navbarVendor: true,
    titre: "Dashboard Vendeur",
    activeongletdas: true,
  });
};

// Page de l'onglet product pour vendeur
exports.productVendor = async (req, res) => {
  if (!req.session.vendor) {
    return res.redirect("/deliver");
  }

  const vendor = req.session.vendor;
  res.render("productVendor", {
    navbarVendor: true,
    titre: "Gestion des Produits",
    activeongletprod: true,
    vendor,
  });
};

// Route API pour obtenir les produits du vendeur
exports.apiProduct = async (req, res) => {
  if (!req.session.vendor) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  try {
    // Récupérer les produits et les trier par `dateAdded` (les plus récents en premier)
    const products = await Product.find({
      seller: req.session.vendor._id,
    })
      .sort({ dateAdded: -1 })
      .limit(2); // -1 pour ordre décroissant
    res.json(products);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Page de l'onglet profil pour vendeur
exports.profilVendor = async (req, res) => {
  if (!req.session.vendor) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  const Seller = await Vendor.find({
    _id : req.session.vendor._id,
  })
  const seller =  req.session.vendor

  if (!req.session.vendor.profileImagePath){
    req.session.vendor.profileImagePath = "/images/defaultUserProfil.jpg"
  }


  res.render("profilVendor", {
    seller,
    navbarVendor: true,
    titre: "Profil",
    activeongletpro: true,
  });
};

// Page de l'onglet livraison pour vendeur
exports.livraisonVendor = (req, res) => {
  res.render("livraisonVendor", {
    navbarVendor: true,
    titre: "Livraisons",
    activeongletliv: true,
  });
};

// Page de l'onglet commandeVendor pour vendeur
exports.commandeVendor = (req, res) => {
  res.render("commandeVendor", {
    navbarVendor: true,
    titre: "Gestion des Commandes",
    activeongletcom: true,
  });
};

exports.up = (req, res) => {
  res.render("up");
};
