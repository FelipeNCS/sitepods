// JS - LIGA PODS Unified Administrative Dashboard (MySQL Sincronizado)

document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();
    initSmokeCanvas();
    initTabs();
    initDeductionPreviews();
    
    // Inicialização de Dados
    loadSales();
    loadProducts();
    loadWhatsAppOrders();

    // Sincronização periódica a cada 10 segundos
    setInterval(() => {
        loadSales(true); // silent load
        loadProducts(true); // silent load
        loadWhatsAppOrders(true); // silent load
    }, 10000);

    // Ouvintes para o Modal de Pedidos WhatsApp
    const salesAlertBox = document.getElementById('stat-sales-alert-box');
    const whatsappModal = document.getElementById('whatsapp-orders-modal');
    const btnCloseWhatsappModal = document.getElementById('btn-close-whatsapp-modal');

    if (salesAlertBox && whatsappModal) {
        salesAlertBox.addEventListener('click', () => {
            loadWhatsAppOrders();
            whatsappModal.classList.remove('hidden');
        });
    }
    if (btnCloseWhatsappModal && whatsappModal) {
        btnCloseWhatsappModal.addEventListener('click', () => {
            whatsappModal.classList.add('hidden');
        });
    }

    // --- FORMULÁRIOS EVENT LISTENERS ---
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Registrar Venda
    const saleForm = document.getElementById('sale-form');
    if (saleForm) {
        saleForm.addEventListener('submit', handleAddSale);
    }

    // Adicionar Novo Pod (Catálogo)
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }

    // Cadastrar Novo Admin
    const registerAdminForm = document.getElementById('register-admin-form');
    if (registerAdminForm) {
        registerAdminForm.addEventListener('submit', handleRegisterAdmin);
    }

    // Salvar Promoção do Site
    const sitePromoForm = document.getElementById('site-promo-form');
    if (sitePromoForm) {
        sitePromoForm.addEventListener('submit', handleSavePromo);
    }

    // Drag and Drop Upload Area para Imagens de Pods
    const uploadArea = document.getElementById('image-upload-area');
    const fileInput = document.getElementById('image-file-input');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleImagePreview(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleImagePreview(fileInput.files[0]);
            }
        });
    }

    // Edição Modal Event Listeners
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', closeEditModal);
    }

    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleSaveEditSale);
    }

    // Fechar Dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.matches('.pixel-btn-dropdown')) {
            document.querySelectorAll('.pixel-dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });
});

// === ESTADO GLOBAL ===
let sales = [];
let storefrontProducts = [];
let selectedImageFile = null;

function normalizePartnerName(name) {
    if (!name) return 'Lipe';
    const clean = name.trim().toLowerCase();
    if (clean === 'lipe') return 'Lipe';
    if (clean === 'anna') return 'Anna';
    if (clean === 'leon') return 'Leon';
    return 'Lipe';
}

// === SEÇÃO 1: VERIFICAÇÃO DE SESSÃO ===
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin/check-session');
        if (!response.ok) {
            window.location.href = '/login.html';
        }
    } catch (e) {
        window.location.href = '/login.html';
    }
}

// === SEÇÃO 2: ABAS DE NAVEGAÇÃO ===
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetTab = tab.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');

            // Swap sidebars if Configuration tab is selected
            const defaultSidebar = document.getElementById('default-sidebar');
            const configSidebar = document.getElementById('config-sidebar');
            if (defaultSidebar && configSidebar) {
                if (targetTab === 'tab-produtos') {
                    defaultSidebar.classList.add('hidden');
                    configSidebar.classList.remove('hidden');
                    
                    // Trigger click on Cadastrar Produto default subpanel option
                    const btnOptProd = document.getElementById('btn-opt-produtos');
                    if (btnOptProd) btnOptProd.click();
                } else {
                    defaultSidebar.classList.remove('hidden');
                    configSidebar.classList.add('hidden');
                }
            }
        });
    });

    // Wire up site settings option buttons
    const btnOptProd = document.getElementById('btn-opt-produtos');
    const btnOptPromo = document.getElementById('btn-opt-promocao');
    const subpanelProd = document.getElementById('subpanel-produtos');
    const subpanelPromo = document.getElementById('subpanel-promocao');

    if (btnOptProd && btnOptPromo && subpanelProd && subpanelPromo) {
        btnOptProd.addEventListener('click', () => {
            btnOptProd.classList.add('active');
            btnOptPromo.classList.remove('active');
            subpanelProd.classList.remove('hidden');
            subpanelPromo.classList.add('hidden');
        });

        btnOptPromo.addEventListener('click', () => {
            btnOptPromo.classList.add('active');
            btnOptProd.classList.remove('active');
            subpanelPromo.classList.remove('hidden');
            subpanelProd.classList.add('hidden');
            loadPromoSettings(); // load promo configuration on demand
        });
    }
}

