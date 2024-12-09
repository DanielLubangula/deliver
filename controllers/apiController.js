const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/product"); // Modèle de produit
const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/User");
const Message = require("../models/Message");
// controllers/apiController.js
const Vendor = require("../models/Vendor");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const ProductComment = require("../models/ProductComment");
const Preference = require("../models/Preference");
const likedProduct = require("../models/likeProduct");
const { info } = require("console");

// Route API pour supprimer un produit
exports.deleteProduct = async (req, res) => {
  try {
    // Vérifiez que l'ID est défini et valide
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "ID de produit invalide" });
    }

    // Recherchez le produit dans la base de données
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    // Supprimez chaque image associée au produit
    product.images.forEach((image) => {
      const imagePath = path.join(__dirname, "..", "uploads", image.path);
      // Supprimez l'image avec fs.unlink()
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Erreur lors de la suppression de l'image:", err);
        }
      });
    });

    // Supprimez le produit de la base de données
    await Product.findByIdAndDelete(productId);

    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
//

// Configuration de multer pour stocker les images en mémoire
const storageVendor = multer.memoryStorage();
const uploadVendor = multer({
  storage: storageVendor,
  limits: { fileSize: 5 * 1024 * 1024 }, // Taille limite de 5 Mo par fichier
}).array("images", 3); // Limite à 3 fichiers

// Dossier de sauvegarde des images
const uploadDir = path.join(__dirname, "..", "uploads", "products");

// Fonction pour la modification du produit
exports.editProduct = async (req, res) => {
  uploadVendor(req, res, async function (err) {
    if (err) {
      return res
        .status(500)
        .json({ message: "Erreur lors du téléchargement", error: err });
    }

    const { name, category, price, description, quantity } = req.body;
    const productId = req.params.id;
    let msgErr = "";

    // Validation des champs obligatoires
    if (!name || !category || !price || !quantity) {
      msgErr = "Veuillez remplir les champs obligatoires";
      return res.status(400).json({ message: msgErr });
    }

    try {
      // Récupérer le produit actuel pour obtenir les chemins des images actuelles
      const currentProduct = await Product.findById(productId);
      if (!currentProduct) {
        return res.status(404).json({ message: "Produit non trouvé" });
      }

      // Vérifier si de nouvelles images ont été uploadées
      let images = currentProduct.images; // Conserver les images actuelles par défaut
      if (req.files && req.files.length > 0) {
        // Supprimer les anciennes images du dossier si de nouvelles images sont uploadées
        if (images && images.length > 0) {
          images.forEach((image) => {
            const oldImagePath = path.join(
              uploadDir,
              image.path.split("/").pop()
            );
            if (fs.existsSync(oldImagePath)) {
              console.log("photo supprimé");
              fs.unlinkSync(oldImagePath); // Supprimer le fichier
            }
          });
        }

        // Limiter à trois images maximum
        if (req.files.length > 3) {
          return res.status(400).json({
            message: "Erreur : vous ne pouvez envoyer que 3 images au maximum.",
          });
        }

        // Traiter et sauvegarder chaque image
        images = await Promise.all(
          req.files.map(async (file, index) => {
            const filename = `image_${Date.now()}_${index}.jpg`;
            const filePath = path.join(uploadDir, filename);

            // Traitement et compression avec sharp
            const processedImageBuffer = await sharp(file.buffer)
              .resize({ width: 250, height: 250 }) // Redimensionner l'image
              .jpeg({ quality: 10 }) // Compresser l'image en qualité 10
              .toBuffer();

            // Sauvegarder l'image sur le disque
            fs.writeFileSync(filePath, processedImageBuffer);

            return {
              path: "/products/" + filename, // Chemin relatif de l'image
              contentType: "image/jpeg",
            };
          })
        );

        // Inverser l'ordre des images pour les sauvegarder
        images.reverse();
      }

      // Mise à jour du produit dans la base de données
      const updateData = { name, category, price, description, quantity };
      if (images.length > 0) {
        updateData.images = images; // Mettre à jour les chemins d'accès des images si de nouvelles images sont fournies
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }
      );

      res.json({
        message: "Produit mis à jour avec succès",
        product: updatedProduct,
      });
    } catch (err) {
      console.error("Erreur lors de la modification du produit:", err);
      msgErr = "Une erreur est survenue lors de la modification du produit";
      res.status(500).json({ message: msgErr });
    }
  });
};

