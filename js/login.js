document.addEventListener('DOMContentLoaded', () => {
    checkLoggedRedirect();

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
    const alertBox = document.getElementById('auth-alert');
    
    if (!usernameInput || !passwordInput) return;
    
    const payload = {
        username: usernameInput.value.trim(),
        password: passwordInput.value
    };

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