// === SEÇÃO 3: EFEITO VISUAL DE JUROS (PREVIEW) ===
function initDeductionPreviews() {
    const isCredit = document.getElementById('is-credit');
    const creditFields = document.getElementById('credit-fields');
    const priceInput = document.getElementById('product-price');
    const interestInput = document.getElementById('interest-rate');
    const liveValue = document.getElementById('live-total-value');

    // Toggle Credit fields
    isCredit.addEventListener('change', () => {
        if (isCredit.checked) {
            creditFields.classList.remove('hidden');
            document.getElementById('due-date').required = true;
        } else {
            creditFields.classList.add('hidden');
            document.getElementById('due-date').required = false;
            document.getElementById('due-date').value = '';
        }
        calculateLiveInterest();
    });

    const calculateLiveInterest = () => {
        const price = parseFloat(priceInput.value) || 0;
        const interest = parseFloat(interestInput.value) || 0;
        let total = price;
        if (isCredit.checked && interest > 0) {
            total = price + (price * (interest / 100));
        }
        liveValue.textContent = `R$ ${total.toFixed(2)}`;
    };

    priceInput.addEventListener('input', calculateLiveInterest);
    interestInput.addEventListener('input', calculateLiveInterest);

    // Edit modal live interest
    const editIsCredit = document.getElementById('edit-is-credit');
    const editCreditInputs = document.getElementById('edit-credit-inputs');
    const editPriceInput = document.getElementById('edit-product-price');
    const editInterestInput = document.getElementById('edit-interest-rate');
    const editLiveValue = document.getElementById('edit-live-total-value');

    editIsCredit.addEventListener('change', () => {
        if (editIsCredit.checked) {
            editCreditInputs.classList.remove('hidden');
            document.getElementById('edit-due-date').required = true;
        } else {
            editCreditInputs.classList.add('hidden');
            document.getElementById('edit-due-date').required = false;
        }
        calculateEditLiveInterest();
    });

    const calculateEditLiveInterest = () => {
        const price = parseFloat(editPriceInput.value) || 0;
        const interest = parseFloat(editInterestInput.value) || 0;
        let total = price;
        if (editIsCredit.checked && interest > 0) {
            total = price + (price * (interest / 100));
        }
        editLiveValue.textContent = `R$ ${total.toFixed(2)}`;
    };

    editPriceInput.addEventListener('input', calculateEditLiveInterest);
    editInterestInput.addEventListener('input', calculateEditLiveInterest);
}

// === SEÇÃO 4: SISTEMA DE TOAST & AUDIO ===
function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;

    toast.className = 'toast-container';
    if (type === 'success') {
        toast.classList.add('toast-success');
        playAudio('sound-success');
    } else if (type === 'error') {
        playAudio('sound-error');
    }

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}

function playAudio(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio auto-play blocked by browser.'));
    }
}

// === SEÇÃO 5: CARREGAR & RENDERIZAR VENDAS (MYSQL) ===
async function loadSales(silent = false) {
    try {
        const response = await fetch('/api/admin/sales');
        if (!response.ok) throw new Error();
        sales = await response.json();
        
        renderSalesTables();
        updateDashboardStats();
        updateCustomersDatalist();
    } catch (e) {
        if (!silent) showToast('Falha ao obter histórico de vendas.', 'error');
    }
}

function updateCustomersDatalist() {
    const datalist = document.getElementById('customers-datalist');
    if (!datalist) return;
    
    // Get unique customer names from sales
    const uniqueCustomers = Array.from(new Set(sales.map(s => (s.customer || '').trim()).filter(Boolean)));
    
    datalist.innerHTML = '';
    uniqueCustomers.sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });
}

