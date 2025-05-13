// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDdPF1KwTeC5zzFbsLnkCvx6a2BmWt8iL8",
    authDomain: "test-58408.firebaseapp.com",
    projectId: "test-58408",
    storageBucket: "test-58408.appspot.com",
    messagingSenderId: "857029748739",
    appId: "1:857029748739:web:5a85299a0343e54a118636",
    measurementId: "G-M4YV7HB77W"
};

class ProductManager {
    constructor() {
        this.allProducts = [];
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.firestore();
    }

    // Carregar produtos por categoria (ou todos)
    async loadProducts(category = null) {
        const productsContainer = document.getElementById('products-container');
        if (!productsContainer) {
            console.error('Container de produtos não encontrado');
            return;
        }
        
        productsContainer.innerHTML = '<p>Carregando produtos...</p>';

        try {
            let query = this.db.collection('products');
            if (category && category !== 'todos') {
                query = query.where('category', '==', category);
            }

            console.log('Buscando produtos...', category ? `Categoria: ${category}` : 'Todas categorias');
            
            const snapshot = await query.get();
            this.allProducts = [];
            let html = '';

            snapshot.forEach((doc) => {
                const product = doc.data();
                product.id = doc.id;
                this.allProducts.push(product);
                html += this.createProductCard(product);
            });

            console.log(`${this.allProducts.length} produtos encontrados`);

            if (html === '') {
                productsContainer.innerHTML = '<p>Nenhum produto encontrado.</p>';
            } else {
                productsContainer.innerHTML = html;
            }

            // Adicionar event listeners para os filtros
            this.setupFilterListeners();

        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            productsContainer.innerHTML = '<p>Erro ao carregar produtos. Por favor, tente novamente.</p>';
        }
    }

    // Criar card do produto
    createProductCard(product) {
        const discountedPrice = product.discount ? 
            product.price * (1 - product.discount / 100) : 
            product.price;

        return `
            <div class="product-card">
                ${product.discount ? '<div class="promo-label">PROMOÇÃO</div>' : ''}
                <a href="mostrar.html?id=${product.id}" class="product-link">
                    <img src="${product.imageUrl}" alt="${product.name}" onerror="this.src='placeholder.jpg'">
                    <h3>${product.name}</h3>
                    <div class="price-container">
                        ${product.discount ? `
                            <p class="discounted-price">${discountedPrice.toFixed(2)}€</p>
                            <p class="original-price">${product.price.toFixed(2)}€</p>
                            ${product.promoEndDate ? `<p class="product-date">*De ${new Date().toLocaleDateString('pt-PT')} a ${new Date(product.promoEndDate).toLocaleDateString('pt-PT')} (excluído)</p>` : ''}
                        ` : `
                            <p class="price">${product.price.toFixed(2)}€</p>
                        `}
                    </div>
                </a>
                <button onclick="productManager.handleAddToCart('${product.id}')" class="cart-button">
                    <i class="fas fa-shopping-cart"></i>
                    Adicionar ao Carrinho
                </button>
            </div>
        `;
    }

    // Configurar listeners dos filtros
    setupFilterListeners() {
        const searchInput = document.getElementById('searchInput');
        const priceFilter = document.getElementById('priceFilter');
        const categoryFilter = document.getElementById('categoryFilter');

        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.filterProducts());
        }
        if (priceFilter) {
            priceFilter.addEventListener('change', () => this.filterProducts());
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterProducts());
        }
    }

    // Filtrar produtos
    filterProducts() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const priceFilter = document.getElementById('priceFilter')?.value || 'todos';
        const categoryFilter = document.getElementById('categoryFilter')?.value || 'todos';

        let filteredProducts = [...this.allProducts];

        // Filtrar por termo de busca
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm) || 
                (product.description && product.description.toLowerCase().includes(searchTerm))
            );
        }

        // Filtrar por categoria (se existir)
        if (categoryFilter !== 'todos') {
            filteredProducts = filteredProducts.filter(product => 
                product.category === categoryFilter
            );
        }

        // Filtrar por preço
        if (priceFilter !== 'todos') {
            if (priceFilter === '201+') {
                filteredProducts = filteredProducts.filter(product => {
                    const finalPrice = product.discount ? 
                        product.price * (1 - product.discount / 100) : 
                        product.price;
                    return parseFloat(finalPrice) >= 201;
                });
            } else {
                const [min, max] = priceFilter.split('-').map(Number);
                filteredProducts = filteredProducts.filter(product => {
                    const finalPrice = product.discount ? 
                        product.price * (1 - product.discount / 100) : 
                        product.price;
                    return finalPrice >= min && finalPrice <= max;
                });
            }
        }

        // Atualizar a exibição
        const productsContainer = document.getElementById('products-container');
        if (productsContainer) {
            let html = filteredProducts.map(product => this.createProductCard(product)).join('');
            productsContainer.innerHTML = html || '<p>Nenhum produto encontrado com estes filtros.</p>';
        }
    }

    // Novo método para lidar com a adição ao carrinho
    async handleAddToCart(productId) {
        try {
            const doc = await this.db.collection('products').doc(productId).get();
            if (!doc.exists) {
                throw new Error('Produto não encontrado');
            }

            const product = {
                id: productId,
                ...doc.data()
            };

            if (product.sizes && Object.keys(product.sizes).length > 0) {
                // Produto tem tamanhos disponíveis
                const size = await this.openSizeModal(product.sizes);
                if (size) {
                    this.addToCart(product, size);
                }
            } else {
                // Produto sem tamanhos
                this.addToCart(product);
            }
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    openSizeModal(sizes) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'size-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Selecione o Tamanho</h3>
                    <select id="sizeSelect">
                        <option value="">Escolha um tamanho</option>
                        ${Object.entries(sizes)
                            .filter(([_, available]) => available)
                            .map(([size]) => `
                                <option value="${size}">${size}</option>
                            `).join('')}
                    </select>
                    <div class="modal-buttons">
                        <button id="confirmSize">Confirmar</button>
                        <button id="cancelSize">Cancelar</button>
                    </div>
                </div>
            `;

            // Adicionar estilos
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

            modal.querySelector('.modal-content').style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            `;

            document.body.appendChild(modal);

            // Event Listeners
            modal.querySelector('#confirmSize').onclick = () => {
                const size = modal.querySelector('#sizeSelect').value;
                if (size) {
                    modal.remove();
                    resolve(size);
                } else {
                    alert('Por favor, selecione um tamanho');
                }
            };

            modal.querySelector('#cancelSize').onclick = () => {
                modal.remove();
                resolve(null);
            };
        });
    }

    addToCart(product, size = null) {
        try {
            const price = product.discount ? 
                product.price * (1 - product.discount / 100) : 
                product.price;

            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            const cartItem = {
                id: product.id,
                name: product.name,
                price: price,
                imageUrl: product.imageUrl,
                quantity: 1,
                category: product.category
            };

            if (size) {
                cartItem.selectedSize = size;
            }

            // Verificar se o item já existe
            const existingItemIndex = cart.findIndex(item => 
                item.id === product.id && 
                (!size || item.selectedSize === size)
            );

            if (existingItemIndex !== -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push(cartItem);
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            this.updateCartCount();
            alert('Produto adicionado ao carrinho!');
        } catch (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            alert('Erro ao adicionar produto ao carrinho');
        }
    }

    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = count;
        }
    }
}

// Criar instância global
const productManager = new ProductManager(); 