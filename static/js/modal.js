// Modal System for Horas Extras
class ModalSystem {
    constructor() {
        this.createModalHTML();
        this.bindEvents();
    }

    createModalHTML() {
        // Check if modal already exists
        if (document.getElementById('customModal')) {
            return;
        }

        const modalHTML = `
            <div id="customModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg p-6 max-w-md mx-4 transform transition-all relative">
                    <!-- Botão de fechar -->
                    <button id="modalCloseBtn" aria-label="Fechar" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none" style="z-index:10">&times;</button>
                    <div class="text-center">
                        <!-- Icon -->
                        <div id="modalIcon" class="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
                            <i id="modalIconClass" class="text-xl"></i>
                        </div>
                        
                        <!-- Title -->
                        <h3 id="modalTitle" class="text-lg font-medium text-gray-900 mb-2">
                            Título do Modal
                        </h3>
                        
                        <!-- Message -->
                        <p id="modalMessage" class="text-sm text-gray-500 mb-6">
                            Mensagem do modal
                        </p>
                        
                        <!-- Buttons -->
                        <div id="modalButtons" class="flex space-x-3">
                            <button 
                                type="button" 
                                id="modalConfirmBtn" 
                                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        const modal = document.getElementById('customModal');
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Close modal when clicking on the close button
        const closeBtn = document.getElementById('modalCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    }

    show(title, message, type = 'info', callback = null) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalIcon = document.getElementById('modalIcon');
        const modalIconClass = document.getElementById('modalIconClass');
        const modalConfirmBtn = document.getElementById('modalConfirmBtn');
        
        // Set content
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;

        // Botão customizado
        let confirmLabel = 'OK';
        let confirmAction = null;
        if (callback && typeof callback === 'object' && callback.label && typeof callback.action === 'function') {
            confirmLabel = callback.label;
            confirmAction = callback.action;
        } else if (typeof callback === 'function') {
            confirmAction = callback;
        }
        modalConfirmBtn.textContent = confirmLabel;
        
        // Set icon and colors based on type
        switch(type) {
            case 'success':
                modalIcon.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4';
                modalIconClass.className = 'fas fa-check text-green-600 text-xl';
                modalConfirmBtn.className = 'flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors';
                break;
            case 'error':
                modalIcon.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4';
                modalIconClass.className = 'fas fa-times text-red-600 text-xl';
                modalConfirmBtn.className = 'flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors';
                break;
            case 'warning':
                modalIcon.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4';
                modalIconClass.className = 'fas fa-exclamation-triangle text-yellow-600 text-xl';
                modalConfirmBtn.className = 'flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md transition-colors';
                break;
            default: // info
                modalIcon.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4';
                modalIconClass.className = 'fas fa-info text-blue-600 text-xl';
                modalConfirmBtn.className = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors';
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Handle confirm button click
        const handleConfirm = () => {
            this.hide();
            if (confirmAction) confirmAction();
        };
        // Remove existing listeners and add new one
        modalConfirmBtn.replaceWith(modalConfirmBtn.cloneNode(true));
        const newBtn = document.getElementById('modalConfirmBtn');
        newBtn.addEventListener('click', handleConfirm);
    }

    showConfirm(title, message, onConfirm, onCancel = null) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalIcon = document.getElementById('modalIcon');
        const modalIconClass = document.getElementById('modalIconClass');
        const modalButtons = document.getElementById('modalButtons');
        
        // Set content
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Set warning icon
        modalIcon.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4';
        modalIconClass.className = 'fas fa-question text-yellow-600 text-xl';
        
        // Create buttons
        modalButtons.innerHTML = `
            <button 
                type="button" 
                id="modalCancelBtn" 
                class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
            >
                Cancelar
            </button>
            <button 
                type="button" 
                id="modalConfirmBtn" 
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
                Confirmar
            </button>
        `;
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Handle button clicks
        const handleConfirm = () => {
            this.hide();
            if (onConfirm) onConfirm();
        };
        
        const handleCancel = () => {
            this.hide();
            if (onCancel) onCancel();
        };
        
        // Add event listeners
        document.getElementById('modalConfirmBtn').addEventListener('click', handleConfirm);
        document.getElementById('modalCancelBtn').addEventListener('click', handleCancel);
    }

    hide() {
        const modal = document.getElementById('customModal');
        modal.classList.add('hidden');
    }
}

// Global modal instance
let modalSystem;

// Initialize modal system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    modalSystem = new ModalSystem();
});

// Global functions for backward compatibility
function showModal(title, message, type = 'info', callback = null) {
    if (modalSystem) {
        modalSystem.show(title, message, type, callback);
    }
}

function showConfirmModal(title, message, onConfirm, onCancel = null) {
    if (modalSystem) {
        modalSystem.showConfirm(title, message, onConfirm, onCancel);
    }
} 