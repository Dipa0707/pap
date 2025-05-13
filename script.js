const firebaseConfig = {
    apiKey: "AIzaSyDdPF1KwTeC5zzFbsLnkCvx6a2BmWt8iL8",
    authDomain: "test-58408.firebaseapp.com",
    projectId: "test-58408",
    storageBucket: "test-58408.appspot.com",
    messagingSenderId: "857029748739",
    appId: "1:857029748739:web:5a85299a0343e54a118636",
    measurementId: "G-M4YV7HB77W"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let isLoggedIn = false;

async function handleAuth() {
    if (isLoggedIn) {
        try {
            await auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            isLoggedIn = false;
            document.getElementById('adminLink').style.display = 'none';
            updateAuthButton();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    } else {
        showAuthModal();
    }
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            isLoggedIn = true;
            updateAuthButton();
            closeAuthModal();
        })
        .catch((error) => {
            console.error('Erro ao fazer login:', error);
            alert('Credenciais inválidas. Tente novamente.');
        });
}

auth.onAuthStateChanged((user) => {
    isLoggedIn = !!user;
    updateAuthButton();
    
    if (!user) {
        localStorage.clear();
        sessionStorage.clear();
        document.getElementById('adminLink').style.display = 'none';
    }
});

function showLoginForm() {
    const modal = document.getElementById('loginForm');
    modal.style.display = 'block';
}

function closeLoginModal() {
    const modal = document.getElementById('loginForm');
    modal.style.display = 'none';
}

function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm.style.display === "none") {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
    } else {
        loginForm.style.display = "none";
        signupForm.style.display = "block";
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'none';
}

function signup(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('As senhas não coincidem. Tente novamente.');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert('Conta criada com sucesso!');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Erro ao criar conta:', error);
            alert('Erro ao criar conta. Tente novamente.');
        });
}

function showAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
}

function updateAuthButton() {
    const authText = document.getElementById('authText');
    if (isLoggedIn) {
        authText.textContent = 'Sair';
    } else {
        authText.textContent = 'Iniciar Sessão';
    }
}

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .get();
            
            if (userDoc.exists && userDoc.data().isAdmin) {
                document.getElementById('adminLink').style.display = 'block';
                localStorage.setItem('isAdmin', 'true');
            } else {
                document.getElementById('adminLink').style.display = 'none';
                localStorage.removeItem('isAdmin');
            }
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            document.getElementById('adminLink').style.display = 'none';
            localStorage.removeItem('isAdmin');
        }
    } else {
        document.getElementById('adminLink').style.display = 'none';
        localStorage.removeItem('isAdmin');
    }
});

