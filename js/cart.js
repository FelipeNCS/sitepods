document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    const checkoutBtn = document.getElementById('checkout-whatsapp-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutToWhatsApp);
    }
});

function renderCart() {
    const listContainer = document.getElementById('cart-items-list');
    const layoutContainer = document.getElementById('cart-layout');
    
    if (!listContainer) return;

    const cart = getCart();

    if (cart.length === 0) {
        // Show empty cart state and hide summary panel
        layoutContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 5rem 2rem;">
                <div class="empty-state-icon">🛒</div>
                <h2>Seu carrinho está vazio</h2>
                <p style="margin: 1rem 0 2rem 0; color: var(--text-secondary);">Navegue pela nossa loja e adicione alguns pods descartáveis de sua escolha.</p>
                <a href="/products.html" class="btn-primary">Voltar para a Loja</a>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    let totalPrice = 0;
    let totalItems = 0;

    cart.forEach(item => {
        const itemSubtotal = item.price * item.qty;
        totalPrice += itemSubtotal;
        totalItems += item.qty;

        const imgPath = item.imagePath ? item.imagePath : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.id = `cart-item-${item.id}`;

        itemEl.innerHTML = `
            <div class="cart-item-img-container">
                <img src="${imgPath}" alt="${item.name}" class="cart-item-img">
            </div>
            <div class="cart-item-details">
                <span class="cart-item-model">${item.model || 'Descartável'}</span>
                <h3 class="cart-item-title">${item.name}</h3>
                <span class="cart-item-price">R$ ${item.price.toFixed(2)}</span>
            </div>
            
            <div class="cart-item-quantity">
                <button class="qty-btn dec-btn" onclick="adjustQuantity(${item.id}, -1)">-</button>
                <span class="qty-val">${item.qty}</span>
                <button class="qty-btn inc-btn" onclick="adjustQuantity(${item.id}, 1)">+</button>
            </div>
            
            <button class="remove-item-btn" onclick="removeCartItem(${item.id})" title="Remover item">
                <svg viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;

        listContainer.appendChild(itemEl);
    });

    // Update Summary panel values
    const summaryQty = document.getElementById('summary-items-qty');
    const summaryTotal = document.getElementById('summary-total-price');

    if (summaryQty) summaryQty.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
    if (summaryTotal) summaryTotal.textContent = `R$ ${totalPrice.toFixed(2)}`;
}

function adjustQuantity(productId, change) {
    let cart = getCart();
    const index = cart.findIndex(item => item.id === productId);

    if (index !== -1) {
        const item = cart[index];
        const newQty = item.qty + change;

        if (newQty <= 0) {
            removeCartItem(productId);
            return;
        }

        // Validate stock quantity (stored as maxQty)
        if (newQty > item.maxQty) {
            showToast(`Apenas ${item.maxQty} unidades em estoque.`, 'error');
            return;
        }

        item.qty = newQty;
        saveCart(cart);
        renderCart();
    }
}

function removeCartItem(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    
    // Refresh DOM (if we emptied, it will show empty state)
    // We can do window.location.reload() or re-render
    const layoutContainer = document.getElementById('cart-layout');
    if (cart.length === 0 && layoutContainer) {
        window.location.reload();
    } else {
        renderCart();
    }
    showToast('Produto removido do carrinho.', 'success');
}

function checkoutToWhatsApp() {
    const cart = getCart();
    if (cart.length === 0) return;

    let message = `*⚡ LIGA PODS - NOVO PEDIDO* \n\n`;
    message += `Olá! Gostaria de fazer o pedido abaixo:\n`;
    message += `-------------------------------------------\n`;

    let total = 0;
    cart.forEach((item, idx) => {
        const sub = item.price * item.qty;
        total += sub;
        message += `*${idx + 1}. ${item.name}*\n`;
        message += `   Modelo: ${item.model || 'N/A'}\n`;
        message += `   Qtd: ${item.qty}x de R$ ${item.price.toFixed(2)}\n`;
        message += `   Subtotal: R$ ${sub.toFixed(2)}\n\n`;
    });

    message += `-------------------------------------------\n`;
    message += `*Total do Pedido: R$ ${total.toFixed(2)}*\n\n`;
    message += `Forma de entrega e pagamento a combinar. Aguardo retorno!`;

    // Encode message for URL
    const encodedText = encodeURIComponent(message);
    
    // Create WhatsApp redirection link. 
    // We redirect to a general sharing api which prompts the user to select the contact (ideal for customer)
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    
    // Clear cart on successful checkout redirect
    localStorage.removeItem(CART_KEY);
    
    // Open in a new tab
    window.open(whatsappUrl, '_blank');
    
    // Redirect customer to homepage with a thank you toast
    window.location.href = '/index.html?ordered=true';
}
