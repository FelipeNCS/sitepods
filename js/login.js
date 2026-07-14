document.addEventListener('DOMContentLoaded', () => {
    checkLoggedRedirect();

    // Prefill remembered username
    const rememberedUser = localStorage.getItem('rememberedAdminUser');
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('remember-me');
    if (rememberedUser && usernameInput) {
        usernameInput.value = rememberedUser;
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }

    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});

async function checkLoggedRedirect() {
    try {
        const response = await fetch('/api/admin/check-session');
        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn) {
                // Already logged in, go straight to admin page
                window.location.href = '/admin.html';
            }
        }
    } catch (e) {
        console.error('Falha ao checar sessão ativa', e);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const alertBox = document.getElementById('auth-alert');
    
    if (!usernameInput || !passwordInput) return;
    
    const usernameVal = usernameInput.value.trim();
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
    
    const payload = {
        username: usernameVal,
        password: passwordInput.value,
        rememberMe: rememberMe
    };

    if (rememberMe) {
        localStorage.setItem('rememberedAdminUser', usernameVal);
    } else {
        localStorage.removeItem('rememberedAdminUser');
    }

    if (alertBox) alertBox.style.display = 'none';

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // Login successful
            showToast('Login efetuado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = '/admin.html';
            }, 800);
        } else {
            const data = await response.json();
            if (alertBox) {
                alertBox.textContent = data.error || 'Credenciais inválidas!';
                alertBox.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('Erro de requisição durante o login', err);
        if (alertBox) {
            alertBox.textContent = 'Erro ao se conectar ao servidor.';
            alertBox.style.display = 'block';
        }
    }
}