function renderSalesTables() {
    const creditBody = document.getElementById('table-body-credit');
    const cashBody = document.getElementById('table-body-cash');
    const customerBody = document.getElementById('table-body-customers');

    if (!creditBody || !cashBody || !customerBody) return;

    // Filtros de Vendas
    const creditSales = sales.filter(s => s.isCredit && !s.isPaid);
    const cashSales = sales.filter(s => !s.isCredit || s.isPaid);

    // 1. Renderizar Fiados
    if (creditSales.length === 0) {
        creditBody.innerHTML = `<tr><td colspan="9" class="text-center">Nenhum fiado pendente encontrado!</td></tr>`;
    } else {
        creditBody.innerHTML = '';
        creditSales.forEach(s => {
            const tr = document.createElement('tr');
            const total = s.price + (s.price * (s.interestRate / 100)) + s.shipping;
            const statusInfo = getCreditStatus(s.dueDate);
            
            tr.innerHTML = `
                <td style="font-weight:700;">${s.customer}</td>
                <td><span class="badge" style="color:var(--neon-purple); border-color:var(--neon-purple);">${s.partner}</span></td>
                <td>${s.product}</td>
                <td>R$ ${(s.price + s.shipping).toFixed(2)}</td>
                <td>${s.interestRate}%</td>
                <td class="text-yellow" style="font-weight:700;">R$ ${total.toFixed(2)}</td>
                <td>${formatDateDisplay(s.dueDate)}</td>
                <td><span class="badge ${statusInfo.class}">${statusInfo.text}</span></td>
                <td style="text-align: center;">
                    <div class="pixel-dropdown">
                        <button class="pixel-btn-dropdown" onclick="toggleDropdown(event, ${s.id})">⋮</button>
                        <div id="dropdown-${s.id}" class="pixel-dropdown-menu hidden">
                            <button class="dropdown-item btn-pay" onclick="paySale(${s.id})">✔ Recebido</button>
                            <button class="dropdown-item" onclick="openEditModal(${s.id})">✏ Editar</button>
                            <button class="dropdown-item" onclick="changeSalePartner(${s.id})">👥 Mudar Sócio</button>
                            <button class="dropdown-item btn-delete" onclick="deleteSale(${s.id})">❌ Excluir</button>
                        </div>
                    </div>
                </td>
            `;
            creditBody.appendChild(tr);
        });
    }

    // 2. Renderizar Vendas à Vista (Histórico)
    if (cashSales.length === 0) {
        cashBody.innerHTML = `<tr><td colspan="7" class="text-center">Nenhum faturamento registrado!</td></tr>`;
    } else {
        cashBody.innerHTML = '';
        cashSales.forEach(s => {
            const tr = document.createElement('tr');
            const total = s.price + (s.price * (s.interestRate / 100)) + s.shipping;
            tr.innerHTML = `
                <td>${s.saleDate}</td>
                <td><span class="badge" style="color:var(--neon-purple); border-color:var(--neon-purple);">${s.partner}</span></td>
                <td style="font-weight:700;">${s.customer}</td>
                <td>${s.product}</td>
                <td>R$ ${s.shipping.toFixed(2)}</td>
                <td class="text-green" style="font-weight:700;">R$ ${total.toFixed(2)}</td>
                <td style="text-align: center;">
                    <div class="pixel-dropdown">
                        <button class="pixel-btn-dropdown" onclick="toggleDropdown(event, ${s.id})">⋮</button>
                        <div id="dropdown-${s.id}" class="pixel-dropdown-menu hidden">
                            <button class="dropdown-item" onclick="changeSalePartner(${s.id})">👥 Mudar Sócio</button>
                            <button class="dropdown-item btn-delete" onclick="deleteSale(${s.id})">❌ Excluir</button>
                        </div>
                    </div>
                </td>
            `;
            cashBody.appendChild(tr);
        });
    }

    // 3. Renderizar Banco de Clientes
    const customersData = getCustomersAggregatedData();
    if (customersData.length === 0) {
        customerBody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum cliente cadastrado!</td></tr>`;
    } else {
        customerBody.innerHTML = '';
        customersData.forEach(c => {
            const tr = document.createElement('tr');
            const contactText = c.contact ? c.contact : 'Sem contato';
            const whatsappLink = c.contact ? `<a href="https://wa.me/55${c.contact.replace(/\D/g,'')}" target="_blank" class="whatsapp-link">📲 ${contactText}</a>` : 'N/A';
            const relationship = c.debt > 0 ? `<span class="badge badge-today">Devedor</span>` : `<span class="badge badge-paid">Bom Pagador</span>`;
            
            tr.innerHTML = `
                <td style="font-weight:700;">${c.name}</td>
                <td>${whatsappLink}</td>
                <td>${c.purchasesCount} un.</td>
                <td class="text-green">R$ ${c.totalSpent.toFixed(2)}</td>
                <td class="${c.debt > 0 ? 'text-red' : 'text-green'}" style="font-weight:700;">R$ ${c.debt.toFixed(2)}</td>
                <td>${relationship}</td>
            `;
            customerBody.appendChild(tr);
        });
    }
}

// Auxiliares para o Banco de Clientes
function getCustomersAggregatedData() {
    const clientsMap = {};

    sales.forEach(s => {
        const clientName = s.customer.trim();
        if (!clientsMap[clientName]) {
            clientsMap[clientName] = {
                name: clientName,
                contact: s.contact,
                purchasesCount: 0,
                totalSpent: 0,
                debt: 0
            };
        }

        const total = s.price + (s.price * (s.interestRate / 100)) + s.shipping;

        if (s.isPaid || !s.isCredit) {
            clientsMap[clientName].purchasesCount += 1;
            clientsMap[clientName].totalSpent += total;
        } else {
            // Se for fiado ativo (não pago)
            clientsMap[clientName].debt += total;
        }

        // Atualizar contato com o mais recente inserido
        if (s.contact) {
            clientsMap[clientName].contact = s.contact;
        }
    });

    return Object.values(clientsMap).sort((a, b) => b.totalSpent - a.totalSpent);
}

// Helpers para Status de Vencimento
function getCreditStatus(dueDateStr) {
    if (!dueDateStr) return { text: 'PENDENTE', class: 'badge-pending' };
    
    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return { text: 'PENDENTE', class: 'badge-pending' };
    
    // Configura datas no horário local do browser
    const due = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    
    // Zera horas para bater cálculo de dias inteiros
    due.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { text: 'VENCIDO', class: 'badge-overdue' };
    } else if (diffDays === 0) {
        return { text: 'DIA DE PAGAR', class: 'badge-today' };
    } else if (diffDays <= 2) {
        return { text: 'PERTO DE PAGAR', class: 'badge-near' };
    } else {
        return { text: 'PENDENTE', class: 'badge-pending' };
    }
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
}

// dropdown toggle
function toggleDropdown(e, saleId) {
    e.stopPropagation();
    const targetMenu = document.getElementById(`dropdown-${saleId}`);
    
    document.querySelectorAll('.pixel-dropdown-menu').forEach(menu => {
        if (menu.id !== `dropdown-${saleId}`) {
            menu.classList.add('hidden');
        }
    });
    
    if (targetMenu) {
        targetMenu.classList.toggle('hidden');
    }
}

// === SEÇÃO 6: CRIAÇÃO, EDIÇÃO E EXCLUSÃO DE VENDAS ===

async function handleAddSale(e) {
    e.preventDefault();
    
    const product = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const customer = document.getElementById('customer-name').value.trim();
    const contact = document.getElementById('customer-contact').value.trim();
    const shipping = parseFloat(document.getElementById('shipping-fee').value) || 0;
    const partner = normalizePartnerName(document.getElementById('partner-select').value);
    const isCredit = document.getElementById('is-credit').checked;
    
    let dueDate = '';
    let interestRate = 0;
    
    if (isCredit) {
        dueDate = document.getElementById('due-date').value;
        interestRate = parseFloat(document.getElementById('interest-rate').value) || 0;
    }

    // Normalize customer name casing using existing sales list
    let normalizedCustomer = customer;
    const existingSale = sales.find(s => s.customer && s.customer.trim().toLowerCase() === customer.toLowerCase());
    if (existingSale) {
        normalizedCustomer = existingSale.customer.trim();
    }

    const payload = {
        id: Date.now(), // ID do timestamp
        product,
        price,
        customer: normalizedCustomer,
        contact,
        shipping,
        partner,
        isCredit,
        dueDate,
        interestRate,
        isPaid: !isCredit,
        saleDate: new Date().toLocaleString('pt-BR')
    };

    try {
        const response = await fetch('/api/admin/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Venda registrada com sucesso!', 'success');
            document.getElementById('sale-form').reset();
            document.getElementById('credit-fields').classList.add('hidden');
            document.getElementById('live-total-value').textContent = 'R$ 0,00';
            
            // Recarrega tabelas e produtos (pois o estoque reduziu)
            loadSales();
            loadProducts();
        } else {
            showToast('Erro ao salvar venda no servidor.', 'error');
        }
    } catch (err) {
        showToast('Falha na conexão com o banco.', 'error');
    }
}

async function paySale(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const payload = { ...sale, isPaid: true };

    try {
        const response = await fetch(`/api/admin/sales/${saleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Venda baixada como paga!', 'success');
            loadSales();
        } else {
            showToast('Falha ao dar baixa na venda.', 'error');
        }
    } catch (err) {
        showToast('Erro de rede.', 'error');
    }
}

