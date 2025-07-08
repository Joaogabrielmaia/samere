const POLLING_INTERVAL = 30000;
const CACHE_BUSTING = true;

const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTr9dMI_98ezu15FSOXwqpDbrbiChtVx0yZMp7qxw9zVBR6vWSKQld7XbcuT7YqgRCUvTUyVTT2Wy70/pub?gid=0&single=true&output=csv';

const carouselCSVUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTd8LhduYPeYKQCRed1GnaWtRsr_9Zp_94d6tXPdKUNdlptSJ6oolNDWwON16Xk2kn7ee18BDzg0biK/pub?gid=0&single=true&output=csv';
let carouselSlides = [];
let currentSlideIndex = 0;
let carouselInterval;

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
const exitFullscreenBtn = document.getElementById("exit-fullscreen-btn");

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentProduct = null;
let allProducts = [];
let lastETag = null;
let lastModified = null;
let pollingIntervalId = null;

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

function csvToJson(csv) {
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  const result = [];
  
  if (lines.length === 0) return result;
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    let currentline = lines[i];
 
    const quotedParts = currentline.split('"');
    let processedParts = [];
    
    for (let j = 0; j < quotedParts.length; j++) {
      if (j % 2 === 0) {
        const parts = quotedParts[j].split(',');
        processedParts.push(...parts);
      } else {
        processedParts.push(quotedParts[j]);
      }
    }
    
    currentline = processedParts.map(item => item.trim()).filter(item => item !== '');
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = currentline[j] ? currentline[j].trim() : '';
      
      if (header === 'cor' || header === 'tamanho' || header === 'outras-duas-fotos') {
        const cleanedValue = value.replace(/^"+|"+$/g, '');
        obj[header] = cleanedValue.split(',').map(item => item.trim()).filter(item => item !== '');
      } else {
        obj[header] = value;
      }
    }
    
    if (obj.nome && obj.imagem) {
      result.push(obj);
    }
  }
  
  return result;
}

async function checkForUpdates() {
  try {
    const url = CACHE_BUSTING ? `${csvUrl}&t=${Date.now()}` : csvUrl;
    
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache'
    });
    
    const currentETag = response.headers.get('ETag');
    const currentModified = response.headers.get('Last-Modified');

    if ((!lastETag && !lastModified) || 
        (currentETag && currentETag !== lastETag) || 
        (currentModified && currentModified !== lastModified)) {
      
      lastETag = currentETag;
      lastModified = currentModified;
      
      await loadProducts();
      console.log('Dados atualizados com sucesso');
    }
  } catch (error) {
    console.error("Erro ao verificar atualizações:", error);
  }
}

async function loadProducts() {
    try {
        const url = CACHE_BUSTING ? `${csvUrl}&t=${Date.now()}` : csvUrl;
        
        const response = await fetch(url, {
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar os dados');
        }
        
        lastETag = response.headers.get('ETag');
        lastModified = response.headers.get('Last-Modified');
        
        const csvData = await response.text();
        const newProducts = csvToJson(csvData);

        if (JSON.stringify(newProducts) !== JSON.stringify(allProducts)) {
            allProducts = newProducts;
            console.log('Produtos atualizados:', allProducts);
            
            allProducts.sort((a, b) => a.nome.localeCompare(b.nome));

            algodaoContainer.innerHTML = '';
            pimaContainer.innerHTML = '';
            document.getElementById('dynamic-sections-container').innerHTML = '';

            const productsByMalha = groupProductsByMalha(allProducts);

            renderMalhaSections(productsByMalha);

            updateMalhaFilter(productsByMalha);
        }
        
        updateCart();
    } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        showError("Erro ao carregar produtos. Por favor, recarregue a página.");
    }
}

function groupProductsByMalha(products) {
    const groups = {
        "100% algodão": [],
        "cotton pima": [],
    };

    const malhaToSectionId = {
        "100% algodão": "algodao",
        "cotton pima": "pima"
    };
    
    products.forEach(product => {
        const malha = product.malha?.toLowerCase() || '';
        
        if (malha.includes('algodão') || malha.includes('algodao')) {
            groups["100% algodão"].push(product);
        } else if (malha.includes('pima')) {
            groups["cotton pima"].push(product);
        } else if (malha) {
            if (!groups[malha]) {
                groups[malha] = [];
                malhaToSectionId[malha] = malha.replace(/\s+/g, '-').toLowerCase();
            }
            groups[malha].push(product);
        }
    });
    
    return { groups, malhaToSectionId };
}

