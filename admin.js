// Verificar se o Firebase já foi inicializado
if (!firebase.apps.length) {
    const firebaseConfig = {
        apiKey: "AIzaSyDdPF1KwTeC5zzFbsLnkCvx6a2BmWt8iL8",
        authDomain: "test-58408.firebaseapp.com",
        projectId: "test-58408",
        storageBucket: "test-58408.appspot.com",
        messagingSenderId: "857029748739",
        appId: "1:857029748739:web:5a85299a0343e54a118636",
        measurementId: "G-M4YV7HB77W"
    };

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();

// Verificar se o user é admin
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

// Variável global para tamanhos
let productSizes = {};

// Função para renderizar os tamanhos
function renderSizes() {
    const sizesList = document.getElementById('sizesList');
    if (!sizesList) return;
    
    sizesList.innerHTML = '';

    const sizesArray = Object.entries(productSizes).map(([size, data]) => ({
        size: size,
        ...data
    }));

    function extractNumber(size) {
        const match = size.match(/(\d+)/);
        return match ? parseInt(match[0]) : 0;
    }

    sizesArray.sort((a, b) => {
        const numA = extractNumber(a.size);
        const numB = extractNumber(b.size);
        return numA - numB;
    });

    sizesArray.forEach(sizeData => {
        const sizeItem = document.createElement('div');
        sizeItem.className = 'size-item';
        sizeItem.innerHTML = `
            <div class="size-info">
                <span class="size-text">${sizeData.size}</span>
            </div>
            <div class="size-actions">
                <button type="button" class="remove-size" onclick="removeSize('${sizeData.size}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        sizesList.appendChild(sizeItem);
    });
}

// Função para remover tamanho
window.removeSize = function(size) {
    delete productSizes[size];
    renderSizes();
};

// Carregar produtos
async function loadProducts(category = '') {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    productsList.innerHTML = '';

    try {
        let query = db.collection('products');
        if (category) {
            query = query.where('category', '==', category);
        }
        
        const snapshot = await query.get();
        
        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            const productElement = document.createElement('div');
            productElement.className = 'product-item';
            productElement.innerHTML = renderProduct(product, productId);
            productsList.appendChild(productElement);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Função para renderizar produto individual
function renderProduct(product, productId) {
    const discountedPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;
    
    const sizesHtml = product.sizes ? 
        Object.keys(product.sizes)
            .map(size => `<span style="background: #f0f2f5; padding: 2px 8px; border-radius: 4px; margin-right: 5px; font-size: 0.9em;">${size}</span>`)
            .join('') : '';

    return `
        <div class="product-item" data-category="${product.category}">
            <img src="${product.imageUrl || 'placeholder.jpg'}" alt="${product.name}">
            <div class="product-details">
                <h3>${product.name}</h3>
                <div class="price-container">
                    ${product.discount ? `
                        <p class="original-price">${product.price.toFixed(2)}€</p>
                        <p class="discounted-price">${discountedPrice.toFixed(2)}€</p>
                        <span class="discount-badge">-${product.discount}%</span>
                    ` : `
                        <p>${product.price.toFixed(2)}€</p>
                    `}
                </div>
                <div style="margin-top: 8px;">
                    ${sizesHtml ? `<div style="margin-top: 5px;">Tamanhos: ${sizesHtml}</div>` : ''}
                </div>
            </div>
            <button class="edit-btn" onclick="editProduct('${productId}')">Editar</button>
            <button class="delete-btn" onclick="deleteProduct('${productId}')">Eliminar</button>
        </div>
    `;
}

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Setup dos event listeners
    const addSizeBtn = document.getElementById('addSizeBtn');
    const sizeInput = document.getElementById('sizeInput');
    const productForm = document.getElementById('productForm');
    const productDiscount = document.getElementById('productDiscount');
    const filterCategory = document.getElementById('filterCategory');
    const searchProducts = document.getElementById('searchProducts');
    const toggleFeatured = document.getElementById('toggleFeatured');
    const saveFeatured = document.getElementById('saveFeatured');

    if (sizeInput) {
        sizeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const size = this.value.trim();
                if (size) {
                    productSizes[size] = true;
                    renderSizes();
                    this.value = '';
                }
            }
        });
    }

    if (addSizeBtn) {
        addSizeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const size = sizeInput.value.trim();
            if (size) {
                productSizes[size] = true;
                renderSizes();
                sizeInput.value = '';
            }
        });
    }

    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = document.getElementById('submitButton');
            if (submitButton.disabled) return;
            
            submitButton.disabled = true;
            
            try {
                const productId = document.getElementById('productId').value;
                
                const productData = {
                    name: document.getElementById('productName').value,
                    category: document.getElementById('productCategory').value,
                    price: parseFloat(document.getElementById('productPrice').value),
                    description: document.getElementById('productDescription').value,
                    discount: parseInt(document.getElementById('productDiscount').value) || 0,
                    sizes: productSizes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                const promoEndDate = document.getElementById('promoEndDate').value;
                if (promoEndDate && productData.discount > 0) {
                    productData.promoEndDate = promoEndDate;
                }

                const imageFile = document.getElementById('productImage').files[0];
                if (imageFile) {
                    const storageRef = firebase.storage().ref();
                    const imageRef = storageRef.child(`products/${Date.now()}_${imageFile.name}`);
                    await imageRef.put(imageFile);
                    productData.imageUrl = await imageRef.getDownloadURL();
                }

                if (productId) {
                    await db.collection('products').doc(productId).update(productData);
                } else {
                    await db.collection('products').add(productData);
                }

                document.getElementById('productForm').reset();
                document.getElementById('productId').value = '';
                document.getElementById('submitButton').textContent = 'Adicionar Produto';
                productSizes = {};
                renderSizes();
                
                alert('Produto salvo com sucesso!');
                loadProducts();
            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                alert('Erro ao salvar produto: ' + error.message);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (productDiscount) {
        productDiscount.addEventListener('input', function(e) {
            const discountValue = parseFloat(e.target.value);
            const promoDateContainer = document.getElementById('promoDateContainer');
            if (promoDateContainer) {
                promoDateContainer.style.display = discountValue > 0 ? 'block' : 'none';
            }
        });
    }

    if (filterCategory) {
        filterCategory.addEventListener('change', function(e) {
            loadProducts(e.target.value);
        });
    }

    if (searchProducts) {
        searchProducts.addEventListener('input', filterProducts);
    }

    if (toggleFeatured) {
        toggleFeatured.addEventListener('click', function() {
            const formsContainer = document.querySelector('.forms-container');
            if (formsContainer.classList.contains('show-featured')) {
                formsContainer.classList.remove('show-featured');
                this.textContent = 'Mostrar Produtos em Destaque';
            } else {
                formsContainer.classList.add('show-featured');
                this.textContent = 'Ocultar Produtos em Destaque';
            }
        });
    }

    if (saveFeatured) {
        saveFeatured.addEventListener('click', async () => {
            const featured1 = document.getElementById('featured1').value;
            const featured2 = document.getElementById('featured2').value;
            
            try {
                await db.collection('featured').doc('homepage').set({
                    featured1,
                    featured2,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                alert('Produtos em destaque atualizados com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar destaques:', error);
                alert('Erro ao salvar produtos em destaque');
            }
        });
    }

    // Adicionar estilos para os preços com desconto
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .product-details {
            flex-grow: 1;
        }
        .price-container {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 5px 0;
        }
        .original-price {
            text-decoration: line-through;
            color: #999;
            font-size: 0.9em;
            margin: 0;
        }
        .discounted-price {
            color: #e53e3e;
            font-weight: bold;
            margin: 0;
        }
        .discount-badge {
            background-color: #e53e3e;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
    `;
    document.head.appendChild(styleElement);

    // Carregar produtos e destaques inicialmente
    loadProducts();
    loadFeaturedSelects();
});

// Função para filtrar produtos
function filterProducts() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    const categoryFilter = document.getElementById('filterCategory').value;
    const productItems = document.querySelectorAll('.product-item');

    productItems.forEach(item => {
        const productName = item.querySelector('h3').textContent.toLowerCase();
        const productCategory = item.dataset.category;

        const matchesSearch = productName.includes(searchTerm);
        const matchesCategory = !categoryFilter || productCategory === categoryFilter;

        item.style.display = matchesSearch && matchesCategory ? 'flex' : 'none';
    });
}

// Função para editar produto
async function editProduct(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (!doc.exists) {
            console.error('Produto não encontrado');
            return;
        }

        const product = doc.data();
        
        productSizes = {};
        if (product.sizes) {
            Object.keys(product.sizes).forEach(size => {
                productSizes[size] = true;
            });
        }
        
        renderSizes();

        document.getElementById('productId').value = productId;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productDiscount').value = product.discount || '';
        document.getElementById('productDescription').value = product.description || '';

        if (product.promoEndDate) {
            document.getElementById('promoEndDate').value = product.promoEndDate;
            document.getElementById('promoDateContainer').style.display = 'block';
        }

        document.getElementById('submitButton').textContent = 'Atualizar Produto';
        scrollToForm();
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        alert('Erro ao carregar produto: ' + error.message);
    }
}

