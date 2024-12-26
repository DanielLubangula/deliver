const socket = io();

let map2 = new Map();
let utilisateurId = "";

map2.set("1",{{{json vendor}}})
map2.set("2",{{{json user}}})

map2.forEach((value, key) => {
  if (value) {
    utilisateurId = value._id;
  }
});

// Simulation de l'objet produit transmis depuis Handlebars
const product = {{{json product}}};

// Fonction pour afficher les données du produit
function displayProduct(product) {
  console.log(product);
  const productContainer = document.getElementById("product-container");

  productContainer.innerHTML = `
    <div class="product-image">
      <div class="product-images">
        ${product.images
          .map(
            (image, index) =>
              `<img src="${image.path}" alt="Image ${index + 1}">`
          )
          .join("")}
      </div>

     <div class="image-nav">
    <!-- Les boutons de navigation seront générés par JavaScript -->
    ${product.images
      .map(
        (image, index) => `
        <button 
        src="${image.path}" 
        alt="Image ${index + 1}" 
        class="${index === 0 ? "active" : ""}">
        </button>
    `
      )
      .join("")}
    </div>

      <button data-productId="${
        product.id
      }" data-isClick="yes" class="favorite-button">♡ <span class="like-count">0</span></button>
    </div>
    <div class="product-info">
      <h1 class="product-title">${product.name}</h1>
      <div class="product-price">${product.price}€</div>

      <div class="seller-info">
            <div class="seller-avatar">
                <img class="seller-avatar" src="${
                  product.seller.profileImagePath
                }" />
            </div>
                <div>
                <div>Store didi</div>
                    <div class="rating">★★★★★ <span style="color: #666">(5)</span></div>
                </div>
        </div>


      <div class="seller-info">
        <div><strong>Vendeur :</strong> ${
          product.seller.companyName || "Inconnu"
        }</div>
        <div><strong>Adresse :</strong> ${product.seller.companyAddress}</div>
        <div><strong>Téléphone :</strong> ${product.seller.phone}</div>
      </div>

      <p class="product-description">${
        product.description || "Aucune description disponible."
      }</p>
      <button class="action-button">
        <a href="/deliver/chat/${product.seller._id}/${
    product.id
  }">Discuter avec le vendeur</a>
      </button>

      <div class="comment-section">
                <button class="toggle-comments" data-product-id="${product.id}">
                    Afficher les commentaires
                    <span class="text-sm text-gray-600 nbrComment" data-nbrcomment="${
                      product.id
                    }"></span>
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="comments-container">
                    <div class="comment">
                        <strong>Alice</strong>: Excellent vendeur, produit conforme à la description !
                    </div>
                    <div class="comment">
                        <strong>Bob</strong>: Très satisfait de mon achat, livraison rapide.
                    </div>
                </div>
            </div>
    </div>
  `;

  setInterval(function () {
    fetch("/deliver/api/numberComment/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: product.id }),
    })
      .then((response) => response.json())
      .then((data) => {
        //console.log('Réponse du serveur:', data.commentObjet)
        document.querySelector(
          `[data-nbrcomment="${data.commentObjet.id.id}"]`
        ).innerHTML = `(${data.commentObjet.comment})`;
      })
      .catch((error) => console.error("Erreur:", error));
  }, 5000);

  // Envoyer une demande pour obtenir les likes d'un produit
  function getLikedProduct(productId) {
    socket.emit("likedProduct", { productId }); // Envoie l'ID du produit au serveur
  }

  socket.on("likedProductResponse", (data) => {
    console.log(data);

    // Mise à jour du nombre de likes sur l'élément correspondant
    const val = data.numberlike;
    const elementBalise = data.productId;
    const me = data.me;

    if (me === "yes") {
      document.querySelector(".favorite-button").childNodes[0].textContent =
        "♥";
      document.querySelector(".favorite-button").style.color = "#ff4444";
      likeCount++;

      document
        .querySelector(".favorite-button")
        .setAttribute("data-isClick", "no");
    }

    console.log(val);
    document.querySelector(`.like-count`).innerHTML = val;
  });

  getLikedProduct(product.id); // Pour obtenir les likes actuels
}

// Appeler la fonction pour afficher les données
displayProduct(product);

const productImages = document.querySelector(".product-images");
const navButtons = document.querySelectorAll(".image-nav button");
let currentImage = 0;
const totalImages = 3;

// Fonction pour mettre à jour la position des images
function updateImagePosition(index) {
  productImages.style.transform = `translateX(-${index * 33.333}%)`;
  navButtons.forEach((btn) => btn.classList.remove("active"));
  navButtons[index].classList.add("active");
  currentImage = index;
}

// Gestionnaire de défilement horizontal
let touchStartX = 0;
let touchEndX = 0;

productImages.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