function renderMalhaSections({ groups, malhaToSectionId }) {
    renderMalhaSection("100% algodão", groups["100% algodão"], "algodao-container");
    renderMalhaSection("cotton pima", groups["cotton pima"], "pima-container");

    const dynamicContainer = document.getElementById('dynamic-sections-container');
    
    for (const [malha, products] of Object.entries(groups)) {
        if (malha === "100% algodão" || malha === "cotton pima") continue;
        
        if (products.length > 0) {
            const sectionId = `${malhaToSectionId[malha]}-section`;
            const containerId = `${malhaToSectionId[malha]}-container`;

            const sectionHTML = `
                <h2 id="${sectionId}" data-malha="${malhaToSectionId[malha]}">${products[0].marca || formatText(malha)}</h2>
                <div id="${containerId}" class="cards-container" data-malha="${malhaToSectionId[malha]}"></div>
            `;
            
            dynamicContainer.insertAdjacentHTML('beforeend', sectionHTML);

            renderMalhaSection(malha, products, containerId);
        }
    }
}

function renderMalhaSection(malha, products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    products.forEach(product => {
        createProductCard(product, container);
    });
}

function updateMalhaFilter({ groups }) {
    const malhaFilter = document.getElementById('malha-filter');

    malhaFilter.innerHTML = '<option value="all">Todas as Malhas</option>';

    for (const malha of Object.keys(groups)) {
        if (groups[malha].length > 0) {
            const option = document.createElement('option');
            option.value = malha === "100% algodão" ? "algodao" : 
                           malha === "cotton pima" ? "pima" : 
                           malha.replace(/\s+/g, '-').toLowerCase();
            option.textContent = malha === "100% algodão" ? "100% Algodão" : 
                                malha === "cotton pima" ? "Cotton Pima" : 
                                groups[malha][0].marca || formatText(malha);
            malhaFilter.appendChild(option);
        }
    }
}

