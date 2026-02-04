console.log('scripts.js carregado no início');

// Get CSRF token from meta tag
function getCsrfToken() {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    console.log('CSRF Token:', token);
    if (!token) console.error('Token CSRF não encontrado');
    return token;
}

// Show notification with SweetAlert2
function showNotification(message, type = 'success') {
    console.log('Notificação:', { message, type });
    Swal.fire({
        title: type === 'success' ? 'Sucesso!' : type === 'error' ? 'Erro!' : 'Aviso!',
        text: message,
        icon: type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning',
        confirmButtonColor: '#10B981', // Tailwind green-500
        confirmButtonText: 'OK',
        timer: 3000,
        timerProgressBar: true
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            console.log('Notificação fechada por timer');
        }
    });
}

// Modal functions
function showAddUserModal() {
    console.log('Tentando abrir addUserModal');
    const modal = document.getElementById('addUserModal');
    if (!modal) {
        console.error('addUserModal não encontrado');
        showNotification('Erro ao abrir modal de adicionar usuário.', 'error');
        return;
    }
    modal.classList.remove('hidden');
    const form = document.getElementById('addUserForm');
    if (form) form.reset();
}

function showEditUserModal() {
    console.log('Abrindo modal de editar usuário');
    const modal = document.getElementById('editUserModal');
    if (!modal) {
        console.error('Modal editUserModal não encontrado');
        showNotification('Erro ao abrir modal de edição.', 'error');
        return;
    }
    modal.classList.remove('hidden');
}

function closeEditUserModal() {
    console.log('Fechando modal de editar usuário');
    const modal = document.getElementById('editUserModal');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('editUserForm');
    if (form) form.reset();
}

function closeAddUserModal() {
    console.log('Fechando modal de adicionar usuário');
    const modal = document.getElementById('addUserModal');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('addUserForm');
    if (form) form.reset();
}

function showObservation(observation) {
    console.log('Abrindo observationModal com:', observation);
    const modalText = document.getElementById('modalObservationText');
    const modal = document.getElementById('observationModal');
    if (!modalText || !modal) {
        console.error('Elementos não encontrados:', { modalText, modal });
        showNotification('Erro ao abrir observação. Verifique o console.', 'error');
        return;
    }
    modalText.textContent = observation || 'Nenhuma observação disponível.';
    modal.classList.remove('hidden');
}

