// JavaScript para a página de Dashboard

// Função para alternar todos os checkboxes
function toggleAllCheckboxes(selectAllCheckbox) {
  const rowCheckboxes = document.querySelectorAll('.row-checkbox');
  rowCheckboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  console.log('Checkboxes alternados:', selectAllCheckbox.checked ? 'todos selecionados' : 'todos desselecionados');
}

// Função para imprimir apenas as linhas selecionadas
function printSelectedRows() {
  console.log('Função printSelectedRows chamada');
  const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    alert('Por favor, selecione pelo menos uma linha para imprimir.');
    return;
  }

  const table = document.getElementById('installations-table');
  if (!table) {
    console.error('Tabela não encontrada');
    return;
  }

  try {
    // Cria uma nova tabela apenas com as linhas selecionadas
    const printTable = document.createElement('table');
    printTable.className = table.className;
    
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

    // Adiciona o cabeçalho Observação
    var theadRow = printTable.querySelector('thead tr');
    var obsTh = document.createElement('th');
    obsTh.className = "px-4 py-2 border-b font-semibold text-gray-700";
    obsTh.textContent = "Observação";
    theadRow.appendChild(obsTh);

    // Adiciona a célula de observação em cada linha
    var tbodyRows = printTable.querySelectorAll('tbody tr');
    tbodyRows.forEach(function(row) {
      var td = document.createElement('td');
      td.className = "px-4 py-2 border-b";
      td.textContent = row.getAttribute('data-observation') || '';
      row.appendChild(td);
    });

    // Abre nova janela para impressão
    var win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      alert('Por favor, permita pop-ups para esta funcionalidade.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serviços Selecionados</title>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          body { 
            background: #f3f4f6; 
            font-family: Inter, Arial, sans-serif; 
          }
          .print-container { 
            background: #fff; 
            border-radius: 1rem; 
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); 
            padding: 2.5rem; 
            margin: 2rem auto; 
            max-width: 1100px; 
          }
          h2 { 
            font-size: 2.25rem; 
            font-weight: 700; 
            color: #1e293b; 
            margin-bottom: 1.5rem; 
            letter-spacing: -1px; 
          }
          table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0; 
            background: #fff; 
            border-radius: 0.75rem; 
            overflow: hidden; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.04); 
          }
          th, td { 
            border-bottom: 1px solid #e5e7eb; 
            padding: 0.75rem 1.25rem; 
            text-align: left; 
            font-size: 1rem; 
          }
          th { 
            background: #f1f5f9; 
            color: #334155; 
            font-weight: 600; 
            letter-spacing: 0.02em; 
          }
          tr:last-child td { 
            border-bottom: none; 
          }
          tr:nth-child(even) { 
            background: #f9fafb; 
          }
          .badge { 
            display: inline-block; 
            padding: 0.25em 0.75em; 
            border-radius: 9999px; 
            font-size: 0.95em; 
            font-weight: 500; 
          }
          .badge-green { 
            background: #d1fae5; 
            color: #047857; 
          }
          .badge-pacpon { 
            background: #e0e7ff; 
            color: #3730a3; 
          }
          .badge-utp { 
            background: #fef9c3; 
            color: #92400e; 
          }
          .badge-migracao { 
            background: #f3e8ff; 
            color: #7c3aed; 
          }
          .badge-pedido-transferencia { 
            background: #fef2f2; 
            color: #b91c1c; 
          }
          .badge-transferencia { 
            background: #f1f5f9; 
            color: #0f172a; 
          }
          .badge-comodo { 
            background: #f0fdf4; 
            color: #166534; 
          }
          .badge-transferencia-fibra { 
            background: #e0f2fe; 
            color: #0369a1; 
          }
          .badge-transferencia-pacpon { 
            background: #f3e8ff; 
            color: #7c3aed; 
          }
          .badge-transferencia-utp { 
            background: #fef9c3; 
            color: #92400e; 
          }
          .badge-blue { 
            background: #dbeafe; 
            color: #1e40af; 
          }
          @media print { 
            body { background: #fff; } 
            .print-container { box-shadow: none; margin: 0; } 
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div style="text-align:center; margin-bottom: 1.5rem;">
            <span style="font-size:1.3rem; font-weight:700; color:#ea580c; letter-spacing:1px;">Filial: Duque de Caxia - RJ</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
            <h2><i class="fas fa-calendar-day mr-2 text-blue-600"></i>Serviços Selecionados</h2>
            <span style="color: #64748b; font-size: 1.1rem;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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

// Função para imprimir toda a tabela
function printInstallationsTable() {
  console.log('Função printInstallationsTable chamada');
  var table = document.getElementById('installations-table');
  if (!table) {
    console.error('Tabela não encontrada');
    return;
  }

  try {
    // Cria uma cópia da tabela para adicionar a coluna Observação apenas na impressão
    var printTable = table.cloneNode(true);

    // Adiciona o cabeçalho Observação
    var theadRow = printTable.querySelector('thead tr');
    var obsTh = document.createElement('th');
    obsTh.className = "px-4 py-2 border-b font-semibold text-gray-700";
    obsTh.textContent = "Observação";
    theadRow.appendChild(obsTh);

    // Adiciona a célula de observação em cada linha
    var tbodyRows = printTable.querySelectorAll('tbody tr');
    tbodyRows.forEach(function(row) {
      var td = document.createElement('td');
      td.className = "px-4 py-2 border-b";
      td.textContent = row.getAttribute('data-observation') || '';
      row.appendChild(td);
    });

    // Abre nova janela para impressão
    var win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      alert('Por favor, permita pop-ups para esta funcionalidade.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serviços Agendado para Hoje</title>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          body { 
            background: #f3f4f6; 
            font-family: Inter, Arial, sans-serif; 
          }
          .print-container { 
            background: #fff; 
            border-radius: 1rem; 
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); 
            padding: 2.5rem; 
            margin: 2rem auto; 
            max-width: 1100px; 
          }
          h2 { 
            font-size: 2.25rem; 
            font-weight: 700; 
            color: #1e293b; 
            margin-bottom: 1.5rem; 
            letter-spacing: -1px; 
          }
          table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0; 
            background: #fff; 
            border-radius: 0.75rem; 
            overflow: hidden; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.04); 
          }
          th, td { 
            border-bottom: 1px solid #e5e7eb; 
            padding: 0.75rem 1.25rem; 
            text-align: left; 
            font-size: 1rem; 
          }
          th { 
            background: #f1f5f9; 
            color: #334155; 
            font-weight: 600; 
            letter-spacing: 0.02em; 
          }
          tr:last-child td { 
            border-bottom: none; 
          }
          tr:nth-child(even) { 
            background: #f9fafb; 
          }
          .badge { 
            display: inline-block; 
            padding: 0.25em 0.75em; 
            border-radius: 9999px; 
            font-size: 0.95em; 
            font-weight: 500; 
          }
          .badge-green { 
            background: #d1fae5; 
            color: #047857; 
          }
          .badge-pacpon { 
            background: #e0e7ff; 
            color: #3730a3; 
          }
          .badge-utp { 
            background: #fef9c3; 
            color: #92400e; 
          }
          .badge-migracao { 
            background: #f3e8ff; 
            color: #7c3aed; 
          }
          .badge-pedido-transferencia { 
            background: #fef2f2; 
            color: #b91c1c; 
          }
          .badge-transferencia { 
            background: #f1f5f9; 
            color: #0f172a; 
          }
          .badge-comodo { 
            background: #f0fdf4; 
            color: #166534; 
          }
          .badge-transferencia-fibra { 
            background: #e0f2fe; 
            color: #0369a1; 
          }
          .badge-transferencia-pacpon { 
            background: #f3e8ff; 
            color: #7c3aed; 
          }
          .badge-transferencia-utp { 
            background: #fef9c3; 
            color: #92400e; 
          }
          .badge-blue { 
            background: #dbeafe; 
            color: #1e40af; 
          }
          @media print { 
            body { background: #fff; } 
            .print-container { box-shadow: none; margin: 0; } 
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div style="text-align:center; margin-bottom: 1.5rem;">
            <span style="font-size:1.3rem; font-weight:700; color:#ea580c; letter-spacing:1px;">Filial: Duque de Caxia - RJ</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
            <h2><i class="fas fa-calendar-day mr-2 text-blue-600"></i>Serviços Agendado para Hoje</h2>
            <span style="color: #64748b; font-size: 1.1rem;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
  console.log('DOM carregado - inicializando dashboard');
  
  // Event listener para o checkbox "select-all"
  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      toggleAllCheckboxes(this);
    });
    console.log('Event listener adicionado ao checkbox select-all');
  } else {
    console.warn('Checkbox select-all não encontrado');
  }

  // Event listeners para botões de impressão usando IDs
  const btnPrintSelected = document.getElementById('btnPrintSelected');
  const btnPrintAll = document.getElementById('btnPrintAll');

  if (btnPrintSelected) {
    btnPrintSelected.addEventListener('click', printSelectedRows);
    console.log('Event listener adicionado ao botão Imprimir Selecionados');
  } else {
    console.warn('Botão btnPrintSelected não encontrado');
  }

  if (btnPrintAll) {
    btnPrintAll.addEventListener('click', printInstallationsTable);
    console.log('Event listener adicionado ao botão Imprimir Todos');
  } else {
    console.warn('Botão btnPrintAll não encontrado');
  }

  // Seleção de linha ao clicar na célula (exceto no checkbox)
  const table = document.getElementById('installations-table');
  if (table) {
    table.addEventListener('click', function(e) {
      // Só age se clicar em uma .table-cell (td)
      let td = e.target.closest('.table-cell');
      if (!td) return;
      // Não age se clicar diretamente no checkbox
      if (e.target.classList.contains('row-checkbox')) return;
      let tr = td.closest('tr');
      if (!tr) return;
      let checkbox = tr.querySelector('.row-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
      }
    });
  }

  console.log('Dashboard inicializado com sucesso');

  // Configuração do Flatpickr para o calendário
  const dataSelecionada = document.getElementById('data-selecionada');
  if (dataSelecionada && typeof flatpickr !== 'undefined') {
    flatpickr("#data-selecionada", {
      dateFormat: "d/m/Y",
      allowInput: false,
      disableMobile: true,
      locale: {
        firstDayOfWeek: 1,
        weekdays: {
          shorthand: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
          longhand: [
            'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
            'Quinta-feira', 'Sexta-feira', 'Sábado'
          ]
        },
        months: {
          shorthand: [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
          ],
          longhand: [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ]
        },
        rangeSeparator: ' até ',
        weekAbbreviation: 'Sem',
        amPM: ['AM', 'PM'],
        yearAriaLabel: 'Ano',
        monthAriaLabel: 'Mês',
        hourAriaLabel: 'Hora',
        minuteAriaLabel: 'Minuto',
        time_24hr: false
      },
      onReady: function(selectedDates, dateStr, instance) {
        // Aplicar indicadores visuais aos dias do calendário
        applyCalendarIndicators(instance);
      },
      onMonthChange: function(selectedDates, dateStr, instance) {
        // Reaplicar indicadores quando mudar o mês
        setTimeout(() => {
          applyCalendarIndicators(instance);
        }, 100);
      },
      onChange: function(selectedDates, dateStr, instance) {
        if (selectedDates.length > 0) {
          const data = selectedDates[0];
          const dataFormatada = data.getFullYear() + '-' + 
                               String(data.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(data.getDate()).padStart(2, '0');
          
          // Redireciona para a página com a data selecionada
          const currentUrl = new URL(window.location);
          currentUrl.searchParams.set('data', dataFormatada);
          window.location.href = currentUrl.toString();
        }
      }
    });
    console.log('Flatpickr inicializado para o input de data em português');
  } else if (dataSelecionada) {
    // Fallback: usar input de data nativo
    console.warn('Flatpickr não carregado, usando input nativo');
    dataSelecionada.type = 'date';
    dataSelecionada.addEventListener('change', function() {
      if (this.value) {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('data', this.value);
        window.location.href = currentUrl.toString();
      }
    });
  } else {
    console.warn('Input de data não encontrado');
  }
});