function createProductCard(item, container = null) {
    if (!item.nome || !item.malha) {
        console.warn('Item inválido, ignorando:', item);
        return;
    }

    const card = document.createElement("div");
    card.classList.add("card");

    const malha = item.malha.toLowerCase();
    let malhaType = "dynamic";
    let malhaDisplayName = formatText(item.malha);
    
    if (malha.includes("algodão") || malha.includes("algodao")) {
        malhaType = "algodao";
        malhaDisplayName = "100% Algodão";
    } else if (malha.includes("pima")) {
        malhaType = "pima";
        malhaDisplayName = "Cotton Pima";
    } else {
        malhaType = malha.replace(/\s+/g, '-').toLowerCase();
        malhaDisplayName = item.marca || formatText(item.malha);
    }
    
    card.dataset.malha = malhaType;
    card.dataset.id = item.id || Math.random().toString(36).substr(2, 9);

    let cores = [];
    if (Array.isArray(item.cor)) {
        cores = item.cor;
    } else if (item.cor) {
        cores = item.cor.split(',').map(c => c.trim()).filter(c => c !== '');
    }
    if (cores.length === 0) cores = ['Não especificado'];

    let tamanhos = [];
    if (Array.isArray(item.tamanho)) {
        tamanhos = item.tamanho;
    } else if (item.tamanho) {
        tamanhos = item.tamanho.split(',').map(t => t.trim()).filter(t => t !== '');
    }
    if (tamanhos.length === 0) tamanhos = ['Único'];

    const imagemPrincipal = item.imagem || 'https://placehold.co/300x400?text=Imagem+Indisponível';

    card.innerHTML = `
        <div class="image-container">
            <img src="${imagemPrincipal}" alt="${item.nome}" loading="lazy" class="product-image"
                 onerror="this.src='https://placehold.co/300x400?text=Imagem+Indisponível'">
        </div>
        <div class="card-content">
            <h3>${formatText(item.nome)}</h3>
            <p class="product-malha">${malhaDisplayName}</p>
            <div class="select-container">
                <label>
                    Cor:
                    <select class="product-select color-select">
                        ${cores.map(cor => `<option value="${cor}">${formatText(cor)}</option>`).join('')}
                    </select>
                </label>
                <label>
                    Tamanho:
                    <select class="product-select size-select">
                        ${tamanhos.map(tam => `<option value="${tam}">${tam.toUpperCase()}</option>`).join('')}
                    </select>
                </label>
            </div>
            <button class="add-to-cart" type="button">Adicionar ao Carrinho</button>
        </div>
    `;

    const productImage = card.querySelector(".product-image");
    productImage.style.cursor = "pointer";
    productImage.addEventListener("click", (e) => {
        e.stopPropagation();
        openProductModal(item);
    });

    const addButton = card.querySelector(".add-to-cart");
    addButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const corSelect = card.querySelector(".color-select");
        const sizeSelect = card.querySelector(".size-select");
        
        addToCart({
            id: card.dataset.id,
            nome: item.nome,
            cor: corSelect.value,
            tamanho: sizeSelect.value,
            imagem: imagemPrincipal,
            malha: malhaDisplayName
        });
    });

    if (container) {
        container.appendChild(card);
    } else if (malhaType === "pima") {
        pimaContainer.appendChild(card);
    } else if (malhaType === "algodao") {
        algodaoContainer.appendChild(card);
    } else {
        const dynamicContainer = document.querySelector(`.cards-container[data-malha="${malhaType}"]`);
        if (dynamicContainer) {
            dynamicContainer.appendChild(card);
        } else {
            const dynamicSectionsContainer = document.getElementById('dynamic-sections-container');
            if (dynamicSectionsContainer) {
                const sectionId = `${malhaType}-section`;
                const containerId = `${malhaType}-container`;
                
                if (!document.getElementById(sectionId)) {
                    const sectionHTML = `
                        <h2 id="${sectionId}" data-malha="${malhaType}">${malhaDisplayName}</h2>
                        <div id="${containerId}" class="cards-container" data-malha="${malhaType}"></div>
                    `;
                    dynamicSectionsContainer.insertAdjacentHTML('beforeend', sectionHTML);
                }

                const newContainer = document.getElementById(containerId);
                if (newContainer) {
                    newContainer.appendChild(card);
                }
            }
        }
    }

    return card;
}