async function deleteSale(saleId) {
    if (!confirm('Deseja excluir definitivamente este registro de venda?')) return;

    try {
        const response = await fetch(`/api/admin/sales/${saleId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Venda excluída com sucesso!', 'success');
            loadSales();
        } else {
            showToast('Erro ao deletar venda.', 'error');
        }
    } catch (err) {
        showToast('Falha na rede.', 'error');
    }
}

// Modal de edição abrir
function openEditModal(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    document.getElementById('edit-sale-id').value = sale.id;
    document.getElementById('edit-product-name').value = sale.product;
    document.getElementById('edit-product-price').value = sale.price;
    document.getElementById('edit-customer-name').value = sale.customer;
    document.getElementById('edit-customer-contact').value = sale.contact || '';
    document.getElementById('edit-shipping-fee').value = sale.shipping;
    document.getElementById('edit-partner-select').value = sale.partner;
    
    const editIsCredit = document.getElementById('edit-is-credit');
    const editCreditInputs = document.getElementById('edit-credit-inputs');
    
    editIsCredit.checked = sale.isCredit;
    if (sale.isCredit) {
        editCreditInputs.classList.remove('hidden');
        document.getElementById('edit-due-date').value = sale.dueDate;
        document.getElementById('edit-due-date').required = true;
        document.getElementById('edit-interest-rate').value = sale.interestRate;
    } else {
        editCreditInputs.classList.add('hidden');
        document.getElementById('edit-due-date').value = '';
        document.getElementById('edit-due-date').required = false;
        document.getElementById('edit-interest-rate').value = 0;
    }

    // Calcula valor total com juros inicial no modal
    const total = sale.price + (sale.price * (sale.interestRate / 100));
    document.getElementById('edit-live-total-value').textContent = `R$ ${total.toFixed(2)}`;

    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function handleSaveEditSale(e) {
    e.preventDefault();

    const id = document.getElementById('edit-sale-id').value;
    const originalSale = sales.find(s => s.id == id);
    if (!originalSale) return;

    const product = document.getElementById('edit-product-name').value.trim();
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const customer = document.getElementById('edit-customer-name').value.trim();
    const contact = document.getElementById('edit-customer-contact').value.trim();
    const shipping = parseFloat(document.getElementById('edit-shipping-fee').value) || 0;
    const partner = normalizePartnerName(document.getElementById('edit-partner-select').value);
    const isCredit = document.getElementById('edit-is-credit').checked;
    
    let dueDate = '';
    let interestRate = 0;
    
    if (isCredit) {
        dueDate = document.getElementById('edit-due-date').value;
        interestRate = parseFloat(document.getElementById('edit-interest-rate').value) || 0;
    }

    // Normalize customer name casing using existing sales list
    let normalizedCustomer = customer;
    const existingSale = sales.find(s => s.customer && s.customer.trim().toLowerCase() === customer.toLowerCase() && s.id != id);
    if (existingSale) {
        normalizedCustomer = existingSale.customer.trim();
    }

    const payload = {
        ...originalSale,
        product,
        price,
        customer: normalizedCustomer,
        contact,
        shipping,
        partner,
        isCredit,
        dueDate,
        interestRate,
        isPaid: !isCredit ? true : originalSale.isPaid
    };

    try {
        const response = await fetch(`/api/admin/sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Venda editada com sucesso!', 'success');
            closeEditModal();
            loadSales();
        } else {
            showToast('Erro ao atualizar venda.', 'error');
        }
    } catch (err) {
        showToast('Erro de rede.', 'error');
    }
}