exports.infiniteScrollProduct = async (req, res) => {
  try {
    const lastProductId = req.params.id; // ID du dernier produit visible

    // Récupérer les produits du vendeur ayant un `_id` inférieur à `lastProductId`
    const products = await Product.find({
      seller: req.session.vendor._id,
      _id: { $lt: lastProductId }, // Filtrer pour récupérer les produits avec un ID inférieur
    })
      .sort({ _id: -1 }) // Trier par `_id` décroissant (du plus récent au plus ancien)
      .limit(2); // Limiter le nombre de produits pour chaque chargement

    res.json({ products });
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Contrôleur pour mettre à jour les informations du vendeur
exports.updateVendorInfo = async (req, res) => {
  console.log("arrivé : " + req.body);
  console.log(req.body);
  // Valider les champs du formulaire
  await body("companyName").optional().isString().run(req);
  await body("companyAddress").optional().isString().run(req);
  await body("email").optional().isEmail().run(req);
  await body("phone").optional().isString().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { companyName, companyAddress, email, phone } = req.body;
    const vendorId = req.session.vendor._id; // ID du vendeur actuellement connecté

    // Rechercher le vendeur par ID
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendeur non trouvé" });
    }

    // Mettre à jour uniquement les champs fournis
    if (companyName) vendor.companyName = companyName;
    if (companyAddress) vendor.companyAddress = companyAddress;
    if (email) vendor.email = email;
    if (phone) vendor.phone = phone;

    // Sauvegarder les changements
    await vendor.save();
    req.session.vendor = vendor;
    res.json({ message: "Informations mises à jour avec succès", vendor });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour des informations du vendeur:",
      error
    );
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Configurer multer pour stocker l'image en mémoire
const storageVendorImg = multer.memoryStorage();
const uploadVendorImg = multer({
  storage: storageVendorImg,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limiter la taille à 5 Mo
}).single("profilVendor"); // Un seul fichier à la fois pour l'image de profil

// Chemin du dossier de sauvegarde des images de profil
const uploadDirImg = path.join(__dirname, "..", "uploads", "profilVendeur");

// Fonction de mise à jour de l'image de profil
exports.updateProfileImage = async (req, res) => {
  // Utiliser multer pour gérer le téléchargement de l'image
  uploadVendorImg(req, res, async function (err) {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors du téléchargement de l'image",
        error: err,
      });
    }

    try {
      // Vérifier si un fichier a été téléchargé
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Veuillez télécharger une image." });
      }

      const vendorId = req.session.vendor._id;

      // Récupérer le vendeur depuis la base de données
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendeur non trouvé." });
      }

      // Supprimer l'ancienne image du serveur de fichiers si elle existe
      if (vendor.profileImagePath) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "uploads",
          vendor.profileImagePath
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Traiter et sauvegarder la nouvelle image avec Sharp
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const filePath = path.join(uploadDirImg, filename);

      // Compression et redimensionnement de l'image
      const processedImageBuffer = await sharp(req.file.buffer)
        .resize({ width: 250, height: 250 }) // Ajuster la taille selon les besoins
        .jpeg({ quality: 80 }) // Compression en JPEG avec qualité 80
        .toBuffer();

      // Sauvegarder l'image traitée sur le serveur
      fs.writeFileSync(filePath, processedImageBuffer);

      // Mettre à jour le chemin de l'image de profil dans la base de données
      vendor.profileImagePath = `/profilVendeur/${filename}`;
      await vendor.save();

      req.session.vendor = vendor;
      res.json({
        message: "Image de profil mise à jour avec succès!",
        profileImagePath: vendor.profileImagePath, // Nouveau chemin de l'image
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'image de profil:", err);
      res.status(500).json({
        message:
          "Une erreur est survenue lors de la mise à jour de l'image de profil.",
      });
    }
  });
};