productImages.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0 && currentImage < totalImages - 1) {
      // Swipe gauche
      updateImagePosition(currentImage + 1);
    } else if (diff < 0 && currentImage > 0) {
      // Swipe droite
      updateImagePosition(currentImage - 1);
    }
  }
}

// Navigation par boutons
navButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    updateImagePosition(index);
  });
});

// Gestion du défilement de la molette
productImages.parentElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY > 0 && currentImage < totalImages - 1) {
    updateImagePosition(currentImage + 1);
  } else if (e.deltaY < 0 && currentImage > 0) {
    updateImagePosition(currentImage - 1);
  }
});

// Gestion des favoris
const favoriteButton = document.querySelector(".favorite-button");
let likeCount = 0;
const likeCountSpan = document.querySelector(".like-count");

favoriteButton.addEventListener("click", function () {
  const heart = this.childNodes[0];
  const isClick = this.getAttribute("data-isClick");
  const productId = this.getAttribute("data-productId");

  socket.emit("updatelikedProduct", { productId }); // Envoie l'ID du produit pour mise à jour

  if (isClick === "yes") {
    heart.textContent = "♥";
    this.style.color = "#ff4444";

    this.setAttribute("data-isClick", "no");
  } else {
    heart.textContent = "♡";
    this.style.color = "#999";

    this.setAttribute("data-isClick", "yes");
  }
});

// Écouter la réponse de l'événement 'updateLikeResponse' pour mettre à jour le statut du like
socket.on("updateLikeResponse", (data) => {
  console.log(data);

  document.querySelector(".like-count").innerHTML = data.numberlike;

  //const likeButton = document.querySelector(`[data-like-product-button="${data.productId}"]`);
});

// Gestion des commentaires
const toggleButton = document.querySelector(".toggle-comments");
const commentsContainer = document.querySelector(".comments-container");
const toggleIcon = document.querySelector(".toggle-icon");

toggleButton.addEventListener("click", function () {
  commentsContainer.classList.toggle("visible");
  toggleIcon.textContent = commentsContainer.classList.contains("visible")
    ? "▲"
    : "▼";
  toggleButton.firstChild.textContent = commentsContainer.classList.contains(
    "visible"
  )
    ? "Masquer les commentaires "
    : "Afficher les commentaires ";

  if (commentsContainer.classList.contains("visible")) {
    socket.emit("loadComments", this.getAttribute("data-product-id"));
    document.querySelector(".comments-container").innerHTML = `
                 <div style="display: flex; align-items:center; justify-content:center">
                    <img style="width: 200px;" src="/images/spinner.gif" alt="">
                </div>
                 `;
  }
});

socket.on("commentsLoaded", (comments) => {
  if (comments.length === 0) {
    document.querySelector(".comments-container").innerHTML = `
                <div style="display: flex; align-items:center; justify-content:center">
                    <img style="width: 950px;" src="/images/nomsg.png" alt="">
                </div>
            `;
    return;
  }
  document.querySelector(".comments-container").innerHTML = "";
  comments.forEach((comment) => {
    displayComment(comment);
  });
});

function displayComment(comment) {
  console.log("comment", comment.isDeleted);

  const commentElement = document.createElement("div");
  const isAuthor = utilisateurId === comment.userId;
  const commentClass = isAuthor ? "own message" : "other message";

  //commentElement.classList.add('p-2');
  commentElement.innerHTML = `
    <div style="position : relative;  ${
      comment.isDeleted
        ? "border: 1px solid rgba(241, 1, 1, 0.281);background: rgba(230, 7, 7, 0.13);font-style : italic"
        : ""
    }" class="isComment bg-gray-50 p-3 rounded-lg ${commentClass}" id="comment-${
    comment._id
  }">
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2 mb-1">
                <img src="${comment.profileImagePath}" data-user="${
    comment.userId
  }" alt="User avatar" class="profile-pic" onclick="showUserInfo(this)" class="rounded-full">
                <span class="font-medium text-sm username" data-productId="${
                  comment.productId
                }" data-commentId="${comment._id}">${comment.username}</span>
            </div>
            <button data-commentId="${
              comment._id
            }" onclick="panneauReplyReset(this)" class="comment-actions-btn opacity-100 group-hover:opacity-100 transition-opacity">
                <svg class="w-5 h-5" style="height:20px" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="6" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="18" r="2"/>
                </svg>
            </button>
          <div style="z-index: 1001;top: 30px;right: 25px;height: 115px;overflow: scroll;" class="hidden comment-actions absolute right-0 top-8 bg-white shadow-lg rounded-lg z-10 py-1 w-32">
                <button class="reply-btn w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onclick="showReplyPreview(this)">Reply</button>
                <button class="report-btn w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500">Report</button>
                ${
                  isAuthor
                    ? `<button  class="delete-btn w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500" onclick="deleteComment('${comment._id}')">Delete</button>`
                    : ""
                }
          </div>
         </div>


        <p class="text-gray-600 text-sm messageTxt" style="text-align: left">${
          comment.comment
        }</p>
        <p class="created-at">${comment.formattedDate}</p>


    </div>
    ${
      comment.replies
        ? `<p class="respComment" data-open="false" data-commentId="${comment._id}" onclick="loadReplies(this,${comment.replies})">voir réponse(s) (${comment.replies})</p>`
        : ""
    }
    <div data-open="false" class="replies-section hidden repondre-${
      comment._id
    }" id="replies-${comment._id}">
      <div class="spinnerResp">
        <img style="width: 50px;" src="/images/spinner.gif" alt="">
      </div>
    </div>
`;
  document.querySelector(".comments-container").prepend(commentElement);
}

