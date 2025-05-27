const apiUrl = "https://sheetdb.io/api/v1/5eqyomzhep4j3";


const algodaoContainer = document.getElementById("algodao-container");
const pimaContainer = document.getElementById("pima-container");


const cartButton = document.getElementById("cart-button");
const cartSidebar = document.getElementById("cart-sidebar");
const closeCartButton = document.getElementById("close-cart");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");


const productModal = document.getElementById("product-modal");
const closeModal = document.querySelector(".close-modal");
const modalMainImage = document.getElementById("modal-main-image");
const thumbnailsContainer = document.getElementById("thumbnails");
const modalProductName = document.getElementById("modal-product-name");
const modalColorSelect = document.getElementById("modal-color-select");
const modalSizeSelect = document.getElementById("modal-size-select");
const modalAddToCart = document.getElementById("modal-add-to-cart");


let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentProduct = null;
let allProducts = [];


function formatText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, function (a) {
      return a.toUpperCase();
    })
    .replace(/100% Algodao/gi, "100% Algodão")
    .replace(/Cotton Pima/gi, "Cotton Pima");
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function loadProducts() {
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erro ao carregar os dados");
      }
      return response.json();
    })
    .then((data) => {
      allProducts = data;
      data.sort((a, b) => a.nome.localeCompare(b.nome));

      data.forEach((item) => {
        createProductCard(item);
      });

      updateCart();
    })
    .catch((error) => {
      console.error("Erro ao carregar os dados:", error);
      showError("Erro ao carregar produtos. Por favor, recarregue a página.");
    });
}


function createProductCard(item) {
  const card = document.createElement("div");
  card.classList.add("card");


  card.dataset.malha = item.malha.toLowerCase().includes("pima") ? "pima" : "algodao";


  const corSelect = document.createElement("select");
  corSelect.id = `cor-${item.id}`;
  corSelect.classList.add("product-select");
  item.cor.split(",").forEach((cor) => {
    const option = document.createElement("option");
    option.value = cor.trim();
    option.textContent = formatText(cor.trim());
    corSelect.appendChild(option);
  });


  const tamanhoSelect = document.createElement("select");
  tamanhoSelect.id = `tamanho-${item.id}`;
  tamanhoSelect.classList.add("product-select");
  item.tamanho.split(",").forEach((tam) => {
    const option = document.createElement("option");
    option.value = tam.trim();
    option.textContent = tam.trim().toUpperCase();
    tamanhoSelect.appendChild(option);
  });


  card.innerHTML = `
    <div class="image-container">
      <img src="${item.imagem}" alt="${item.nome}" loading="lazy" class="product-image" 
           onerror="this.src='https://placehold.co/300x400?text=Imagem+Indisponível'">
    </div>
    <h3>${formatText(item.nome)}</h3>
  `;


  const selectContainer = document.createElement("div");
  selectContainer.classList.add("select-container");

  const labelCor = document.createElement("label");
  labelCor.textContent = "Cor: ";
  labelCor.htmlFor = `cor-${item.id}`;
  labelCor.appendChild(corSelect);

  const labelTamanho = document.createElement("label");
  labelTamanho.textContent = "Tamanho: ";
  labelTamanho.htmlFor = `tamanho-${item.id}`;
  labelTamanho.appendChild(tamanhoSelect);

  selectContainer.appendChild(labelCor);
  selectContainer.appendChild(labelTamanho);
  card.appendChild(selectContainer);

  const addButton = document.createElement("button");
  addButton.classList.add("add-to-cart");
  addButton.textContent = "Adicionar ao Carrinho";
  addButton.type = "button";

  addButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const card = e.target.closest('.card');
    const malhaType = card.dataset.malha === "pima" ? "Cotton Pima" : "100% Algodão";

    addToCart({
      id: item.id,
      nome: item.nome,
      cor: corSelect.value,
      tamanho: tamanhoSelect.value,
      imagem: item.imagem,
      malha: malhaType
    });
  });

  card.appendChild(addButton);


  const productImage = card.querySelector(".product-image");
  productImage.style.cursor = "pointer";

  productImage.addEventListener("click", (e) => {
    e.stopPropagation();
    openProductModal(item);
  });

  if (item.malha.toLowerCase().includes("pima")) {
    pimaContainer.appendChild(card);
  } else {
    algodaoContainer.appendChild(card);
  }
}