function closeObservationModal() {
    console.log('Fechando observationModal');
    const modal = document.getElementById('observationModal');
    if (modal) modal.classList.add('hidden');
    else console.error('observationModal não encontrado');
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Delete installation (mantido, mas não usado na página de usuários)
function deleteInstallation(id) {
    Swal.fire({
        title: 'Tem certeza?',
        text: `Deseja excluir esta instalação? Esta ação não pode ser desfeita!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444', // Tailwind red-500
        cancelButtonColor: '#6B7280', // Tailwind gray-500
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/delete_installation/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ id })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Resposta da exclusão:', data);
                if (data.success) {
                    showNotification(data.message, 'success');
                } else {
                    showNotification(data.message, 'error');
                }
                setTimeout(() => {
                    location.reload();
                }, 1500);
            })
            .catch(error => {
                console.error('Erro ao excluir:', error);
                showNotification('Erro ao processar a solicitação.', 'error');
                setTimeout(() => {
                    location.reload();
                }, 1500);
            });
        }
    });
}

// Consolidate DOMContentLoaded listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado');

    // Sidebar and Mobile Menu Handling
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');

    function handleResize() {
        if (window.innerWidth < 768) {
            if (sidebar) sidebar.style.display = 'none';
        } else {
            if (sidebar) sidebar.style.display = '';
            if (mobileSidebar) mobileSidebar.classList.add('-translate-x-full');
            if (mobileOverlay) mobileOverlay.style.display = 'none';
            if (mobileMenu) mobileMenu.style.pointerEvents = 'none';
        }
    }

    function openMenu() {
        if (mobileSidebar && mobileOverlay && mobileMenu) {
            mobileSidebar.classList.remove('-translate-x-full');
            mobileOverlay.style.display = 'block';
            mobileMenu.style.pointerEvents = 'auto';
            document.body.style.overflow = 'hidden';
            console.log('Menu mobile aberto');
        } else {
            console.error('Elementos do menu mobile não encontrados');
        }
    }

    function closeMenu() {
        if (mobileSidebar && mobileOverlay && mobileMenu) {
            mobileSidebar.classList.add('-translate-x-full');
            mobileOverlay.style.display = 'none';
            mobileMenu.style.pointerEvents = 'none';
            document.body.style.overflow = '';
            console.log('Menu mobile fechado');
        } else {
            console.error('Elementos do menu mobile não encontrados');
        }
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openMenu);
    }
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', closeMenu);
    }
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMenu);
    }

    // Set default request date to today
    const requestDateInput = document.getElementById('requestDate');
    if (requestDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        requestDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Handle Add User Form
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        console.log('Formulário addUserForm encontrado');
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Evento de submissão do addUserForm acionado');
            const formData = new FormData(addUserForm);
            console.log('Enviando dados de adição:', Object.fromEntries(formData));
            try {
                const response = await fetch(addUserForm.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRF-Token': getCsrfToken()
                    },
                    body: new URLSearchParams(formData).toString()
                });
                const data = await response.json();
                console.log('Resposta da adição:', data);
                if (data.success) {
                    showNotification(data.message, 'success');
                    closeAddUserModal();
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showNotification(data.message, 'error');
                }
            } catch (error) {
                console.error('Erro ao adicionar usuário:', error);
                showNotification('Erro ao processar a solicitação.', 'error');
            }
        });
    } else {
        console.error('Formulário addUserForm não encontrado no DOM');
    }

    // Handle Edit User Form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        console.log('Formulário editUserForm encontrado');
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Evento de submissão do editUserForm acionado');
            const formData = new FormData(editUserForm);
            console.log('Enviando dados de edição:', Object.fromEntries(formData));
            try {
                const response = await fetch(editUserForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRF-Token': getCsrfToken()
                    }
                });
                const data = await response.json();
                console.log('Resposta da edição:', data);
                if (data.success) {
                    showNotification(data.message, 'success');
                    closeEditUserModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showNotification(data.message, 'error');
                }
            } catch (error) {
                console.error('Erro ao editar usuário:', error);
                showNotification('Erro ao processar a solicitação.', 'error');
            }
        });
    } else {
        console.error('Formulário editUserForm não encontrado no DOM');
    }

    // Edit User Buttons
    const editButtons = document.querySelectorAll('.edit-user-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const userId = button.getAttribute('data-id');
            console.log('Editar usuário ID:', userId);
            try {
                const response = await fetch(`/get_user/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': getCsrfToken()
                    }
                });
                const data = await response.json();
                console.log('Dados do usuário:', data);
                if (data.success && data.user) {
                    const form = document.getElementById('editUserForm');
                    const idField = document.getElementById('editId');
                    const nameField = document.getElementById('editName');
                    const loginField = document.getElementById('editLogin');
                    const typeField = document.getElementById('editType');
                    const passwordField = document.getElementById('editPassword');
                    if (!form || !idField || !nameField || !loginField || !typeField || !passwordField) {
                        console.error('Campos do formulário de edição não encontrados');
                        showNotification('Erro ao abrir formulário de edição.', 'error');
                        return;
                    }
                    idField.value = data.user.id || '';
                    nameField.value = data.user.name || '';
                    loginField.value = data.user.login || '';
                    typeField.value = data.user.type || '';
                    passwordField.value = '';
                    showEditUserModal();
                } else if (data.message) {
                    showNotification(data.message, 'error');
                } else {
                    showNotification('Erro ao carregar usuário. Dados inválidos.', 'error');
                }
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
                showNotification('Erro ao carregar usuário.', 'error');
            }
        });
    });

    // Delete Buttons
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = button.getAttribute('data-url');
            const id = button.getAttribute('data-id');
            const type = button.getAttribute('data-type');
            console.log('Excluir:', { url, id, type });
            const result = await Swal.fire({
                title: 'Tem certeza?',
                text: `Deseja excluir este ${type}? Esta ação não pode ser desfeita!`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#EF4444', // Tailwind red-500
                cancelButtonColor: '#6B7280', // Tailwind gray-500
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': getCsrfToken()
                        },
                        body: JSON.stringify({ id })
                    });
                    const data = await response.json();
                    console.log('Resposta da exclusão:', data);
                    // Sempre faz reload após exclusão
                    if (data.success) {
                        showNotification(data.message, 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showNotification(data.message, 'error');
                        setTimeout(() => location.reload(), 1500);
                    }
                } catch (error) {
                    console.error('Erro ao excluir:', error);
                    showNotification('Erro ao processar a solicitação.', 'error');
                    setTimeout(() => location.reload(), 1500);
                }
            }
        });
    });
});