socket.on("noIdentifier", (res) => {
  // Retirer le style de "like"
  document.querySelector(".favorite-button").childNodes[0].textContent = "♡";
  document.querySelector(".favorite-button").style.color = "#999";

  document.querySelector(".favorite-button").setAttribute("data-isClick", "no");

  handleCommentSubmit();
});

function handleCommentSubmit(event) {
  const isLoggedIn = false; // À remplacer par votre logique de vérification de connexion

  if (!isLoggedIn) {
    showLoginModal();
  } else {
    // Logique pour poster le commentaire
  }
}

/*********************** début User information commentaire *****************************/

function showUserInfo(info) {
  const id = info.getAttribute("data-user");
  const userModal = document.getElementById("userModal");
  const overlay = document.getElementById("overlay");
  const userInfo = document.getElementById("userInfo");
  userModal.style.display = "block";
  overlay.style.display = "block";
  // fetch
  fetch("/deliver/api/userinfo/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: id }),
  })
    .then((response) => response.json())
    .then((data) => {
      //console.log('Réponse du serveur:', data)

      // Réajuster le nom au cas où il s'agit d'un acheteur
      if (data.infoUser.companyName === undefined) {
        data.infoUser.companyName = data.infoUser.username;
      }

      let mois = [
        "",
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ];

      let date = data.infoUser.date.split("-");
      const numberMois = +date[1];

      date = mois[numberMois] + " " + date[0];

      userInfo.innerHTML = `
    <a href="${data.infoUser.profileImagePath}">
      <img style='margin: 0px auto' src="${data.infoUser.profileImagePath}" alt="Photo de profil de ${data.infoUser.companyName}">
    </a>
    <h2 style='font-weight : bold;'>${data.infoUser.companyName}</h2>
    <p>Passionné de technologie et amateur de bonnes affaires</p>
    <p>${data.infoUser.email}</p>
     <div class="user-stats">
        <div>
            <strong>0</strong>
            <div>Avis</div>
        </div>
        <div>
            <strong>${date}</strong>
            <div>Membre depuis</div>
        </div>
    </div>
    `;
    })
    .catch((error) => console.error("Erreur:", error));
}

// Fonction pour afficher le modal
function showLoginModal() {
  document.querySelector(".overlay").style.display = "block";
  //document.querySelector('.modal').style.display = 'block';
  document.body.style.overflow = "hidden"; // Empêche le défilement
}

// Fonction pour cacher le modal
function hideLoginModal() {
  document.querySelector(".overlay").style.display = "none";
  document.body.style.overflow = "auto"; // Réactive le défilement
}

// Gestionnaire d'événement pour le bouton de fermeture
document.querySelector(".close-btn").addEventListener("click", hideLoginModal);

function closeModal() {
  const overlay = document.querySelector(".overlay");
  overlay.style.display = "none";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("userModal").style.display = "none";
}

// Fermer la modal en cliquant sur l'overlay
document.querySelector(".overlay").addEventListener("click", closeModal);

// Fermer la modal avec la touche Escape
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeModal();
  }
});

// Panneau reponses, report
// Variable pour stocker le dernier panneau ouvert
let lastOpenedPanel = null;

function panneauReplyReset(infoBtn) {
  // Sélectionner le panneau correspondant au bouton cliqué
  const btnReplyReset = infoBtn.nextElementSibling;

  // Fermer le dernier panneau ouvert s'il est différent de celui-ci
  if (lastOpenedPanel && lastOpenedPanel !== btnReplyReset) {
    lastOpenedPanel.classList.add("hidden");
  }

  // Basculer la visibilité du panneau actuel
  btnReplyReset.classList.toggle("hidden");

  // Mettre à jour le dernier panneau ouvert
  lastOpenedPanel = btnReplyReset.classList.contains("hidden")
    ? null
    : btnReplyReset;
}

// Fermer tous les panneaux si on clique en dehors
document.addEventListener("click", function (event) {
  const isClickInside = event.target.closest(".isComment") !== null;

  if (!isClickInside && lastOpenedPanel) {
    lastOpenedPanel.classList.add("hidden");
    lastOpenedPanel = null;
  }
});