async function loadFeaturedProducts() {
    const featured1 = document.getElementById('featured1');
    const featured2 = document.getElementById('featured2');

    try {
        const featuredDoc = await db.collection('featured').doc('homepage').get();
        const featuredData = featuredDoc.exists ? featuredDoc.data() : {};

        // Carregar produtos em destaque
        if (featuredData.featured1) {
            const product1 = await db.collection('products').doc(featuredData.featured1).get();
            if (product1.exists) {
                const product = product1.data();
                
                // Calcular preço com desconto se aplicável
                const hasDiscount = product.discount > 0;
                const discountedPrice = hasDiscount ? product.price * (1 - product.discount / 100) : product.price;
                
                featured1.innerHTML = `
                    <a href="mostrar.html?id=${featuredData.featured1}" class="product-link">
                        ${hasDiscount ? '<div class="promo-label">PROMOÇÃO</div>' : ''}
                        <img src="${product.imageUrl || 'placeholder.jpg'}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <div class="price-container">
                            ${hasDiscount ? `
                                <p class="discounted-price">${discountedPrice.toFixed(2)}€</p>
                                <p class="original-price">${product.price.toFixed(2)}€</p>
                                ${product.promoEndDate ? 
                                    `<p class="product-date">*De ${new Date().toLocaleDateString('pt-PT')} a ${new Date(product.promoEndDate).toLocaleDateString('pt-PT')} (excluído)</p>` : 
                                    ''}
                            ` : `
                                <p class="price">${product.price.toFixed(2)}€</p>
                            `}
                        </div>
                    </a>
                    <button onclick="addToCart('${featuredData.featured1}')" class="cart-button">
                        <i class="fas fa-shopping-cart"></i>
                        Adicionar ao Carrinho
                    </button>
                `;
            }
        }

        if (featuredData.featured2) {
            const product2 = await db.collection('products').doc(featuredData.featured2).get();
            if (product2.exists) {
                const product = product2.data();
                
                // Calcular preço com desconto se aplicável
                const hasDiscount = product.discount > 0;
                const discountedPrice = hasDiscount ? product.price * (1 - product.discount / 100) : product.price;
                
                featured2.innerHTML = `
                    <a href="mostrar.html?id=${featuredData.featured2}" class="product-link">
                        ${hasDiscount ? '<div class="promo-label">PROMOÇÃO</div>' : ''}
                        <img src="${product.imageUrl || 'placeholder.jpg'}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <div class="price-container">
                            ${hasDiscount ? `
                                <p class="discounted-price">${discountedPrice.toFixed(2)}€</p>
                                <p class="original-price">${product.price.toFixed(2)}€</p>
                                ${product.promoEndDate ? 
                                    `<p class="product-date">*De ${new Date().toLocaleDateString('pt-PT')} a ${new Date(product.promoEndDate).toLocaleDateString('pt-PT')} (excluído)</p>` : 
                                    ''}
                            ` : `
                                <p class="price">${product.price.toFixed(2)}€</p>
                            `}
                        </div>
                    </a>
                    <button onclick="addToCart('${featuredData.featured2}')" class="cart-button">
                        <i class="fas fa-shopping-cart"></i>
                        Adicionar ao Carrinho
                    </button>
                `;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar produtos em destaque:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadFeaturedProducts();
    updateCartCount();
});

// Funções do carrinho
async function addToCart(productId) {
    try {
        // Buscar informações atualizadas do produto
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            console.error('Produto não encontrado');
            return;
        }
        
        const product = productDoc.data();
        let price = product.price;
        let discountedPrice = price;
        
        // Calcular preço com desconto se aplicável
        if (product.discount) {
            discountedPrice = price * (1 - product.discount / 100);
        }
        
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: productId,
                name: product.name,
                price: discountedPrice,
                originalPrice: product.price,
                discount: product.discount || 0,
                imageUrl: product.imageUrl,
                quantity: 1
            });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        alert("Produto adicionado ao carrinho!");
    } catch (error) {
        console.error('Erro ao adicionar produto ao carrinho:', error);
    }
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
}

function updateQuantity(productId, newQuantity) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Garantir que a quantidade seja um número válido
    newQuantity = parseInt(newQuantity);
    if (isNaN(newQuantity) || newQuantity < 1) {
        newQuantity = 1;
    }

    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        
        // Atualizar o total do item diretamente na página sem recarregar
        const itemTotalElement = document.querySelector(`#cart-item-${productId} .item-total`);
        if (itemTotalElement) {
            const itemTotal = item.price * newQuantity;
            itemTotalElement.textContent = `${itemTotal.toFixed(2)}€`;
            
            // Recalcular o total do carrinho
            let total = 0;
            for (const cartItem of cart) {
                total += cartItem.price * cartItem.quantity;
            }
            
            // Atualizar o subtotal e total na página
            document.getElementById('subtotal').textContent = `${total.toFixed(2)}€`;
            document.getElementById('total').textContent = `${total.toFixed(2)}€`;
            
            // Resetar o desconto aplicado se houver
            const discountRow = document.getElementById('discount-row');
            if (discountRow && discountRow.style.display !== 'none') {
                // Se havia um desconto aplicado, precisamos recalculá-lo
                const appliedDiscount = JSON.parse(sessionStorage.getItem('appliedDiscount'));
                if (appliedDiscount) {
                    let discountAmount = 0;
                    
                    if (appliedDiscount.type === 'percentage') {
                        discountAmount = total * (appliedDiscount.value / 100);
                        document.getElementById('discount-value').textContent = `-${discountAmount.toFixed(2)}€`;
                        document.getElementById('total').textContent = `${(total - discountAmount).toFixed(2)}€`;
                    } else if (appliedDiscount.type === 'fixed') {
                        discountAmount = Math.min(total, appliedDiscount.value);
                        document.getElementById('discount-value').textContent = `-${discountAmount.toFixed(2)}€`;
                        document.getElementById('total').textContent = `${(total - discountAmount).toFixed(2)}€`;
                    }
                }
            }
        } else {
            // Se não conseguir atualizar diretamente, recarregar a página
            location.reload();
        }
    }
}

function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    location.reload();
}

function proceedToCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('O carrinho está vazio!');
        return;
    }
    
    // Verificar se o usuário está logado
    if (!isLoggedIn) {
        showAuthModal();
        return;
    }
    
    // Se estiver logado, prosseguir para o envio
    window.location.href = 'shipping.html';
}
