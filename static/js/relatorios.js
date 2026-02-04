// Variáveis globais para relatórios
let relatorioData = [];
let relatorioCurrentPage = 1;
const relatorioRowsPerPage = 10;

// Função para buscar dados do relatório
function fetchRelatorio() {
  const dia = document.getElementById('dataDia').value;
  const mes = document.getElementById('dataMes').value;
  const ano = document.getElementById('dataAno').value;
  
  let params = [];
  if (dia) params.push('dia=' + dia);
  if (mes) {
    params.push('mes=' + mes.split('-')[1]);
    params.push('ano=' + mes.split('-')[0]);
  }
  if (ano && !mes) params.push('ano=' + ano);
  
  const url = '/api/relatorios' + (params.length ? '?' + params.join('&') : '');
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        relatorioData = data.installations;
        relatorioCurrentPage = 1;
        renderRelatorioTable();
        renderRelatorioPagination();
      } else {
        relatorioData = [];
        renderRelatorioTable();
        renderRelatorioPagination();
      }
    })
    .catch(error => {
      console.error('Erro ao buscar relatório:', error);
      relatorioData = [];
      renderRelatorioTable();
      renderRelatorioPagination();
    });
}

// Função para formatar data no formato brasileiro
function formatDateBR(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr; // já está formatado
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// Função para renderizar a tabela de relatório
function renderRelatorioTable() {
  const tbody = document.getElementById('relatorioTableBody');
  tbody.innerHTML = '';
  
  if (!relatorioData.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="no-data-message">Nenhum dado encontrado.</td></tr>';
    return;
  }
  
  const start = (relatorioCurrentPage - 1) * relatorioRowsPerPage;
  const end = start + relatorioRowsPerPage;
  const pageData = relatorioData.slice(start, end);
  
  pageData.forEach(inst => {
    const row = document.createElement('tr');
    row.className = 'table-row';
    row.setAttribute('data-observation', inst.observation || '');
    
    row.innerHTML = `
      <td class="table-cell">
        <input type="checkbox" class="checkbox-input row-checkbox" value="${inst.id || ''}" title="Selecionar esta linha" />
      </td>
      <td class="table-cell">${inst.clientId || ''}</td>
      <td class="table-cell">${inst.clientName ? (inst.clientName.length > 22 ? inst.clientName.slice(0, 22) + '...' : inst.clientName) : ''}</td>
      <td class="table-cell">${inst.installationType || ''}</td>
      <td class="table-cell">${inst.plan || ''}</td>
      <td class="table-cell">${inst.filial || ''}</td>
      <td class="table-cell">${formatDateBR(inst.dueDate) || ''}</td>
      <td class="table-cell">${inst.requestDate || ''}</td>
      <td class="table-cell">${inst.attendant ? (inst.attendant.length > 22 ? inst.attendant.slice(0, 22) + '...' : inst.attendant) : ''}</td>
      <td class="table-cell">${inst.turno_preferencial || ''}</td>
      <td class="table-cell">${inst.observation ? (inst.observation.length > 10 ? inst.observation.slice(0, 10) + '...' : inst.observation) : ''}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// Função para renderizar controles de paginação
function renderRelatorioPagination() {
  const containerId = 'relatorioPaginationControls';
  let container = document.getElementById(containerId);
  
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'pagination-container';
    document.querySelector('.table-container').appendChild(container);
  }
  
  container.innerHTML = '';
  const total = relatorioData.length;
  const totalPages = Math.ceil(total / relatorioRowsPerPage);
  
  if (totalPages <= 1) return;
  
  // Botão anterior
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '«';
  prevBtn.disabled = relatorioCurrentPage === 1;
  prevBtn.className = 'pagination-button';
  prevBtn.onclick = () => {
    if (relatorioCurrentPage > 1) {
      relatorioCurrentPage--;
      renderRelatorioTable();
      renderRelatorioPagination();
    }
  };
  container.appendChild(prevBtn);
  
  // Números das páginas
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'pagination-button' + (i === relatorioCurrentPage ? ' active' : '');
    btn.onclick = () => {
      relatorioCurrentPage = i;
      renderRelatorioTable();
      renderRelatorioPagination();
    };
    container.appendChild(btn);
  }
  
  // Botão próximo
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '»';
  nextBtn.disabled = relatorioCurrentPage === totalPages;
  nextBtn.className = 'pagination-button';
  nextBtn.onclick = () => {
    if (relatorioCurrentPage < totalPages) {
      relatorioCurrentPage++;
      renderRelatorioTable();
      renderRelatorioPagination();
    }
  };
  container.appendChild(nextBtn);
}

// Função para limpar filtros
function limparFiltros() {
  document.getElementById('dataDia').value = '';
  document.getElementById('dataMes').value = '';
  document.getElementById('dataAno').value = '';
  relatorioData = [];
  relatorioCurrentPage = 1;
  renderRelatorioTable();
  renderRelatorioPagination();
}

// Função para exportar relatório
function exportarRelatorio(tipo) {
  const dia = document.getElementById('dataDia').value;
  const mes = document.getElementById('dataMes').value;
  const ano = document.getElementById('dataAno').value;
  
  let params = [];
  if (dia) params.push('dia=' + dia);
  if (mes) {
    params.push('mes=' + mes.split('-')[1]);
    params.push('ano=' + mes.split('-')[0]);
  }
  if (ano && !mes) params.push('ano=' + ano);
  
  const url = `/api/relatorios/${tipo}` + (params.length ? '?' + params.join('&') : '');
  window.open(url, '_blank');
}

// Função para alternar todos os checkboxes
function toggleAllCheckboxes(selectAllCheckbox) {
  const rowCheckboxes = document.querySelectorAll('.row-checkbox');
  rowCheckboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
}

// Função para imprimir apenas as linhas selecionadas
function printSelectedRows() {
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    alert('Por favor, selecione pelo menos uma linha para imprimir.');
    return;
  }

  const table = document.getElementById('relatorio-table');
  if (!table) {
    console.error('Tabela não encontrada');
    return;
  }

  try {
    // Cria uma nova tabela apenas com as linhas selecionadas
    const printTable = document.createElement('table');
    printTable.style.width = '100%';
    printTable.style.borderCollapse = 'collapse';
    printTable.style.border = '1px solid #ddd';
    
    // Copia o cabeçalho
    const thead = table.querySelector('thead').cloneNode(true);
    // Remove a coluna de checkbox do cabeçalho
    const checkboxHeader = thead.querySelector('th:first-child');
    if (checkboxHeader) {
      checkboxHeader.remove();
    }
    printTable.appendChild(thead);

    // Cria o corpo da tabela
    const tbody = document.createElement('tbody');
    
    // Adiciona apenas as linhas selecionadas
    selectedCheckboxes.forEach(checkbox => {
      const row = checkbox.closest('tr').cloneNode(true);
      // Remove a coluna de checkbox da linha
      const checkboxCell = row.querySelector('td:first-child');
      if (checkboxCell) {
        checkboxCell.remove();
      }
      tbody.appendChild(row);
    });
    
    printTable.appendChild(tbody);

    // Abre nova janela para impressão
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      alert('Por favor, permita pop-ups para esta funcionalidade.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Selecionado</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #fff; 
          }
          .print-container { 
            background: #fff; 
            padding: 20px; 
            max-width: 100%; 
          }
          h2 { 
            font-size: 24px; 
            font-weight: bold; 
            color: #333; 
            margin-bottom: 20px; 
            text-align: center;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            background: #fff; 
            margin-top: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px 12px; 
            text-align: left; 
            font-size: 12px; 
          }
          th { 
            background: #f8f9fa; 
            color: #333; 
            font-weight: bold; 
          }
          tr:nth-child(even) { 
            background: #f9f9f9; 
          }
          .header-info {
            text-align: center;
            margin-bottom: 20px;
            color: #666;
          }
          @media print { 
            body { margin: 0; } 
            .print-container { padding: 10px; } 
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <h2>Relatório Selecionado</h2>
          <div class="header-info">
            <p>Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Total de registros selecionados: ${selectedCheckboxes.length}</p>
          </div>
          ${printTable.outerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    win.document.close();
    
  } catch (error) {
    console.error('Erro ao gerar impressão:', error);
    alert('Erro ao gerar impressão. Tente novamente.');
  }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  // Event listeners para botões
  const btnFiltrar = document.getElementById('btnFiltrarRelatorio');
  const btnLimpar = document.getElementById('btnLimparRelatorio');
  const btnImprimir = document.getElementById('btnImprimir');
  const btnPDF = document.getElementById('exportarPDF');
  const btnExcel = document.getElementById('exportarExcel');
  
  if (btnFiltrar) {
    btnFiltrar.addEventListener('click', fetchRelatorio);
  }
  
  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparFiltros);
  }
  
  if (btnPDF) {
    btnPDF.addEventListener('click', () => exportarRelatorio('pdf'));
  }
  
  if (btnExcel) {
    btnExcel.addEventListener('click', () => exportarRelatorio('excel'));
  }
  
  if (btnImprimir) {
    btnImprimir.addEventListener('click', printSelectedRows);
  }
  
  // Event listener para o checkbox "select-all"
  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      toggleAllCheckboxes(this);
    });
  }
  
  console.log('Relatórios inicializado com sucesso');
});