// === SEÇÃO 7: ATUALIZAR BALANÇO DE SÓCIOS E FATURAMENTO ===
function updateDashboardStats() {
    let statCash = 0;
    let statCredit = 0;
    let alertTodayCount = 0;

    const partnerStats = {
        Lipe: { cash: 0, credit: 0 },
        Anna: { cash: 0, credit: 0 },
        Leon: { cash: 0, credit: 0 }
    };

    sales.forEach(s => {
        const total = s.price + (s.price * (s.interestRate / 100)) + s.shipping;

        if (s.isCredit && !s.isPaid) {
            // Fiado ativo
            statCredit += total;
            
            const partnerKey = normalizePartnerName(s.partner);
            if (partnerStats[partnerKey]) {
                partnerStats[partnerKey].credit += total;
            }

            // Checar alertas hoje
            const statusInfo = getCreditStatus(s.dueDate);
            if (statusInfo.text === 'DIA DE PAGAR' || statusInfo.text === 'VENCIDO') {
                alertTodayCount += 1;
            }
        } else {
            // Venda à vista ou fiado já pago
            statCash += total;
            
            const partnerKey = normalizePartnerName(s.partner);
            if (partnerStats[partnerKey]) {
                partnerStats[partnerKey].cash += total;
            }
        }
    });

    // Renderiza Estatísticas Gerais
    document.getElementById('stat-cash-total').textContent = `R$ ${statCash.toFixed(2)}`;
    document.getElementById('stat-credit-total').textContent = `R$ ${statCredit.toFixed(2)}`;
    
    const alertLabel = document.getElementById('stat-due-today');
    alertLabel.textContent = alertTodayCount;
    if (alertTodayCount > 0) {
        alertLabel.classList.add('blink');
    } else {
        alertLabel.classList.remove('blink');
    }

    // Renderiza Saldos dos Sócios
    // Lipe
    document.getElementById('partner-total-lipe').textContent = `R$ ${partnerStats.Lipe.cash.toFixed(2)}`;
    document.getElementById('partner-credit-lipe').textContent = `(Fiado: R$ ${partnerStats.Lipe.credit.toFixed(2)})`;
    // Anna
    document.getElementById('partner-total-anna').textContent = `R$ ${partnerStats.Anna.cash.toFixed(2)}`;
    document.getElementById('partner-credit-anna').textContent = `(Fiado: R$ ${partnerStats.Anna.credit.toFixed(2)})`;
    // Leon
    document.getElementById('partner-total-leon').textContent = `R$ ${partnerStats.Leon.cash.toFixed(2)}`;
    document.getElementById('partner-credit-leon').textContent = `(Fiado: R$ ${partnerStats.Leon.credit.toFixed(2)})`;
}

// === SEÇÃO 8: GERENCIADOR DE PODS (LOJA PRINCIPAL) ===

