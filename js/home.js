document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
});

async function loadFeaturedProducts() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;

    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('Falha ao carregar produtos');
        }
        
        const products = await response.json();
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">📦</div>
                    <p>Nenhum produto cadastrado no momento. Volte mais tarde!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        // Take up to 4 products for the homepage highlights
        const featured = products.slice(0, 4);

        featured.forEach(product => {
            const isAvailable = product.quantity > 0;
            const stockClass = isAvailable ? 'available' : 'empty';
            const stockText = isAvailable ? `${product.quantity} un. em estoque` : 'Esgotado';
            
            // Fallback image if none uploaded
            const imgPath = product.imagePath ? product.imagePath : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.id = `product-card-${product.id}`;

            card.innerHTML = `
                <div class="product-image-container">
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                    <button class="add-to-cart-btn" title="Adicionar ao carrinho" id="add-to-cart-${product.id}">
                        <svg viewBox="0 0 24 24">
                            <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z"/>
                        </svg>
                    </button>
                    <img src="${imgPath}" alt="${product.name}" class="product-img" loading="lazy">
                </div>
                <div class="product-info">
                    <span class="product-model">${product.model || 'Descartável'}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description || 'Sem descrição disponível.'}</p>
                    <div class="product-footer">
                        <span class="product-price">${product.price.toFixed(2)}</span>
                    </div>
                </div>
            `;

            // Bind click to the floating cart button
            const cartButton = card.querySelector(`.add-to-cart-btn`);
            cartButton.addEventListener('click', (e) => {
                e.stopPropagation();
                addToCart(product);
            });

            grid.appendChild(card);
        });

    } catch (e) {
        console.error('Erro ao renderizar produtos em destaque', e);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>Ocorreu um erro ao carregar os produtos em destaque. Verifique o servidor.</p>
            </div>
        `;
    }
}