function openProductModal(product) {
  currentProduct = product;
  modalProductName.textContent = formatText(product.nome);
  modalMainImage.src = product.imagem || 'https://placehold.co/600x800?text=Imagem+Indisponível';
  modalMainImage.onerror = function() {
    this.src = "https://placehold.co/600x800?text=Imagem+Indisponível";
  };

  modalColorSelect.innerHTML = "";
  let cores = [];
  if (Array.isArray(product.cor)) {
    cores = product.cor;
  } else if (product.cor) {
    cores = product.cor.split(',').map(c => c.trim()).filter(c => c !== '');
  }
  if (cores.length === 0) cores = ['Não especificado'];
  
  cores.forEach((cor) => {
    const option = document.createElement("option");
    option.value = cor;
    option.textContent = formatText(cor);
    modalColorSelect.appendChild(option);
  });

  modalSizeSelect.innerHTML = "";
  let tamanhos = [];
  if (Array.isArray(product.tamanho)) {
    tamanhos = product.tamanho;
  } else if (product.tamanho) {
    tamanhos = product.tamanho.split(',').map(t => t.trim()).filter(t => t !== '');
  }
  if (tamanhos.length === 0) tamanhos = ['Único'];
  
  tamanhos.forEach((tam) => {
    const option = document.createElement("option");
    option.value = tam;
    option.textContent = tam.toUpperCase();
    modalSizeSelect.appendChild(option);
  });

  thumbnailsContainer.innerHTML = "";
  let additionalImages = [];
  if (product["outras-duas-fotos"]) {
    additionalImages = Array.isArray(product["outras-duas-fotos"]) ? 
      product["outras-duas-fotos"] : 
      product["outras-duas-fotos"].split(',').map(img => img.trim()).filter(img => img !== '');
  }

  const allImages = [product.imagem, ...additionalImages].filter(img => img && img.trim() !== '');
  if (allImages.length === 0) {
    allImages.push('https://placehold.co/600x800?text=Imagem+Indisponível');
  }

  allImages.forEach((img, index) => {
    const thumbnail = document.createElement("div");
    thumbnail.classList.add("thumbnail");
    if (index === 0) thumbnail.classList.add("active");

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = img;
    thumbnailImg.alt = `Thumbnail ${index + 1}`;
    thumbnailImg.onerror = function() {
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

  modalMainImage.addEventListener("click", () => {
    if (modalMainImage.requestFullscreen) {
      modalMainImage.requestFullscreen();
    } else if (modalMainImage.webkitRequestFullscreen) {
      modalMainImage.webkitRequestFullscreen();
    } else if (modalMainImage.msRequestFullscreen) {
      modalMainImage.msRequestFullscreen();
    }
  });
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
          <p class="car-item-malha">${malhaText}</p>
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

  updateCartTotals();
}

function sendWhatsAppOrder() {
  const totalItems = cart.reduce((total, item) => total + (item.quantidade || 1), 0);

  if (totalItems < 5) {
    showError("Pedido mínimo não atingido (mínimo 5 itens)");
    return;
  }

  let message = "Olá, gostaria de fazer um pedido com os seguintes itens:\n\n";

  const malhaCounts = {
    "algodao": 0,
    "pima": 0
  };

  cart.forEach((item) => {
    const malhaText = item.malha.toLowerCase().includes("pima") ? "Cotton Pima" : "100% Algodão";
    message += `${formatText(item.nome)} (${formatText(item.cor)}, ${item.tamanho.toUpperCase()}) - ${malhaText} - Quantidade: ${item.quantidade || 1}\n`;

    if (malhaText === "100% Algodão") {
      malhaCounts.algodao += item.quantidade || 1;
    } else {
      malhaCounts.pima += item.quantidade || 1;
    }
  });

  message += `\nAlgodão: ${malhaCounts.algodao}`;
  message += `\nCotton Pima: ${malhaCounts.pima}`;
  message += `\nTotal de itens: ${totalItems}`;

  const encodedMessage = encodeURIComponent(message);
  const phoneNumber = "32998301714";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
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

function startPolling() {
  checkForUpdates();
  
  pollingIntervalId = setInterval(checkForUpdates, POLLING_INTERVAL);
}

function stopPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

cartButton.addEventListener("click", () => {
  cartSidebar.classList.remove("hidden");
  document.body.style.overflow = "hidden";
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

document.getElementById('whatsapp-button').addEventListener('click', function(e) {
  e.preventDefault();
  sendWhatsAppOrder();
});

document.addEventListener('DOMContentLoaded', function() {
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

    document.querySelectorAll('#fixed-sections-container h2, #dynamic-sections-container h2').forEach(h2 => {
        h2.style.display = 'none';
    });
    document.querySelectorAll('.cards-container').forEach(container => {
        container.style.display = 'none';
    });

    if (selectedMalha === 'all') {
        document.querySelectorAll('#fixed-sections-container h2, #dynamic-sections-container h2').forEach(h2 => {
            h2.style.display = 'block';
        });
        document.querySelectorAll('.cards-container').forEach(container => {
            container.style.display = 'grid';
        });
    } else {
        const section = document.querySelector(`h2[data-malha="${selectedMalha}"]`);
        const container = document.querySelector(`.cards-container[data-malha="${selectedMalha}"]`);
        
        if (section && container) {
            section.style.display = 'block';
            container.style.display = 'grid';
        }
    }

    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        const cardTitle = card.querySelector('h3').textContent.toLowerCase();
        const cardVisible = cardTitle.includes(searchTerm);
        card.style.display = cardVisible ? 'flex' : 'none';

        if (searchTerm && cardVisible) {
            const malhaType = card.dataset.malha;
            const section = document.querySelector(`h2[data-malha="${malhaType}"]`);
            const container = document.querySelector(`.cards-container[data-malha="${malhaType}"]`);
            
            if (section && container) {
                section.style.display = 'block';
                container.style.display = 'grid';
            }
        }
    });
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

  loadProducts();
  startPolling();

    loadCarouselImages();

    const carousel = document.querySelector('.carousel-container');
    if (carousel) {
        carousel.addEventListener('mouseenter', () => {
            clearInterval(carouselInterval);
        });
        
        carousel.addEventListener('mouseleave', () => {
            startCarousel();
        });
    }
});

async function loadCarouselImages() {
    try {
        const response = await fetch(carouselCSVUrl);
        const csvData = await response.text();
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            console.warn('Planilha do carrossel vazia ou com formato incorreto');
            return;
        }

        carouselSlides = [];
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            const currentline = lines[i].split('"').join('').split(',');
            const slide = {
                id: currentline[0]?.trim() || '',
                imagem: currentline[1]?.trim() || '',
                legenda: currentline[2]?.trim() || ''
            };
            
            if (slide.imagem) {
                carouselSlides.push(slide);
            }
        }
        
        if (carouselSlides.length > 0) {
            initCarousel();
            startCarousel();
        } else {
            console.warn('Nenhum slide válido encontrado na planilha do carrossel');
        }
    } catch (error) {
        console.error('Erro ao carregar o carrossel:', error);
        showError("Erro ao carregar o carrossel de fotos");
    }
}

function initCarousel() {
    const slidesContainer = document.querySelector('.carousel-slides');
    const indicatorsContainer = document.querySelector('.carousel-indicators');
    
    if (!slidesContainer || !indicatorsContainer) {
        console.error('Elementos do carrossel não encontrados no DOM');
        return;
    }
    
    slidesContainer.innerHTML = '';
    indicatorsContainer.innerHTML = '';
    
    carouselSlides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.classList.add('carousel-slide');
        slideElement.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = slide.imagem;
        img.alt = slide.legenda;
        img.loading = 'lazy';
        img.onerror = function() {
            this.src = 'https://placehold.co/800x500?text=Imagem+Indisponível';
        };
        
        slideElement.appendChild(img);
        slidesContainer.appendChild(slideElement);

        const indicator = document.createElement('div');
        indicator.classList.add('carousel-indicator');
        indicator.dataset.index = index;
        if (index === 0) indicator.classList.add('active');
        
        indicator.addEventListener('click', () => {
            goToSlide(index);
        });
        
        indicatorsContainer.appendChild(indicator);
    });

    updateCaption();

    const prevButton = document.querySelector('.carousel-button.prev');
    const nextButton = document.querySelector('.carousel-button.next');
    
    if (prevButton && nextButton) {
        prevButton.addEventListener('click', prevSlide);
        nextButton.addEventListener('click', nextSlide);
    }

    setupCarouselModal();
}