exports.updatePassword = async (req, res) => {
  // Valider les champs de mot de passe
  await body("password")
    .isLength({ min: 3 })
    .withMessage("Le mot de passe doit contenir au moins 8 caractères.")
    .run(req);
  await body("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Les mots de passe ne correspondent pas.");
      }
      return true;
    })
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const vendorId = req.session.vendor._id; // ID du vendeur actuellement connecté
    const { password } = req.body;

    // Récupérer le vendeur connecté
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendeur non trouvé" });
    }

    const isMatch = await bcrypt.compare(req.body.passwordOld, vendor.password); // user.password est le mot de passe haché dans la DB
    if (!isMatch) {
      req.session.messsageErrorUpdatepassword =
        "Mot de passe actuel incorrect.";

      return res
        .status(400)
        .json({ message: " Mot de passe actuel incorrect." });
    }

    // Hachage du nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Mise à jour du mot de passe
    vendor.password = hashedPassword;
    await vendor.save();

    res.json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mot de passe:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les préférences d'un vendeur
exports.preferencVendor = async (req, res) => {
  try {
    const preferences = await Preference.findOne({
      vendorId: req.session.vendor._id,
    });
    if (!preferences) {
      const newPreference = await Preference({
        vendorId: req.session.vendor._id,
        emailNotifications: true,
        smsNotifications: false,
      });
      await newPreference.save();
      return res.status(200).json({ message: newPreference });
    }
    res.json(preferences);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour les préférences d'un vendeur
exports.updatePreference = async (req, res) => {
  const { emailNotifications, smsNotifications } = req.body;
  try {
    let preferences = await Preference.findOne({
      vendorId: req.session.vendor._id,
    });

    if (emailNotifications) {
      preferences.emailNotifications = !preferences.emailNotifications;
    }

    if (smsNotifications) {
      preferences.smsNotifications = !preferences.smsNotifications;
    }

    await preferences.save();
    res.json(preferences);
  } catch (error) {
    console.log("Erreur lors de update de préférence " + error);
    res.status(500).json({ message: error.message });
  }
};

// Fonction pour récupérer trois produits de chaque catégorie spécifiée
// Fonction pour récupérer trois produits de chaque catégorie spécifiée avec les informations du vendeur
exports.allCatalogue = async (req, res) => {
  try {
    // Utilisation de l'agrégation MongoDB pour filtrer, joindre et structurer les données
    let categories = await Product.aggregate([
      {
        // Étape 1 : Filtrer les produits appartenant aux catégories spécifiées
        $match: {
          category: { $in: ["Électronique", "Vêtements", "Alimentation"] },
        },
      },
      {
        // Étape 2 : Effectuer un $lookup pour ajouter les informations du vendeur
        $lookup: {
          from: "vendors", // Nom de la collection des vendeurs
          localField: "seller", // Champ de correspondance dans la collection des produits
          foreignField: "_id", // Champ de correspondance dans la collection des vendeurs
          as: "vendorInfo", // Nom du tableau où les données des vendeurs seront ajoutées
        },
      },
      {
        // Étape 3 : Déstructurer le tableau vendorInfo pour obtenir un objet
        $unwind: "$vendorInfo",
      },
      {
        // Étape 4 : Regrouper les produits par catégorie
        $group: {
          _id: "$category", // Utiliser le champ `category` comme identifiant de groupe
          products: {
            $push: {
              name: "$name",
              id: "$_id",
              category: "$category",
              price: "$price",
              description: "$description",
              quantity: "$quantity",
              images: "$images",
              seller: {
                _id: "$seller",
                name: "$vendorInfo.companyName",
                profileImagePath: "$vendorInfo.profileImagePath",
              },
              dateAdded: "$dateAdded",
            },
          },
        },
      },
      {
        // Étape 5 : Limiter chaque groupe de produits à trois éléments maximum
        $project: {
          _id: 0, // Exclure le champ `_id` du résultat
          category: "$_id", // Renommer `_id` en `category` pour plus de clarté
          products: { $slice: ["$products", 3] }, // Prendre les trois premiers produits du tableau
        },
      },
    ]);

    categories = categories.reverse();

    // Envoyer le résultat sous forme de JSON
    res.json(categories);
  } catch (error) {
    // Gérer les erreurs et envoyer une réponse d'erreur
    console.error("Erreur lors de la récupération du catalogue :", error);
    res.status(500).json({
      error: "Une erreur est survenue lors de la récupération du catalogue.",
    });
  }
};

// Fonction pour recupérer le nombre de commentaire
exports.numberComment = async (req, res) => {
  const { id } = req.body;
  const comment = await ProductComment.find({
    productId: id,
    parentCommentId: null,
  });

  const commentObjet = {
    comment: comment.length,
    id: req.body,
  };

  res.json({ commentObjet });
};

// Fonction pour recupérer les informations de l'utilisateur
exports.userinfo = async (req, res) => {
  // variable pour contenir les informations de l'utilisateur
  let infoUser = "";

  //récupérationde l'id
  const { id } = req.body;

  // Rechercher l'id dans le modèle user (acheteur)
  infoUser = await User.findById(id);

  // Rechercher l'id dans le modèle Vendor (vendeur)
  if (infoUser === null) {
    infoUser = await Vendor.findById(id).select("--password");
  }

  res.json({ infoUser: infoUser });
};

// Supprimer un commentaire (remplacement par un message de suppression)
exports.commentDelete = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Vérifiez si un utilisateur ou un vendeur est connecté
    const userId = req.session.user ? req.session.user._id : null;
    const vendorId = req.session.vendor ? req.session.vendor._id : null;

    if (!userId && !vendorId) {
      return res.status(403).json({
        message: "Vous devez être connecté pour effectuer cette action.",
      });
    }

    // Rechercher le commentaire
    const comment = await ProductComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Commentaire introuvable." });
    }

    // Vérifiez si l'utilisateur ou le vendeur correspond à l'auteur du commentaire
    if (comment.userId.toString() !== (userId || vendorId)) {
      return res.status(403).json({
        message: "Vous n'avez pas la permission de supprimer ce commentaire.",
      });
    }

    // Mettre à jour le commentaire pour indiquer qu'il a été supprimé
    comment.content = "Ce commentaire a été supprimé.";
    comment.isDeleted = true;
    comment.deletedAt = new Date(); // Enregistrer la date de suppression (optionnel)
    await comment.save();

    return res.status(200).json({ message: "ok" });
  } catch (error) {
    console.error("Erreur lors de la suppression du commentaire :", error);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

// // Supprimer un commentaire
// exports.commentDelete = async (req, res) => {
//   try {
//     const { commentId } = req.params;

//     // Vérifiez si un utilisateur ou un vendeur est connecté
//     const userId = req.session.user ? req.session.user._id : null;
//     const vendorId = req.session.vendor ? req.session.vendor._id : null;

//     if (!userId && !vendorId) {
//       return res.status(403).json({
//         message: "Vous devez être connecté pour effectuer cette action.",
//       });
//     }

//     // Rechercher le commentaire
//     const comment = await ProductComment.findById(commentId);
//     if (!comment) {
//       return res.status(404).json({ message: "Commentaire introuvable." });
//     }

//     // Vérifiez si l'utilisateur ou le vendeur correspond à l'auteur du commentaire
//     if (comment.userId.toString() !== (userId || vendorId)) {
//       return res.status(403).json({
//         message: "Vous n'avez pas la permission de supprimer ce commentaire.",
//       });
//     }

//     // Supprimer le commentaire
//     await ProductComment.findByIdAndDelete(commentId);

//     return res
//       .status(200)
//       .json({ message: "Commentaire supprimé avec succès." });
//   } catch (error) {
//     console.error("Erreur lors de la suppression du commentaire :", error);
//     return res.status(500).json({ message: "Erreur interne du serveur." });
//   }
// };

// Route API pour obtenir les produits du vendeur
exports.apiProductDetail = async (req, res) => {
  const { categoryDetail, page = 1 } = req.body; // Récupère la catégorie et la page depuis la requête
  console.log(req.body);
  const ITEMS_PER_PAGE = 5; // Nombre de produits par page

  try {
    let filter = {};

    // Vérification et normalisation de la catégorie
    if (categoryDetail && categoryDetail !== "all") {
      const categoriesMap = {
        électronique: "Électronique",
        alimentation: "Alimentation",
        vêtements: "Vêtements",
      };
      filter.category =
        categoriesMap[categoryDetail.toLowerCase()] || categoryDetail;
    }

    // Compte total des produits pour la catégorie
    const totalProducts = await Product.countDocuments(filter);

    // Récupération des produits pour la page actuelle
    const products = await Product.find(filter)
      .sort({ dateAdded: -1 }) // Tri par date décroissant
      .skip((page - 1) * ITEMS_PER_PAGE) // Produits à sauter pour atteindre la page
      .limit(ITEMS_PER_PAGE); // Limitation au nombre de produits par page

    // Enrichir les produits avec les informations utilisateur/vendeur
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const user =
          (await User.findById(product.seller)) ||
          (await Vendor.findById(product.seller));
        if (user) {
          product.infoUser = {
            userId: product.seller,
            username: user.username || user.companyName,
            profileImagePath: user.profileImagePath,
          };
        }
        return product;
      })
    );

    // Calculer s'il y a encore d'autres produits
    const hasMore = page * ITEMS_PER_PAGE < totalProducts;

    // Retourner la réponse au client
    res.json({
      products: enrichedProducts,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / ITEMS_PER_PAGE), // Calcul total de pages
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const uploadDirMessage = path.join(__dirname, "..", "uploads", "messages");

// Configure multer pour stockage en mémoire
const storageMessage = multer.memoryStorage();
const uploadMessage = multer({
  storage: storageVendor,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max par fichier
}).array("images", 5); // Limite de 5 fichiers

// Fonction pour recevoir les messages et fichiers
exports.uploadChat = async (req, res) => {
  uploadMessage(req, res, async function (err) {
    if (err) {
      console.log(err.message);
      return res.status(500).json({
        message: "Erreur lors du téléchargement",
        error: err.message,
      });
    }

    const { message } = req.body; // Message texte envoyé par le client
    const { recipient } = req.body; //

    // Valider si le message texte ou au moins une image est présent
    if (!message && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        message: "Veuillez envoyer un message ou au moins une image.",
      });
    }

    try {
      // Créer un tableau de chemins pour les images traitées
      const images = await Promise.all(
        req.files.map(async (file, index) => {
          const filename = `image_${Date.now()}_${index}.jpg`;
          const filePath = path.join(uploadDirMessage, filename);

          // Traiter l'image avec sharp
          const processedImageBuffer = await sharp(file.buffer)
            .resize({ width: 320, height: 280 }) // Redimensionner
            .jpeg({ quality: 70 }) // Compression
            .toBuffer();

          // Enregistrer le fichier traité sur le disque
          fs.writeFileSync(filePath, processedImageBuffer);

          return {
            path: `/messages/${path.basename(filename)}`,
            contentType: "image/jpeg",
          };
        })
      );

      // Recherche de la session
      const userId = req.session.user?._id || req.session.vendor?._id;

      console.log("userId", userId);
      // Rechercher le nom et le chemin de l'image de l'utilisateur
      const user =
        (await User.findById(userId)) || (await Vendor.findById(userId));

      // Créer un objet pour sauvegarder le message et les images
      const savedMessage = new Message({
        sender: userId,
        recipient: recipient,
        content: message || null,
        images,
        timestamp: new Date(),
      });

      await savedMessage.save();

      res.json({
        message: "Message et images reçus avec succès !",
        data: savedMessage,
      });
    } catch (err) {
      console.error("Erreur lors du traitement :", err);
      res
        .status(500)
        .json({ message: "Erreur lors du traitement des données" });
    }
  });
};