function openProductModal(product) {
  currentProduct = product;


  modalProductName.textContent = formatText(product.nome);
  modalMainImage.src = product.imagem;
  modalMainImage.onerror = function () {
  this.src = "https://placehold.co/600x800?text=Imagem+Indisponível";
};



  modalColorSelect.innerHTML = "";
  product.cor.split(",").forEach((cor) => {
    const option = document.createElement("option");
    option.value = cor.trim();
    option.textContent = formatText(cor.trim());
    modalColorSelect.appendChild(option);
  });

  modalSizeSelect.innerHTML = "";
  product.tamanho.split(",").forEach((tam) => {
    const option = document.createElement("option");
    option.value = tam.trim();
    option.textContent = tam.trim().toUpperCase();
    modalSizeSelect.appendChild(option);
  });


  thumbnailsContainer.innerHTML = "";

  let additionalImages = [];
  if (product["outras-duas-fotos"] && product["outras-duas-fotos"].trim() !== "") {
    additionalImages = product["outras-duas-fotos"].split(",").map((img) => img.trim());
  }


  [product.imagem, ...additionalImages].forEach((img, index) => {
    if (!img || img.trim() === "") return;

    const thumbnail = document.createElement("div");
    thumbnail.classList.add("thumbnail");
    if (index === 0) thumbnail.classList.add("active");

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = img;
    thumbnailImg.alt = `Thumbnail ${index + 1}`;
    thumbnailImg.onerror = function () {
  this.src = "https://placehold.co/100x100?text=Indisponível";
};


    thumbnail.appendChild(thumbnailImg);

    thumbnail.addEventListener("click", () => {
      modalMainImage.src = img;
      document.querySelectorAll(".thumbnail").forEach((t) => t.classList.remove("active"));
      thumbnail.classList.add("active");
    });

    thumbnailsContainer.appendChild(thumbnail);
  });


  productModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}


function addToCart(item) {

  const existingItemIndex = cart.findIndex(
    cartItem =>
      cartItem.nome === item.nome &&
      cartItem.cor === item.cor &&
      cartItem.tamanho === item.tamanho &&
      cartItem.malha === item.malha
  );

  if (existingItemIndex >= 0) {

    cart[existingItemIndex].quantidade += 1;
    showNotification(`+1 ${formatText(item.nome)} no carrinho`);
  } else {

    const newItem = {
      ...item,
      quantidade: 1,
    };
    cart.push(newItem);
    showNotification(`${formatText(item.nome)} adicionado ao carrinho`);
  }

  saveCart();
  updateCart();
}


function updateCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
    cartCount.textContent = "0";
    document.getElementById("total-items").textContent = "Total de itens: 0";
    document.getElementById("whatsapp-button").disabled = true;
    document.getElementById("cart-message").style.display = "none";
    return;
  }


  cartItemsContainer.innerHTML = '';


  cart.forEach((item, index) => {
    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");
    cartItem.dataset.index = index;

    const malhaText = item.malha === "Cotton Pima" ? "Cotton Pima" : "100% Algodão";

    cartItem.innerHTML = `
    <div class="cart-item-image">
        <img src="${item.imagem}" alt="${item.nome}" loading="lazy">
    </div>
    <div class="cart-item-details">
        <p class="cart-item-title">${formatText(item.nome)}</p>
        <p class="cart-item-malha">${malhaText}</p>
        <p class="cart-item-variants">${formatText(item.cor)} - ${item.tamanho.toUpperCase()}</p>
        <div class="quantity-controls">
            <button class="decrease-quantity" data-index="${index}">−</button>
            <span class="quantity">${item.quantidade || 1}</span>
            <button class="increase-quantity" data-index="${index}">+</button>
        </div>
    </div>
    <button class="remove-item" data-index="${index}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    </button>
`;

    cartItemsContainer.appendChild(cartItem);
  });


  setupCartItemEvents();


  updateCartTotals();
}

function sendWhatsAppOrder() {
  const totalItems = cart.reduce((total, item) => total + (item.quantidade || 1), 0);

  if (totalItems < 5) {
    showError("Pedido mínimo não atingido (mínimo 5 itens)");
    return;
  }

  let message = "Olá, gostaria de fazer um pedido com os seguintes itens:\n\n";

  cart.forEach((item) => {
    const malhaText = item.malha.toLowerCase().includes("pima") ? "Cotton Pima" : "100% Algodão";
    message += `${formatText(item.nome)} (${formatText(item.cor)}, ${item.tamanho.toUpperCase()}) - ${malhaText} - Quantidade: ${item.quantidade || 1}\n`;
  });

  message += `\nTotal de itens: ${totalItems}`;

  const encodedMessage = encodeURIComponent(message);
  const phoneNumber = "32998301714";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
}


function setupCartItemEvents() {

  document.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = e.currentTarget.getAttribute("data-index");
      removeFromCart(index);
    });
  });


  document.querySelectorAll(".decrease-quantity").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = e.currentTarget.getAttribute("data-index");
      updateQuantity(index, -1);
    });
  });


  document.querySelectorAll(".increase-quantity").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = e.currentTarget.getAttribute("data-index");
      updateQuantity(index, 1);
    });
  });
}



function updateQuantity(index, change) {

  index = parseInt(index);


  if (isNaN(index) || index < 0 || index >= cart.length) {
    console.error('Índice inválido:', index);
    return;
  }


  if (!cart[index].quantidade) {
    cart[index].quantidade = 1;
  }

  const newQuantity = cart[index].quantidade + change;


  cart[index].quantidade = Math.max(1, newQuantity);

  saveCart();


  const quantityElement = document.querySelector(`.cart-item[data-index="${index}"] .quantity`);
  if (quantityElement) {
    quantityElement.textContent = cart[index].quantidade;
  }


  updateCartTotals();
}