function nextSlide() {
    goToSlide((currentSlideIndex + 1) % carouselSlides.length);
    resetCarouselInterval();
}

function prevSlide() {
    goToSlide((currentSlideIndex - 1 + carouselSlides.length) % carouselSlides.length);
    resetCarouselInterval();
}

function goToSlide(index) {
    if (carouselSlides.length === 0) return;
    
    currentSlideIndex = index;
    const slidesContainer = document.querySelector('.carousel-slides');
    if (slidesContainer) {
        slidesContainer.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }
    
    document.querySelectorAll('.carousel-indicator').forEach((indicator, i) => {
        if (i === currentSlideIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
    
    updateCaption();
}

function updateCaption() {
    const captionElement = document.querySelector('.carousel-caption');
    if (captionElement && carouselSlides.length > 0) {
        captionElement.textContent = carouselSlides[currentSlideIndex].legenda;
    }
}

function startCarousel() {
    if (carouselSlides.length > 1) {
        clearInterval(carouselInterval);
        carouselInterval = setInterval(nextSlide, 5000); // Muda a cada 5 segundos
    }
}

function resetCarouselInterval() {
    clearInterval(carouselInterval);
    startCarousel();
}

function setupCarouselModal() {
    const modal = document.getElementById('carousel-modal');
    const modalImg = document.getElementById('carousel-modal-img');
    const closeModal = document.querySelector('.close-carousel-modal');
    const carouselImages = document.querySelectorAll('.carousel-slide img');

    carouselImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            modalImg.src = img.src;
            modalImg.alt = img.alt;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
}

window.removeFromCart = removeFromCart;