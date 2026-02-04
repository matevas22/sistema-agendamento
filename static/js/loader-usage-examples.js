// Exemplos de uso do Loader Global
// Este arquivo contém exemplos de como usar o loader em diferentes situações

// ========================================
// EXEMPLO 1: Uso básico com funções utilitárias
// ========================================

// Mostrar loader manualmente
function exemploMostrarLoader() {
    showLoader();
    
    // Simular operação assíncrona
    setTimeout(() => {
        hideLoader();
    }, 2000);
}

// ========================================
// EXEMPLO 2: Uso com operações assíncronas
// ========================================

// Exemplo com fetch
async function exemploFetch() {
    try {
        // O loader será mostrado automaticamente pelo interceptador
        const response = await fetch('/api/dados');
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Exemplo com Promise
function exemploPromise() {
    const operacao = new Promise((resolve) => {
        setTimeout(() => {
            resolve('Operação concluída');
        }, 3000);
    });
    
    // Usar o loader para a operação
    return showLoaderForAsync(operacao);
}

// ========================================
// EXEMPLO 3: Uso em formulários
// ========================================

// Exemplo de envio de formulário com loader
function exemploFormulario() {
    const form = document.getElementById('meu-formulario');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // O loader será mostrado automaticamente
        // Mas você pode controlar manualmente se necessário
        showLoader();
        
        try {
            const formData = new FormData(form);
            const response = await fetch('/api/enviar', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                alert('Formulário enviado com sucesso!');
            }
        } catch (error) {
            console.error('Erro ao enviar formulário:', error);
        } finally {
            hideLoader();
        }
    });
}

// ========================================
// EXEMPLO 4: Uso em operações de longa duração
// ========================================

// Exemplo com timeout
function exemploTimeout() {
    // Mostrar loader com timeout de 10 segundos
    window.globalLoader.showWithTimeout(10000);
    
    // Simular operação longa
    setTimeout(() => {
        console.log('Operação concluída');
    }, 5000);
}

// ========================================
// EXEMPLO 5: Uso em navegação programática
// ========================================

// Exemplo de navegação com loader
function exemploNavegacao() {
    showLoader();
    
    // Simular carregamento de dados antes da navegação
    setTimeout(() => {
        window.location.href = '/nova-pagina';
    }, 1000);
}

// ========================================
// EXEMPLO 6: Uso em operações de upload
// ========================================

// Exemplo de upload de arquivo
function exemploUpload() {
    const input = document.getElementById('file-input');
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showLoader();
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                alert('Arquivo enviado com sucesso!');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
        } finally {
            hideLoader();
        }
    });
}

// ========================================
// EXEMPLO 7: Uso em operações de validação
// ========================================

// Exemplo de validação assíncrona
async function exemploValidacao() {
    const email = document.getElementById('email').value;
    
    showLoader();
    
    try {
        const response = await fetch(`/api/validar-email?email=${email}`);
        const result = await response.json();
        
        if (result.valid) {
            console.log('Email válido');
        } else {
            console.log('Email inválido');
        }
    } catch (error) {
        console.error('Erro na validação:', error);
    } finally {
        hideLoader();
    }
}

// ========================================
// EXEMPLO 8: Uso em operações de relatório
// ========================================

// Exemplo de geração de relatório
async function exemploRelatorio() {
    showLoader();
    
    try {
        const response = await fetch('/api/gerar-relatorio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                periodo: '2025-01',
                tipo: 'horas-extras'
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'relatorio-horas-extras.pdf';
            a.click();
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
    } finally {
        hideLoader();
    }
}

// ========================================
// EXEMPLO 9: Uso em operações de busca
// ========================================

// Exemplo de busca com debounce
let timeoutId;
function exemploBusca() {
    const input = document.getElementById('busca');
    
    input.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(async () => {
            const termo = e.target.value;
            if (termo.length < 3) return;
            
            showLoader();
            
            try {
                const response = await fetch(`/api/buscar?q=${encodeURIComponent(termo)}`);
                const resultados = await response.json();
                
                // Atualizar interface com resultados
                atualizarResultados(resultados);
            } catch (error) {
                console.error('Erro na busca:', error);
            } finally {
                hideLoader();
            }
        }, 500); // Debounce de 500ms
    });
}

function atualizarResultados(resultados) {
    // Implementar lógica para atualizar a interface
    console.log('Resultados:', resultados);
}

// ========================================
// EXEMPLO 10: Uso em operações de salvamento
// ========================================

// Exemplo de salvamento automático
function exemploSalvamentoAutomatico() {
    const form = document.getElementById('formulario-dados');
    let timeoutId;
    
    form.addEventListener('input', () => {
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(async () => {
            showLoader();
            
            try {
                const formData = new FormData(form);
                const response = await fetch('/api/salvar-rascunho', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    console.log('Rascunho salvo automaticamente');
                }
            } catch (error) {
                console.error('Erro ao salvar rascunho:', error);
            } finally {
                hideLoader();
            }
        }, 2000); // Salvar após 2 segundos de inatividade
    });
}
