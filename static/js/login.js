// JavaScript específico para a página de login

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const recoveryForm = document.getElementById('recoveryForm');
    const msgDiv = document.getElementById('login-message');
    const recoveryMsgDiv = document.getElementById('recovery-message');
    
    // Elementos dos cards
    const loginCard = document.getElementById('loginCard');
    const recoveryCard = document.getElementById('recoveryCard');
    const showRecoveryBtn = document.getElementById('showRecovery');
    const showLoginBtn = document.getElementById('showLogin');

    // Função para mostrar alertas do SweetAlert2
    function showSwal(type, title, text) {
        Swal.fire({
            icon: type,
            title: title,
            text: text,
            confirmButtonColor: '#003d99'
        });
    }

    // Função para iniciar contagem regressiva
    function startCountdown(seconds, element) {
        let remaining = seconds;

        const interval = setInterval(() => {
            const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
            const secs = String(remaining % 60).padStart(2, "0");
            element.textContent = `Muitas tentativas. Tente novamente em ${mins}:${secs}`;

            if (remaining <= 0) {
                clearInterval(interval);
                element.textContent = ""; // limpa mensagem ao final
            }

            remaining--;
        }, 1000);
    }

    // Função para adicionar estado de loading ao botão
    function setLoadingState(button, isLoading, isRecovery = false) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            if (isRecovery) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin h-5 w-5 mr-2"></i>Enviando...';
            } else {
                button.innerHTML = '<i class="fas fa-spinner fa-spin h-5 w-5 mr-2"></i>Entrando...';
            }
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (isRecovery) {
                button.innerHTML = '<i class="fas fa-paper-plane h-5 w-5 mr-2"></i>Enviar';
            } else {
                button.innerHTML = '<i class="fas fa-sign-in-alt h-5 w-5 mr-2"></i>Entrar';
            }
        }
    }

    // Função para animar a troca de cards
    function animateCardTransition(showRecovery = true) {
        if (showRecovery) {
            // Mostrar card de recuperação
            loginCard.classList.remove('active');
            loginCard.classList.add('inactive');
            recoveryCard.classList.remove('inactive');
            recoveryCard.classList.add('active');
        } else {
            // Mostrar card de login
            recoveryCard.classList.remove('active');
            recoveryCard.classList.add('inactive');
            loginCard.classList.remove('inactive');
            loginCard.classList.add('active');
        }
    }

    // Event listener para o formulário de login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        
        msgDiv.textContent = ""; // limpa mensagens anteriores
        setLoadingState(submitButton, true);

        try {
            const response = await fetch("/login", {
                method: "POST",
                body: formData,
            });

            // Se for redirecionado, recarrega a página (Flask faz redirect)
            if (response.redirected) {
                Swal.fire({
                    icon: "success",
                    title: "Login realizado!",
                    text: "Você será redirecionado...",
                    confirmButtonColor: '#003d99',
                    timer: 1500,
                    showConfirmButton: false
                });
                setTimeout(() => {
                    window.location.href = response.url;
                }, 1500);
                return;
            }

            if (!response.ok) {
                let errorMessage = "Erro ao fazer login.";

                if (response.status === 429) {
                    let waitTime = parseInt(response.headers.get("Retry-After")) || 60;
                    startCountdown(waitTime, msgDiv);
                    showSwal("warning", "Muitas tentativas", "Tente novamente em alguns instantes.");
                    return;
                }

                if (response.status === 405) {
                    errorMessage = "Método não permitido. Verifique a requisição.";
                } else {
                    try {
                        const errData = await response.json();
                        if (errData.message) {
                            errorMessage = errData.message;
                        }
                    } catch (err) {
                        // Ignora erro de parsing JSON
                    }
                }

                showSwal("error", "Erro", errorMessage);
                return;
            }

            // Se não houve redirect, provavelmente credenciais inválidas
            showSwal("error", "Erro", "Credenciais inválidas");
            
        } catch (error) {
            console.error("Erro:", error);
            showSwal("error", "Erro", "Erro inesperado na conexão.");
        } finally {
            setLoadingState(submitButton, false);
        }
    });

    // Event listener para o formulário de recuperação
    recoveryForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const email = formData.get('email');
        const terms = formData.get('terms');

        recoveryMsgDiv.textContent = ""; // limpa mensagens anteriores

        // Validação
        if (!email || !email.trim()) {
            recoveryMsgDiv.textContent = "Por favor, insira um e-mail válido.";
            return;
        }
        if (!terms) {
            recoveryMsgDiv.textContent = "Você deve concordar com os termos.";
            return;
        }

        setLoadingState(submitButton, true, true);

        fetch(form.action, {
            method: "POST",
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            setLoadingState(submitButton, false, true);
            if (data.success) {
                showSwal("success", "E-mail enviado!", data.message);
                form.reset();
            } else {
                showSwal("error", "Erro", data.message);
            }
        })
        .catch(() => {
            setLoadingState(submitButton, false, true);
            showSwal("error", "Erro", "Erro inesperado ao enviar o e-mail.");
        });
    });

    // Event listeners para troca de cards
    showRecoveryBtn.addEventListener('click', function(e) {
        e.preventDefault();
        animateCardTransition(true);
    });

    showLoginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        animateCardTransition(false);
    });

    // Validação em tempo real dos campos
    const allInputs = document.querySelectorAll('input[required]');
    allInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
        });

        input.addEventListener('input', function() {
            if (this.value.trim()) {
                this.classList.remove('error');
            }
        });
    });

    // Permitir login com Enter
    const loginInputs = loginForm.querySelectorAll('input[required]');
    loginInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    });

    // Permitir recuperação com Enter
    const recoveryInputs = recoveryForm.querySelectorAll('input[required]');
    recoveryInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                recoveryForm.dispatchEvent(new Event('submit'));
            }
        });
    });

    // Função global para mostrar/ocultar senha
    window.toggleSenha = function(id, btn) {
        const input = document.getElementById(id);
        if (input.type === 'password') {
            input.type = 'text';
            btn.querySelector('i').classList.remove('fa-eye');
            btn.querySelector('i').classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            btn.querySelector('i').classList.remove('fa-eye-slash');
            btn.querySelector('i').classList.add('fa-eye');
        }
    };
});
