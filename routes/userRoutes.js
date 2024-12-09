const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const imageController = require("../controllers/imageController");
const vendorController = require("../controllers/vendorController");
const apiController = require("../controllers/apiController");
const chatController = require("../controllers/chatController");
const adminController = require("../controllers/adminController");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Admin = require("../models/Admin");
const Message = require("../models/Message");
const Product = require("../models/product");
const ProductComment = require("../models/ProductComment");
const multer = require("multer");
// All user

router.get("/alluser", async function (req, res) {
  const alluser = await User.find({}).select("-bufferString");
  res.send(alluser);
});

router.get("/adminUser", async function (req, res) {
  const alluser = await Admin.find({});
  res.send(alluser);
});

// All Message

router.get("/allMessage", async function (req, res) {
  const alluser = await Message.find({});
  res.send(alluser);
});

// All Product

router.get("/allproduct", async function (req, res) {
  const alluser = await Product.find({});
  res.send(alluser);
});
router.get("/allproductvendor", async function (req, res) {
  const products = await Product.find({
    seller: req.session.vendor._id,
  }).sort({ dateAdded: -1 }); // -1 pour ordre décroissant
  res.json(products);
});

router.get("/allProductComment", async function (req, res) {
  const alluser = await ProductComment.find({});
  res.send(alluser);
});

// All Vendor
router.get("/allvendor", async (req, res) => {
  const allvendor = await Vendor.find({}).select("-bufferString");
  res.send(allvendor);
});
// Upload image
const upload = multer({
  limits: {
    fileSize: 5000000, // Taille limite de l'image 5 mb
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      //Prend en charge les images en format jpg,jpeg,png
      return cb(new Error("Please upload an image"));
    }
    cb(undefined, true);
  },
});

// Page d'acceuil
router.get("/", userController.acceuil);

// Route pour traiter les données du formulaire d'inscription
router.post("/register", userController.registerUser);

// Route pour la page registerLogin
router.get("/registerLogin", userController.registerLogin);

// Route pour la page registerLogin
router.get("/forgotPassword", userController.forgotPasswordPage);

// Route pour le traitement registerLogin
router.post("/forgotPassword", userController.forgotPassword);

// Endpoint pour définir un nouveau mot de passe 
router.post("/resetPassword ", userController.resetPassword);

// Route pour traiter les données du formulaire de connexion
router.post("/login", userController.loginUser);

// Route pour la page profil
router.get("/profil", userController.profil);

// Route pour déconnecter l'utilisateur
router.get("/logout", userController.logoutUser);

// Route pour le traitement des images avec gestion des erreurs
router.post("/upload", imageController.uploadImage);

// Update Mot de Passe
router.post("/updatePassword", userController.updatePassword);

//Mettre à jour l'utilisateur
router.post("/updateUser", userController.updateUser);

// Page d'inscription pour vendeur
router.get("/registerVendor", userController.registerVendor);

// Page pour la gestion d'inscription des vendeurs
router.post("/registerGestion", imageController.registerGestion);

// Page pour la gestion de connexion de vendeurs
router.post("/loginGestion", userController.loginGestion);

// Page d'authentification pour vendeur
router.get("/loginVendor", userController.loginVendor);

// Page Dashbord pour vendeur
router.get("/dashbordVendor", vendorController.dashbordVendor);

// Page de l'onglet product pour vendeur
router.get("/productVendor", vendorController.productVendor);

// Page de profil product pour vendeur
router.get("/profilVendor", vendorController.profilVendor);

// Page de livraison product pour vendeur
router.get("/livraisonVendor", vendorController.livraisonVendor);

// Page de commandeVendor product pour vendeur
router.get("/commandeVendor", vendorController.commandeVendor);

// route de traitement et enregistrement de photo produit pour vendeur
router.post("/productPublieVendor", imageController.productPublieVendor);

// route de traitement et enregistrement de photo produit pour vendeur
router.get("/apiProduct", vendorController.apiProduct);

// Route pour supprimer un produit
router.delete("/api/products/:id", apiController.deleteProduct);

// Route pour supprimer un produit
router.put("/api/editProduct/:id", apiController.editProduct);

// Route pour charger le produit (infiniteScroll)
router.post("/api/chargeproduct/:id", apiController.infiniteScrollProduct);

// Route pour mettre à jour les informations du vendeur
router.put("/vendor/update", apiController.updateVendorInfo);

// Route pour mettre à jour le mot de passe du vendeur
router.put("/vendor/update-password", apiController.updatePassword);

// Fonction de mise à jour de l'image de profil
router.post("/vendor/updateProfileImage", apiController.updateProfileImage);

// Récupérer les préférences d'un vendeur
router.get("/api/preferencVendor", apiController.preferencVendor);

// Mettre à jour les préférences d'un vendeur
router.put("/api/updatePreferences", apiController.updatePreference);

// Fonction pour récupérer trois produits de chaque catégorie spécifiée
router.get("/allCatalogue", apiController.allCatalogue);

// Fonction pour récupérer le nombre de commentaires d'un produit
router.post("/api/numberComment/", apiController.numberComment);

// Fonction pour récupérer les informations de l'utilisateur
router.post("/api/userinfo/", apiController.userinfo);

// Supprimer le commentaire d'un produit
router.delete(
  "/api/comments/delete-comment/:commentId",
  apiController.commentDelete
);

// Voir les produits de chaque catégorie
router.get("/productCateg/:category", userController.productCateg);

// Voir les produits de chaque catégorie
router.post("/apiProductDetail/", apiController.apiProductDetail);

// Affichage de l'interface de chat
router.get("/chat/:idUser/:idProduct", chatController.chat);

// Voir les produits de chaque catégorie
router.post("/api/uploadChat/", apiController.uploadChat);

// récuperation des messages
router.post("/api/chat/", apiController.recuperChat);

// Affichage de la page pour voir la liste des utilisateur
router.get("/listChatUser/", userController.listChatUser);

// Affichage de la liste des utilisateur avec qui l'on a eu à discuter
router.post("/getListChatUser/", userController.getListChatUser);

// Changer les status de message de non lue vers lue
router.post("/api/markMessagesAsRead/", chatController.markMessagesAsRead);

// Changer les status de message de non lue vers lue
router.post("/api/numbreNotifListChat/", apiController.numbreNotifListChat);

// Mettre un utilisateur dans la liste noir
router.post("/api/listNoir/", apiController.listNoir);

// Route pour supprimé le message chat
router.post("/api/deleteMessage/", apiController.deleteMessage);

// Route admin login
router.get("/admin/connect/", adminController.loginAdmin);

// Route admin pour voir les utilisateurs
router.get("/admin/connect/viewUserAdmin", adminController.viewUserAdmin);

// Route admin login traitement
router.post("/api/loginAdmin/", adminController.loginTraitement);

// Route admin login traitement
router.get("/api/findAlluser/", adminController.findAlluser);

// Bloquer ou débloquer un utilisateur
router.put(
  "/api/findAlluser/users/:id/toggle-status",
  adminController.toggleStatus
);

// Route admin pour supprimé un utilisateur
router.delete("/api/findAlluser/users/:id", adminController.deleteUser);

// Route admin pour acceder à la page produit
router.get("/admin/connect/viewProduct", adminController.viewProduct);

// Route récuperer les produits
router.get("/admin/api/findProduct", adminController.findAllProduct);

// Route admin pour acceder à la page produit
router.delete("/admin/api/findProduct/:id", adminController.deleteProductAdmin);

module.exports = router;