async function loadProducts(silent = false) {
    const tableBody = document.getElementById('admin-products-table-body');
    const datalist = document.getElementById('products-datalist');
    if (!tableBody || !datalist) return;

    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error();
        
        storefrontProducts = await response.json();

        // 1. Popula datalist de sugestão de vendas
        datalist.innerHTML = '';
        storefrontProducts.forEach(prod => {
            if (prod.model) {
                const opt1 = document.createElement('option');
                opt1.value = `${prod.model} - ${prod.name}`;
                datalist.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = `${prod.model} ${prod.name}`;
                datalist.appendChild(opt2);
            }

            const opt3 = document.createElement('option');
            opt3.value = prod.name;
            datalist.appendChild(opt3);
        });

        // Event listener para auto-completar preço
        const productInput = document.getElementById('product-name');
        if (productInput) {
            // remove listeners antigos
            const newProdInput = productInput.cloneNode(true);
            productInput.parentNode.replaceChild(newProdInput, productInput);
            
            newProdInput.addEventListener('change', () => {
                const selectedVal = newProdInput.value.trim();
                const matched = storefrontProducts.find(p => {
                    const fullName = p.model ? `${p.model} - ${p.name}` : p.name;
                    return selectedVal.equalsIgnoreCase(fullName) || selectedVal.equalsIgnoreCase(p.name);
                });
                if (matched) {
                    document.getElementById('product-price').value = matched.price.toFixed(2);
                    // Dispara evento input para recalcular os juros do fiado
                    document.getElementById('product-price').dispatchEvent(new Event('input'));
                }
            });
        }

        // Helper case-insensitive
        String.prototype.equalsIgnoreCase = function (compareString) {
            return this.toLowerCase() === compareString.toLowerCase();
        };

        // 2. Renderiza catálogo de produtos da loja no painel
        if (storefrontProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="color: #8a8a93; padding: 2rem;">
                        Nenhum pod cadastrado na loja. Use o formulário ao lado.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = '';
        storefrontProducts.forEach(product => {
            const tr = document.createElement('tr');
            tr.id = `admin-row-${product.id}`;
            const imgPath = product.imagePath ? product.imagePath : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=50&auto=format&fit=crop&q=60';

            tr.innerHTML = `
                <td>
                    <div class="table-product-info">
                        <img src="${imgPath}" alt="${product.name}" class="table-product-img">
                        <div class="table-product-name">${product.name}</div>
                    </div>
                </td>
                <td>
                    <span class="table-product-model">${product.model || 'Descartável'}</span>
                </td>
                <td>
                    R$ ${product.price.toFixed(2)}
                </td>
                <td>
                    <div class="admin-stock-control">
                        <button class="stock-control-btn" onclick="modifyStock(${product.id}, -1)">-</button>
                        <input type="number" class="stock-control-input" id="stock-input-${product.id}" value="${product.quantity}" min="0" onblur="updateStockOnBlur(${product.id}, this.value)">
                        <button class="stock-control-btn" onclick="modifyStock(${product.id}, 1)">+</button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="btn-delete-prod" onclick="deleteProduct(${product.id})" title="Remover Produto">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (e) {
        if (!silent) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger);">Falha ao buscar produtos da loja.</td></tr>`;
        }
    }
}

// Funções para controle de estoque de pods
async function modifyStock(productId, change) {
    const input = document.getElementById(`stock-input-${productId}`);
    if (!input) return;

    let newQty = parseInt(input.value) + change;
    if (newQty < 0) newQty = 0;

    input.value = newQty;
    await saveStockUpdate(productId, newQty);
}

async function updateStockOnBlur(productId, value) {
    let qty = parseInt(value);
    if (isNaN(qty) || qty < 0) {
        qty = 0;
    }
    await saveStockUpdate(productId, qty);
}

async function saveStockUpdate(productId, quantity) {
    try {
        const response = await fetch(`/api/admin/products/${productId}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });

        if (response.ok) {
            showToast('Estoque atualizado com sucesso!', 'success');
            loadProducts(true); // silent update
        } else {
            showToast('Falha ao atualizar estoque no servidor.', 'error');
            loadProducts();
        }
    } catch (e) {
        showToast('Erro de rede ao salvar estoque.', 'error');
        loadProducts();
    }
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza de que deseja remover este pod definitivamente?')) return;

    try {
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Produto removido do catálogo com sucesso!', 'success');
            loadProducts();
        } else {
            showToast('Erro ao remover produto.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão ao remover produto.', 'error');
    }
}

// Upload de imagem e cadastro do produto
function handleImagePreview(file) {
    selectedImageFile = file;
    const previewEl = document.getElementById('image-preview-el');
    const instruction = document.getElementById('upload-instruction');
    
    if (previewEl && instruction) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewEl.src = e.target.result;
            previewEl.style.display = 'block';
            instruction.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function resetUploadArea() {
    selectedImageFile = null;
    const fileInput = document.getElementById('image-file-input');
    if (fileInput) fileInput.value = '';
    
    const previewEl = document.getElementById('image-preview-el');
    const instruction = document.getElementById('upload-instruction');
    if (previewEl && instruction) {
        previewEl.src = '';
        previewEl.style.display = 'none';
        instruction.style.display = 'block';
    }
}

async function handleAddProduct(e) {
    e.preventDefault();

    const name = document.getElementById('prod-name').value.trim();
    const model = document.getElementById('prod-model').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const quantity = parseInt(document.getElementById('prod-quantity').value);
    const description = document.getElementById('prod-desc').value.trim();

    if (!name || !model || isNaN(price) || isNaN(quantity)) {
        showToast('Preencha os campos obrigatórios.', 'error');
        return;
    }

    const submitBtn = document.getElementById('btn-add-product');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
        let imagePath = '';

        if (selectedImageFile) {
            const formData = new FormData();
            formData.append('file', selectedImageFile);

            const uploadResponse = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                imagePath = uploadData.imageUrl;
            } else {
                throw new Error('Falha no upload da imagem.');
            }
        }

        const payload = { name, model, price, quantity, description, imagePath };

        const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Pod cadastrado com sucesso na loja!', 'success');
            document.getElementById('add-product-form').reset();
            resetUploadArea();
            loadProducts();
        } else {
            const errData = await response.json();
            showToast(errData.error || 'Erro ao cadastrar produto.', 'error');
        }

    } catch (err) {
        showToast(err.message || 'Falha na conexão com o servidor.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'CADASTRAR PRODUTO';
    }
}

// === SEÇÃO 9: CADASTRAR NOVO ADMINISTRADOR ===
async function handleRegisterAdmin(e) {
    e.preventDefault();

    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !password) {
        showToast('Usuário e senha são obrigatórios.', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('A senha precisa ter no mínimo 6 caracteres.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            showToast('Novo administrador cadastrado!', 'success');
            document.getElementById('register-admin-form').reset();
        } else {
            const data = await response.json();
            showToast(data.error || 'Erro ao cadastrar administrador.', 'error');
        }
    } catch (err) {
        showToast('Erro de rede ao salvar administrador.', 'error');
    }
}

// === SEÇÃO 10: LOGOUT ===
async function handleLogout() {
    try {
        const response = await fetch('/api/admin/logout', { method: 'POST' });
        if (response.ok) {
            showToast('Sessão encerrada.', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 800);
        }
    } catch (e) {
        showToast('Erro ao desconectar.', 'error');
    }
}

// === SEÇÃO 11: CANVAS ANIMAÇÃO DE FUMAÇA VERMELHA E PARTÍCULAS (PIXEL ART) ===
function initSmokeCanvas() {
    const canvas = document.getElementById('smokeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.style.imageRendering = 'pixelated';
    
    const scale = 5; // pixel size scale
    let width = canvas.width = Math.floor(window.innerWidth / scale);
    let height = canvas.height = Math.floor(window.innerHeight / scale);

    window.addEventListener('resize', () => {
        width = canvas.width = Math.floor(window.innerWidth / scale);
        height = canvas.height = Math.floor(window.innerHeight / scale);
    });

    const particles = [];
    const maxParticles = 60;

    class RedParticle {
        constructor() {
            this.reset();
            this.y = Math.random() * height; // pre-distribution
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + Math.random() * 10;
            this.type = Math.random() < 0.4 ? 'cross' : 'square';
            this.vy = -(Math.random() * 0.4 + 0.1);
            this.vx = Math.random() * 0.3 - 0.15;
            this.life = Math.random() * 0.7 + 0.3;
            this.decay = Math.random() * 0.003 + 0.001;
            
            const hues = [355, 0, 5];
            const h = hues[Math.floor(Math.random() * hues.length)];
            this.color = `hsla(${h}, 100%, 50%, `;
        }

        update() {
            this.y += this.vy;
            this.x += this.vx;
            this.life -= this.decay;

            this.vx += (Math.random() * 0.02 - 0.01);

            if (this.life <= 0 || this.x < -5 || this.x > width + 5) {
                this.reset();
            }
        }

        draw() {
            ctx.fillStyle = this.color + this.life + ')';
            const px = Math.floor(this.x);
            const py = Math.floor(this.y);
            
            if (this.type === 'cross') {
                ctx.fillRect(px - 1, py, 3, 1);
                ctx.fillRect(px, py - 1, 1, 3);
            } else {
                ctx.fillRect(px, py, 2, 2);
            }
        }
    }

    for (let i = 0; i < maxParticles; i++) {
        particles.push(new RedParticle());
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

// === SEÇÃO 12: PEDIDOS DO WHATSAPP E ALERTAS DE VENDA ===
let whatsappOrders = [];

async function loadWhatsAppOrders(silent = false) {
    const tableBody = document.getElementById('table-body-whatsapp-orders');
    const alertLabel = document.getElementById('stat-sales-alert');
    if (!tableBody || !alertLabel) return;

    try {
        const response = await fetch('/api/admin/orders');
        if (!response.ok) throw new Error();
        whatsappOrders = await response.json();

        // Update alert counter
        alertLabel.textContent = whatsappOrders.length;
        if (whatsappOrders.length > 0) {
            alertLabel.classList.add('blink');
        } else {
            alertLabel.classList.remove('blink');
        }

        // Render modal table rows
        if (whatsappOrders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum pedido pendente.</td></tr>`;
        } else {
            tableBody.innerHTML = '';
            whatsappOrders.forEach(order => {
                const tr = document.createElement('tr');
                tr.id = `whatsapp-order-row-${order.id}`;

                let itemsSummary = '';
                try {
                    const items = JSON.parse(order.items);
                    itemsSummary = items.map(item => `${item.qty}x ${item.name}`).join(', ');
                } catch (e) {
                    itemsSummary = order.items;
                }

                // Escape double quotes for JSON payload parameter
                const itemsEscaped = order.items.replace(/"/g, '&quot;');

                tr.innerHTML = `
                    <td>${order.createdAt}</td>
                    <td style="font-weight:700;">${itemsSummary}</td>
                    <td class="text-green" style="font-weight:700;">R$ ${order.total.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button class="pixel-btn success-glow" onclick="registerSaleFromOrder('${order.id}', '${itemsEscaped}', ${order.total})" title="Converter em Venda" style="padding: 4px 8px; margin-right: 5px;">📦</button>
                        <button class="pixel-btn-danger" onclick="deleteWhatsAppOrder('${order.id}')" title="Excluir Pedido" style="padding: 4px 8px;">❌</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (e) {
        if (!silent) console.error('Erro ao buscar pedidos do WhatsApp', e);
    }
}

async function deleteWhatsAppOrder(orderId, silent = false) {
    if (!silent && !confirm('Deseja excluir definitivamente este pedido do WhatsApp?')) return;

    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (!silent) showToast('Pedido removido com sucesso!', 'success');
            loadWhatsAppOrders(true);
        } else {
            if (!silent) showToast('Falha ao remover pedido.', 'error');
        }
    } catch (err) {
        if (!silent) showToast('Erro de rede.', 'error');
    }
}

function registerSaleFromOrder(orderId, itemsArrayOrStr, total) {
    let productName = '';
    try {
        if (Array.isArray(itemsArrayOrStr)) {
            productName = itemsArrayOrStr.map(item => `${item.qty}x ${item.name}`).join(' + ');
        } else if (typeof itemsArrayOrStr === 'string') {
            const parsed = JSON.parse(itemsArrayOrStr);
            productName = parsed.map(item => `${item.qty}x ${item.name}`).join(' + ');
        }
    } catch (e) {
        productName = 'Pedido WhatsApp';
    }

    // Set form fields
    const productInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    if (productInput) productInput.value = productName;
    if (priceInput) {
        priceInput.value = parseFloat(total).toFixed(2);
        // Trigger live price calculate preview
        priceInput.dispatchEvent(new Event('input'));
    }

    // Close WhatsApp modal
    const whatsappModal = document.getElementById('whatsapp-orders-modal');
    if (whatsappModal) whatsappModal.classList.add('hidden');

    // Switch to VENDER POD tab
    const venderTab = document.querySelector('.nav-tab[data-tab="tab-vender"]');
    if (venderTab) venderTab.click();

    // Silently remove order from pending database so it doesn't alert anymore
    deleteWhatsAppOrder(orderId, true);
}

// Expor funções para chamadas onclick em HTML gerado dinamicamente
window.deleteWhatsAppOrder = deleteWhatsAppOrder;
window.registerSaleFromOrder = registerSaleFromOrder;

// === SEÇÃO 13: CONFIGURAÇÕES DE PROMOÇÃO DO SITE ===
async function loadPromoSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
            const settings = await response.json();
            const promoActiveCheckbox = document.getElementById('promo-active-checkbox');
            const promoTextInput = document.getElementById('promo-text-input');
            
            if (promoActiveCheckbox) {
                promoActiveCheckbox.checked = settings.promo_active === '1';
            }
            if (promoTextInput) {
                promoTextInput.value = settings.promo_text || '';
            }
        }
    } catch (e) {
        console.error('Falha ao carregar configurações de promoção', e);
    }
}

async function handleSavePromo(e) {
    if (e) e.preventDefault();

    const promoActiveCheckbox = document.getElementById('promo-active-checkbox');
    const promoTextInput = document.getElementById('promo-text-input');
    if (!promoActiveCheckbox || !promoTextInput) return;

    const payload = {
        promo_active: promoActiveCheckbox.checked,
        promo_text: promoTextInput.value.trim()
    };

    try {
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Configurações de promoção salvas!', 'success');
        } else {
            showToast('Erro ao salvar configurações de promoção.', 'error');
        }
    } catch (err) {
        showToast('Erro de rede ao salvar.', 'error');
    }
}

// Auxiliar para transferir venda de sócio
async function changeSalePartner(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const newPartner = prompt("Digite o nome do novo sócio (Lipe, Anna ou Leon):", sale.partner);
    if (!newPartner) return;

    const cleanName = newPartner.trim();
    const validPartners = ["Lipe", "Anna", "Leon"];
    const matched = validPartners.find(p => p.toLowerCase() === cleanName.toLowerCase());

    if (!matched) {
        showToast("Sócio inválido! Escolha entre Lipe, Anna ou Leon.", "error");
        return;
    }

    const payload = { ...sale, partner: matched };

    try {
        const response = await fetch(`/api/admin/sales/${saleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(`Venda transferida para ${matched}!`, "success");
            loadSales();
        } else {
            showToast("Falha ao transferir venda.", "error");
        }
    } catch (err) {
        showToast("Erro de conexão.", "error");
    }
}