exports.recuperChat = async (req, res) => {
  // Endpoint pour récupérer les messages
  try {
    const senderId = req.session.user?._id || req.session?.vendor?._id;
    const { productId, recipientId } = req.body;

    // Validation des paramètres
    if (!productId || !senderId || !recipientId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Rechercher les messages liés dans la base de données
    const messages = await Message.find({
      productId,
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
    }).sort({ timestamp: 1 }); // Trie par ordre chronologique

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.numbreNotifListChat = async (req, res) => {
  const currentUserId = req.session.user?._id || req.session.vendor?._id;

  if (!currentUserId) return;

  const { sender, productId } = req.body;
  try {
    const allNotif = await Message.find({
      sender: sender, // Expéditeur des messages
      recipient: currentUserId, // Destinataire (l'utilisateur connecté)
      productId: productId, // Produit concerné
      unread: true, // Seulement les messages non lus
    });

    res.json({
      nombreNotif: allNotif.length,
      identif: {
        sender,
        productId,
      },
    });
  } catch (err) {
    console.error("Erreur lors de la récupération de notification", err);
  }
};

exports.listNoir = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.vendor?._id;
    const { otherUser } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    if (!otherUser) {
      return res
        .status(400)
        .json({ error: "ID de l'utilisateur à bloquer manquant" });
    }

    // Trouver l'utilisateur connecté
    const findUserSession =
      (await User.findById(userId)) || (await Vendor.findById(userId));

    if (!findUserSession) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Vérifier si `otherUser` est déjà dans `listNoir`
    const index = findUserSession.listNoir.findIndex(
      (idUser) => idUser.userId.toString() === otherUser
    );

    if (index !== -1) {
      // Supprimer l'utilisateur de la liste noire
      findUserSession.listNoir.splice(index, 1);
    } else {
      // Ajouter l'utilisateur à la liste noire
      findUserSession.listNoir.push({ userId: otherUser });
    }

    // Sauvegarder les changements
    await findUserSession.save();

    return res.status(200).json({
      message:
        index !== -1
          ? "Utilisateur retiré de la liste noire"
          : "Utilisateur ajouté à la liste noire",
    });
  } catch (error) {
    console.error("Erreur dans listNoir:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

/**
 * API pour "supprimer" un commentaire en le marquant comme supprimé.
 * @param {Object} req - La requête Express
 * @param {Object} res - La réponse Express
 */
exports.deleteMessage = async (req, res) => {
  const currentUserId = req.session.user?._id || req.session.vendor?._id; // Utilisateur actuel
  const { messageId } = req.body; // ID du message à supprimer

  // Vérifier si toutes les données nécessaires sont présentes
  if (!currentUserId || !messageId) {
    return res.status(400).json({
      success: false,
      error: "Données manquantes. Assurez-vous d'envoyer messageId.",
    });
  }

  try {
    // Trouver le message par ID
    const message = await Message.findById(messageId);

    // Vérifier si le message existe
    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message introuvable.",
      });
    }

    // Vérifier si l'utilisateur est soit l'expéditeur soit le destinataire

    if (
      message.sender.toString() !== currentUserId 
    ) {
      return res.status(403).json({
        success: false,
        error: "Vous n'avez pas la permission de supprimer ce commentaire.",
      });
    }

    if (message.isDelete){
      return res.status(403).json({
        success: false,
        error: "Ce message est déjà supprimé",
      });
    }

    console.log('Attente avant de passé')
    // Mettre à jour le contenu pour indiquer qu'il a été supprimé
    message.content = "Ce commentaire a été supprimé.";
    message.images = []; // Supprimer les images associées
    message.audios = []; // Supprimer les audios associés
    message.isDelete = true
    await message.save();

    // Répondre avec succès
    return res.status(200).json({
      success: true,
      message: "Commentaire supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du commentaire :", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression du commentaire.",
    });
  }
};

// Créer un répertoire de sauvegarde s'il n'existe pas
if (!fs.existsSync(uploadDirMessage)) {
  fs.mkdirSync(uploadDirMessage, { recursive: true });
}

// exports.apiProductDetail = async (req, res) => {
//   // const sessionUser = req.session.user || req.session.vendor
//   let categoryDetail = req.body.categoryDetail;
//   console.log(categoryDetail);

//   let userId, username, profileImagePath, products;

//   if (categoryDetail == "électronique") {
//     categoryDetail = "Électronique";
//   }
//   if (categoryDetail == "alimentation") {
//     categoryDetail = "Alimentation";
//   }
//   if (categoryDetail == "vêtements") {
//     categoryDetail = "Vêtements";
//   }

//   try {

//     if (categoryDetail == "all"){
//         // Récupérer les produits et les trier par `dateAdded` (les plus récents en premier)
//         products = await Product.find({})
//           .sort({ dateAdded: -1 })
//           .limit(10); // -1 pour ordre décroissant

//         }else{
//         // Récupérer les produits et les trier par `dateAdded` (les plus récents en premier)
//         products = await Product.find({
//           category: categoryDetail,
//         })
//           .sort({ dateAdded: -1 })
//           .limit(5); // -1 pour ordre décroissant

//       }

//     products = await Promise.all(
//       products.map(async (product) => {
//         userId = product.seller;
//         const userIdent = await User.findById(userId);
//         if (userIdent) {
//           username = userIdent.username;
//           profileImagePath = userIdent.profileImagePath;
//         } else {
//           const vendorIdent = await Vendor.findById(userId);
//           username = vendorIdent.companyName;
//           profileImagePath = vendorIdent.profileImagePath;
//         }

//         product.infoUser = { userId, username, profileImagePath };

//         return product;
//       })
//     );

//     res.json(products);
//   } catch (error) {
//     console.error("Erreur lors de la récupération des produits:", error);
//     res.status(500).json({ message: "Erreur serveur" });
//   }
// };
