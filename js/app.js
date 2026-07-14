// Toast Notification system
function showToast(message, type = 'default') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // Reset classes
    toast.className = 'toast';
    if (type === 'success') {
        toast.classList.add('success');
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Shopping Cart management using LocalStorage
const CART_KEY = 'ligapods_cart';

function getCart() {
    const cartStr = localStorage.getItem(CART_KEY);
    return cartStr ? JSON.parse(cartStr) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCountBadge();
}

function addToCart(product) {
    if (product.quantity <= 0) {
        showToast('Este produto está esgotado!', 'error');
        return;
    }
    
    let cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex !== -1) {
        // Check if adding exceeds stock
        if (cart[existingIndex].qty + 1 > product.quantity) {
            showToast(`Limite de estoque atingido! Apenas ${product.quantity} unidades disponíveis.`, 'error');
            return;
        }
        cart[existingIndex].qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            model: product.model,
            price: product.price,
            imagePath: product.imagePath,
            maxQty: product.quantity, // store available stock limit
            qty: 1
        });
    }
    
    saveCart(cart);
    showToast(`"${product.name}" adicionado ao carrinho!`, 'success');
}

function updateCartCountBadge() {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.querySelector('.cart-count');
    if (badge) {
        badge.textContent = totalCount;
    }
}

// Check admin session and adjust navbar actions dynamically
async function checkNavbarAdminState() {
    try {
        const response = await fetch('/api/admin/check-session');
        const actionsContainer = document.getElementById('nav-actions');
        if (!actionsContainer) return;
        
        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn) {
                // If logged in, replace login button with "Painel" and "Sair" buttons
                const loginBtn = document.getElementById('login-nav-btn');
                if (loginBtn) {
                    loginBtn.remove();
                }
                
                // Add Panel & Logout buttons if not already there
                if (!document.getElementById('admin-panel-link')) {
                    const panelLink = document.createElement('a');
                    panelLink.id = 'admin-panel-link';
                    panelLink.href = '/admin.html';
                    panelLink.className = 'admin-login-btn';
                    panelLink.style.borderColor = 'var(--neon-purple)';
                    panelLink.style.color = 'var(--neon-purple)';
                    panelLink.textContent = 'Painel Admin';
                    
                    const logoutBtn = document.createElement('button');
                    logoutBtn.id = 'logout-nav-btn';
                    logoutBtn.className = 'admin-login-btn';
                    logoutBtn.style.borderColor = 'var(--danger)';
                    logoutBtn.style.color = 'var(--danger)';
                    logoutBtn.textContent = 'Sair';
                    logoutBtn.onclick = async () => {
                        await fetch('/api/admin/logout', { method: 'POST' });
                        window.location.reload();
                    };
                    
                    actionsContainer.appendChild(panelLink);
                    actionsContainer.appendChild(logoutBtn);
                }
            }
        }
    } catch (e) {
        console.error('Falha ao checar sessão do navbar', e);
    }
}

// Initialize global state on DOM load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCountBadge();
    checkNavbarAdminState();
    initFireParticles();
});

// Red Fire Particle System (Canvas Background - Pixel Art / Low Res)
function initFireParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'fire-particles-bg';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    
    // retro pixelated scaling style
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = 'crisp-edges';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    
    // Scale factor to downsample canvas (makes it look pixelated)
    const scale = 6;
    let width = canvas.width = Math.floor(window.innerWidth / scale);
    let height = canvas.height = Math.floor(window.innerHeight / scale);

    window.addEventListener('resize', () => {
        width = canvas.width = Math.floor(window.innerWidth / scale);
        height = canvas.height = Math.floor(window.innerHeight / scale);
    });

    const particles = [];
    const maxParticles = 80;

    class Particle {
        constructor() {
            this.reset();
            // Pre-distribute vertically so they don't all rise together at startup
            this.y = Math.random() * height;
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + Math.random() * 10;
            this.size = Math.random() < 0.45 ? 'cross' : 'square';
            this.vy = -(Math.random() * 0.45 + 0.15); // slow floaty rise
            this.vx = Math.random() * 0.4 - 0.2;
            this.life = Math.random() * 0.7 + 0.3;
            this.decay = Math.random() * 0.004 + 0.002;
            
            // Glowing neon red hues
            const h = Math.random() < 0.5 ? 0 : 355;
            this.color = `hsla(${h}, 100%, 50%, `;
        }

        update() {
            this.y += this.vy;
            this.x += this.vx;
            this.life -= this.decay;

            // Float wobble
            this.vx += (Math.random() * 0.02 - 0.01);

            if (this.life <= 0 || this.x < -5 || this.x > width + 5) {
                this.reset();
            }
        }

        draw() {
            ctx.fillStyle = this.color + this.life + ')';
            const px = Math.floor(this.x);
            const py = Math.floor(this.y);
            
            if (this.size === 'cross') {
                // Draw a 3x3 pixel art cross (+)
                ctx.fillRect(px - 1, py, 3, 1);
                ctx.fillRect(px, py - 1, 1, 3);
            } else {
                // Draw a 2x2 pixel art square
                ctx.fillRect(px, py, 1.8, 1.8);
            }
        }
    }

    // Populate particles
    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }

    animate();
}