// Função para aplicar indicadores visuais aos dias do calendário
function applyCalendarIndicators(instance) {
  // Dados dos indicadores do calendário (passados do backend via data attribute)
  const calendarIndicatorsData = document.getElementById('calendar-indicators-data');
  if (!calendarIndicatorsData) {
    console.warn('Dados dos indicadores do calendário não encontrados');
    return;
  }
  
  try {
    const calendarIndicators = JSON.parse(calendarIndicatorsData.textContent);
    
    // Aplicar indicadores aos dias do calendário
    const days = instance.calendarContainer.querySelectorAll('.flatpickr-day');
    days.forEach(day => {
      // Remover classes anteriores
      day.classList.remove('has-services', 'is-full');
      
      // Verificar se o dia tem data válida
      if (day.classList.contains('prevMonthDay') || day.classList.contains('nextMonthDay')) {
        return;
      }
      
      const dayNumber = day.textContent;
      const currentMonth = instance.currentMonth;
      const currentYear = instance.currentYear;
      
      // Formatar data no formato YYYY-MM-DD
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      
      // Aplicar indicador baseado nos dados
      if (calendarIndicators[dateStr] === 'blue') {
        day.classList.add('has-services');
      } else if (calendarIndicators[dateStr] === 'red') {
        day.classList.add('is-full');
      }
    });
    
    console.log('Indicadores do calendário aplicados com sucesso');
  } catch (error) {
    console.error('Erro ao aplicar indicadores do calendário:', error);
  }
}