// Função para deletar produto
async function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja eliminar este produto?')) {
        try {
            await db.collection('products').doc(productId).delete();
            alert('Produto eliminado com sucesso!');
            loadProducts();
        } catch (error) {
            console.error('Erro ao eliminar produto:', error);
            alert('Erro ao eliminar produto: ' + error.message);
        }
    }
}

// Função para scroll até o formulário
function scrollToForm() {
    const form = document.querySelector('.product-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Carregar produtos nos selects de destaque
async function loadFeaturedSelects() {
    const featured1Select = document.getElementById('featured1');
    const featured2Select = document.getElementById('featured2');
    
    try {
        // Carregar produtos atuais em destaque
        const featuredDoc = await db.collection('featured').doc('homepage').get();
        const featuredData = featuredDoc.exists ? featuredDoc.data() : {};
        
        // Carregar todos os produtos
        const snapshot = await db.collection('products').get();
        
        // Limpar opções existentes
        featured1Select.innerHTML = '<option value="">Selecione um produto</option>';
        featured2Select.innerHTML = '<option value="">Selecione um produto</option>';
        
        // Adicionar produtos aos selects
        snapshot.forEach(doc => {
            const product = doc.data();
            const option1 = document.createElement('option');
            const option2 = document.createElement('option');
            
            option1.value = doc.id;
            option1.textContent = product.name;
            option2.value = doc.id;
            option2.textContent = product.name;
            
            // Selecionar produtos em destaque atuais
            if (doc.id === featuredData.featured1) option1.selected = true;
            if (doc.id === featuredData.featured2) option2.selected = true;
            
            featured1Select.appendChild(option1);
            featured2Select.appendChild(option2.cloneNode(true));
        });
    } catch (error) {
        console.error('Erro ao carregar produtos em destaque:', error);
    }
}