function updateCartTotals() {
  const totalItems = cart.reduce((total, item) => total + (item.quantidade || 1), 0);
  cartCount.textContent = totalItems.toString();
  document.getElementById("total-items").textContent = `Total de itens: ${totalItems}`;

  const whatsappButton = document.getElementById("whatsapp-button");
  whatsappButton.disabled = totalItems < 5;

  const cartMessage = document.getElementById("cart-message");
  if (totalItems < 5) {
    const itemsNeeded = 5 - totalItems;
    cartMessage.textContent = `Você adicionou ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}. Adicione mais ${itemsNeeded} para finalizar o pedido.`;
    cartMessage.style.display = "block";
  } else {
    cartMessage.style.display = "none";
  }
}

function removeFromCart(index) {
  const removedItem = cart[index];
  cart.splice(index, 1);
  saveCart();
  updateCart();
  showNotification(`${formatText(removedItem.nome)} removido do carrinho`);
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.classList.add("notification");
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

function showError(message) {
  const error = document.createElement("div");
  error.classList.add("error-message");
  error.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(error);

  setTimeout(() => {
    error.classList.add("show");
  }, 10);

  setTimeout(() => {
    error.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(error);
    }, 300);
  }, 5000);
}


cartButton.addEventListener("click", () => {
  cartSidebar.classList.remove("hidden");
  document.body.style.overflow = "hidden";
});

document.getElementById('whatsapp-button').addEventListener('click', function (e) {
  e.preventDefault();
  sendWhatsAppOrder();
});

closeCartButton.addEventListener("click", () => {
  cartSidebar.classList.add("hidden");
  document.body.style.overflow = "auto";
});

document.addEventListener("click", (event) => {
  if (!cartSidebar.contains(event.target) && event.target !== cartButton) {
    cartSidebar.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
});

closeModal.addEventListener("click", () => {
  productModal.classList.add("hidden");
  document.body.style.overflow = "auto";
});

modalAddToCart.addEventListener("click", () => {
  if (!currentProduct) return;

  const card = document.querySelector(`.card[data-id="${currentProduct.id}"]`);
  const malhaType = card ? card.dataset.malha === "pima" ? "Cotton Pima" : "100% Algodão" : currentProduct.malha;

  addToCart({
    id: currentProduct.id,
    nome: currentProduct.nome,
    cor: modalColorSelect.value,
    tamanho: modalSizeSelect.value,
    imagem: modalMainImage.src,
    malha: malhaType
  });

  productModal.classList.add("hidden");
  document.body.style.overflow = "auto";
});

productModal.addEventListener("click", (e) => {
  if (e.target === productModal) {
    productModal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
});


document.addEventListener('DOMContentLoaded', function () {

  document.getElementById('year').textContent = new Date().getFullYear();


  const backToTopButton = document.getElementById('back-to-top');

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopButton.classList.add('visible');
    } else {
      backToTopButton.classList.remove('visible');
    }
  });

  backToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });


  const malhaFilter = document.getElementById('malha-filter');
  const searchFilter = document.getElementById('search-filter');

  function filterProducts() {
    const selectedMalha = malhaFilter.value;
    const searchTerm = searchFilter.value.toLowerCase();


    document.getElementById('algodao-section').style.display = 'none';
    document.getElementById('algodao-container').style.display = 'none';
    document.getElementById('pima-section').style.display = 'none';
    document.getElementById('pima-container').style.display = 'none';


    if (selectedMalha === 'all') {
      document.getElementById('algodao-section').style.display = 'block';
      document.getElementById('algodao-container').style.display = 'grid';
      document.getElementById('pima-section').style.display = 'block';
      document.getElementById('pima-container').style.display = 'grid';
    } else if (selectedMalha === 'algodao') {
      document.getElementById('algodao-section').style.display = 'block';
      document.getElementById('algodao-container').style.display = 'grid';
    } else if (selectedMalha === 'pima') {
      document.getElementById('pima-section').style.display = 'block';
      document.getElementById('pima-container').style.display = 'grid';
    }


    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
      const cardTitle = card.querySelector('h3').textContent.toLowerCase();
      const cardVisible = cardTitle.includes(searchTerm);

      card.style.display = cardVisible ? 'block' : 'none';
    });


    if (searchTerm) {
      document.getElementById('algodao-section').style.display = 'block';
      document.getElementById('pima-section').style.display = 'block';
    }
  }

  malhaFilter.addEventListener('change', () => {
    filterProducts();

    if (malhaFilter.value === 'algodao') {
      document.getElementById('algodao-section').scrollIntoView({ behavior: 'smooth' });
    } else if (malhaFilter.value === 'pima') {
      document.getElementById('pima-section').scrollIntoView({ behavior: 'smooth' });
    }
  });

  searchFilter.addEventListener('input', filterProducts);

  if (typeof loadProducts === 'function') {
    loadProducts();
  }
});

window.removeFromCart = removeFromCart;

const backToTopButton = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopButton.classList.add('visible');
  } else {
    backToTopButton.classList.remove('visible');
  }
});

backToTopButton.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});