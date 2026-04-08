// Função para buscar datas bloqueadas
async function fetchBlockedDates(filial) {
  try {
    const res = await fetch("/api/blocked_dates");
    const data = await res.json();
    if (data.success && data.blocked_dates && filial) {
      return (data.blocked_dates[filial] || []).map((dateStr) => dateStr);
    }
  } catch (e) {
    console.error("Erro ao buscar datas bloqueadas:", e);
  }
  return [];
}

// PAGINATION VARIABLES
let currentPage = 1;
const rowsPerPage = 16; // Número de linhas por página
// Variável para armazenar os dados paginados
let paginatedData = [];

// Filtros por coluna
const filterInputs = [
  { id: "filterColClientId", field: "clientId" },
  { id: "filterColClientName", field: "clientName" },
  { id: "filterColPlan", field: "plan" },
  { id: "filterColFilial", field: "filial" },
  { id: "filterColDueDate", field: "dueDate" },
  { id: "filterColRequestDate", field: "requestDate" },
  { id: "filterColAttendant", field: "attendant" },
  { id: "filterColTurno", field: "turno_preferencial" },
];

// Filtro de filial
let filialFilter = "";

filterInputs.forEach((f) => {
  document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById(f.id);
    if (input) {
      input.addEventListener("input", filterTableByColumns);
    } else {
      console.warn(`Input de filtro ${f.id} não encontrado`);
    }
  });
});

// Event listener para o filtro de filial
document.addEventListener("DOMContentLoaded", function () {
  const filialSelector = document.getElementById("filterFilialSelector");
  if (filialSelector) {
    filialSelector.addEventListener("change", filterTableByColumns);
  } else {
    console.warn("Filtro de filial não encontrado");
  }
});

function filterTableByColumns() {
  console.log("filterTableByColumns chamada"); // Debug
  const filters = {};
  filterInputs.forEach((f) => {
    const input = document.getElementById(f.id);
    const val = input?.value?.trim().toLowerCase() || "";
    filters[f.field] = val;
    if (val) console.log(`Filtro ${f.field}: ${val}`); // Debug
  });

  // Obter valor do filtro de filial
  const filialSelector = document.getElementById("filterFilialSelector");
  filialFilter = filialSelector ? filialSelector.value : "";
  if (filialFilter) console.log(`Filtro de filial: ${filialFilter}`); // Debug

  let filtered = (window.installations || []).filter((inst) => {
    let match = true;
    if (
      filters.clientId &&
      !String(inst.clientId || "")
        .toLowerCase()
        .includes(filters.clientId)
    )
      match = false;
    if (
      filters.clientName &&
      !String(inst.clientName || "")
        .toLowerCase()
        .includes(filters.clientName)
    )
      match = false;
    if (
      filters.plan &&
      !String(inst.plan || "")
        .toLowerCase()
        .includes(filters.plan)
    )
      match = false;
    if (
      filters.filial &&
      !String(inst.filial || "")
        .toLowerCase()
        .includes(filters.filial)
    )
      match = false;
    if (filters.dueDate) {
      // Permite filtrar tanto por "aaaa-mm-dd" quanto por "dd/mm/aaaa"
      const dueDateRaw = String(inst.dueDate || "");
      // Converte para dd/mm/aaaa se possível
      let dueDateFormatted = dueDateRaw;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)) {
        const [y, m, d] = dueDateRaw.split("-");
        dueDateFormatted = `${d}/${m}/${y}`;
      }
      if (
        !dueDateRaw.toLowerCase().includes(filters.dueDate) &&
        !dueDateFormatted.toLowerCase().includes(filters.dueDate)
      )
        match = false;
    }
    if (
      filters.requestDate &&
      !String(inst.requestDate || "")
        .toLowerCase()
        .includes(filters.requestDate)
    )
      match = false;
    if (
      filters.attendant &&
      !String(inst.attendant || "")
        .toLowerCase()
        .includes(filters.attendant)
    )
      match = false;
    if (
      filters.turno_preferencial &&
      !String(inst.turno_preferencial || "")
        .toLowerCase()
        .includes(filters.turno_preferencial)
    )
      match = false;

    // Aplicar filtro de filial
    if (
      filialFilter &&
      String(inst.filial || "").toLowerCase() !== filialFilter.toLowerCase()
    ) {
      match = false;
    }

    return match;
  });
  paginatedData = filtered;
  currentPage = 1;
  renderInstallationsTable();
  renderPaginationControls();
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM carregado, iniciando carregamento de instalações..."); // Debug

  // Fetch installations on page load
  const url = window.API_URLS
    ? window.API_URLS.getInstallations
    : "/api/installations";
  console.log("Tentando carregar instalações de:", url); // Debug

  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      console.log("Response status:", response.status); // Debug
      if (response.status === 401) {
        throw new Error("Usuário não autenticado. Faça login novamente.");
      }
      if (response.status === 403) {
        throw new Error(
          "Acesso negado. Você não tem permissão para acessar este recurso.",
        );
      }
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("Dados recebidos:", data); // Debug
      if (data.success) {
        console.log(
          "Carregando instalações:",
          data.installations.length,
          "registros",
        ); // Debug
        window.installations = data.installations;
        paginatedData = data.installations;
        loadInstallations();
        renderPaginationControls();
      } else {
        const message =
          "Erro ao carregar instalações: " +
          (data.message || "Erro desconhecido.");
        console.error(message); // Debug
        if (typeof showNotification === "function") {
          showNotification(message, "error");
        } else {
          alert(message);
        }
      }
    })
    .catch((error) => {
      console.error("Erro na requisição:", error); // Debug
      const message = "Erro ao carregar instalações: " + error.message;
      if (typeof showNotification === "function") {
        showNotification(message, "error");
      } else {
        alert(message);
      }
    });

  // Limpar filtros ao clicar no botão
  const btnLimparFiltro = document.getElementById("btnLimparFiltro");
  if (btnLimparFiltro) {
    btnLimparFiltro.addEventListener("click", () => {
      document.getElementById("filterIdCliente") &&
        (document.getElementById("filterIdCliente").value = "");
      filterInputs.forEach((f) => {
        const el = document.getElementById(f.id);
        if (el) el.value = "";
      });
      // Limpar filtro de filial
      const filialSelector = document.getElementById("filterFilialSelector");
      if (filialSelector) {
        filialSelector.value = "";
        filialFilter = "";
      }
      // Após limpar, recarrega a página para garantir reload total
      window.location.reload();
    });
  } else {
    console.error("Botão btnLimparFiltro não encontrado");
  }
});

// Renderização da tabela PAGINADA
function renderInstallationsTable() {
  console.log("renderInstallationsTable chamada"); // Debug
  const table = document.getElementById("installationsTable");
  if (!table) {
    console.error("Elemento installationsTable não encontrado!");
    return;
  }
  table.innerHTML = "";
  // Atualiza o contador de exibição
  updatePaginationInfo();
  if (!paginatedData || paginatedData.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11" class="no-installations-message">
      <div class="no-installations-container">
        <i class="fas fa-search no-installations-icon"></i>
        <p>Nenhuma instalação encontrada</p>
      </div>
    </td>`;
    table.appendChild(row);
    return;
  }
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = paginatedData.slice(start, end);

  pageData.forEach((installation) => {
    // Badge color logic para Serviço
    let badgeClass = "";
    const tipo = installation.installationType
      ? installation.installationType.toLowerCase()
      : "";
    if (tipo.includes("fibra") && !tipo.includes("transferência")) {
      badgeClass = "badge-green";
    } else if (tipo.includes("pacpon") && !tipo.includes("transferência")) {
      badgeClass = "badge-pacpon";
    } else if (tipo.includes("utp") && !tipo.includes("transferência")) {
      badgeClass = "badge-utp";
    } else if (tipo.includes("migração")) {
      badgeClass = "badge-migracao";
    } else if (tipo.includes("pedido de transferência")) {
      badgeClass = "badge-pedido-transferencia";
    } else if (tipo === "transferência") {
      badgeClass = "badge-transferencia";
    } else if (tipo.includes("comodo")) {
      badgeClass = "badge-comodo";
    } else if (tipo.includes("transferência fibra")) {
      badgeClass = "badge-transferencia-fibra";
    } else if (tipo.includes("transferência pacpon")) {
      badgeClass = "badge-transferencia-pacpon";
    } else if (tipo.includes("transferência utp")) {
      badgeClass = "badge-transferencia-utp";
    } else {
      badgeClass = "badge-blue";
    }

    // Badge color logic para Plano (apenas verde, laranja, roxo, azul)
    let badgePlanClass = "badge-plan-blue";
    const plano = (installation.plan || "").toLowerCase();
    if (plano.includes("pré-pago")) {
      badgePlanClass = "badge-plan-orange";
    } else if (plano.includes("telefonia")) {
      badgePlanClass = "badge-plan-purple";
    } else if (plano.includes("1000mb") || plano.includes("800mb")) {
      badgePlanClass = "badge-plan-green";
    } else if (plano.includes("600mb") || plano.includes("500mb")) {
      badgePlanClass = "badge-plan-blue";
    } else if (
      plano.includes("300mb") ||
      plano.includes("200mb") ||
      plano.includes("100mb") ||
      plano.includes("70mb") ||
      plano.includes("50mb") ||
      plano.includes("30mb")
    ) {
      badgePlanClass = "badge-plan-orange";
    }

    // requestDate is the day (DD)
    const requestDateDisplay = installation.requestDate
      ? String(installation.requestDate).padStart(2, "0")
      : "";

    // dueDate is YYYY-MM-DD, avoid timezone shift by parsing manually
    const dueDateParts = installation.dueDate
      ? installation.dueDate.split("-")
      : [];
    const dueDateDisplay =
      dueDateParts.length === 3
        ? `${dueDateParts[2]}/${dueDateParts[1]}/${dueDateParts[0]}`
        : "";

    const row = document.createElement("tr");
    // Indicação visual de observação
    let obsIndicator = "";
    if (
      installation.observation &&
      installation.observation.trim().length > 0
    ) {
      obsIndicator =
        '<span title="Possui observação" style="color:#f59e42; margin-left:4px;"><i class="fas fa-sticky-note"></i></span>';
    }
    row.innerHTML = `
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'>${installation.clientId}</td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}' title="${installation.clientName}">
        ${
          installation.clientName && installation.clientName.length > 27
            ? installation.clientName.slice(0, 25) + "..."
            : installation.clientName
        }
      </td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'><span class="badge ${badgeClass}">${installation.installationType}</span></td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'><span class="badge ${badgePlanClass}">${installation.plan}</span></td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'>${installation.filial || ""}</td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'>${dueDateDisplay}</td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'>${requestDateDisplay}</td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}' title="${installation.attendant}">
        ${
          installation.attendant && installation.attendant.length > 27
            ? installation.attendant.slice(0, 22) + "..."
            : installation.attendant
        }
      </td>
      <td class="table-cell table-cell-clickable" data-installation='${JSON.stringify(installation)}'>${installation.turno_preferencial || ""}</td>
      <td class="table-cell">
        <button onclick="showObservation(decodeURIComponent('${encodeURIComponent(installation.observation || "")}'))" class="btn-ver-observacao">
          <i class="fas fa-eye"></i> Ver ${obsIndicator}
        </button>
      </td>
      <td class="table-cell">
        <button onclick="deleteInstallation(${installation.id})" class="btn-excluir">
          <i class="fas fa-trash-alt"></i> Excluir
        </button>
      </td>
          `;
    table.appendChild(row);
  });
}

// PAGINATION CONTROLS
function renderPaginationControls() {
  const controls = document.getElementById("paginationControls");
  if (!controls) {
    console.warn("Elemento paginationControls não encontrado");
    return;
  }
  controls.innerHTML = "";
  if (!paginatedData || paginatedData.length === 0) return;

  const totalPages = Math.ceil(paginatedData.length / rowsPerPage);

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.innerHTML = "&laquo;";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderInstallationsTable();
      renderPaginationControls();
    }
  };
  controls.appendChild(prevBtn);

  // Page numbers (show max 5 pages at once)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => {
      currentPage = i;
      renderInstallationsTable();
      renderPaginationControls();
    };
    controls.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = "&raquo;";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderInstallationsTable();
      renderPaginationControls();
    }
  };
  controls.appendChild(nextBtn);
}

// NOVA FUNÇÃO loadInstallations (substitui a anterior)
function loadInstallations(filter = null) {
  console.log("loadInstallations chamada com filtro:", filter); // Debug
  const table = document.getElementById("installationsTable");
  if (!table) {
    console.error("Tabela installationsTable não encontrada");
    return;
  }
  table.innerHTML = "";

  let filteredInstallations = window.installations || [];
  console.log("Instalações disponíveis:", filteredInstallations.length); // Debug

  if (filter) {
    filteredInstallations = filteredInstallations.filter(
      (installation) => installation.dueDate === filter,
    );
  }
  paginatedData = filteredInstallations;
  currentPage = 1;
  renderInstallationsTable();
  renderPaginationControls();
}

// Função para mostrar observação (implemente conforme necessário)
function showObservation(obs) {
  const observationText = document.getElementById("modalObservationText");
  const modal = document.getElementById("observationModal");

  if (!observationText || !modal) {
    console.error("Elementos do modal não encontrados");
    alert(obs || "Sem observação.");
    return;
  }

  observationText.textContent = obs || "Sem observação.";
  modal.classList.remove("hidden");
}

function closeObservationModal() {
  const modal = document.getElementById("observationModal");

  if (!modal) {
    console.error("Modal não encontrado");
    return;
  }

  modal.classList.add("hidden");
}

// Função para deletar instalação (implemente conforme necessário)
function deleteInstallation(id) {
  if (confirm("Tem certeza que deseja excluir esta instalação?")) {
    // Implemente a lógica de exclusão aqui
    const message = "Função de exclusão não implementada.";
    if (typeof showNotification === "function") {
      showNotification(message, "info");
    } else {
      alert(message);
    }
  }
}

// Função para atualizar o contador de exibição
function updatePaginationInfo() {
  const infoDiv = document.getElementById("paginationInfo");
  if (!infoDiv) {
    console.warn("Elemento paginationInfo não encontrado");
    return;
  }
  let total = paginatedData ? paginatedData.length : 0;
  if (!paginatedData || paginatedData.length === 0) {
    infoDiv.textContent = "0 de 0 Serviços";
    return;
  }
  const start = (currentPage - 1) * rowsPerPage + 1;
  let end = start + rowsPerPage - 1;
  if (end > total) end = total;
  infoDiv.textContent = `${start} - ${end} de ${total} Serviços`;
}

// Funções para o modal de edição
let currentEditInstallation = null;
let isEditSubmitting = false;

// Adicionar event listeners para duplo clique nas células
document.addEventListener("DOMContentLoaded", function () {
  // Event listener para duplo clique nas células da tabela
  document.addEventListener("dblclick", function (e) {
    const cell = e.target.closest(".table-cell-clickable");
    if (cell) {
      const installationData = cell.getAttribute("data-installation");
      if (installationData) {
        try {
          const installation = JSON.parse(installationData);
          openEditModal(installation);
        } catch (error) {
          console.error("Erro ao parsear dados da instalação:", error);
        }
      }
    }
  });

  // Event listener para o formulário de edição
  const editForm = document.getElementById("editInstallationForm");
  if (editForm) {
    editForm.addEventListener("submit", handleEditSubmit);
  }
});

// Função helper para converter data de YYYY-MM-DD para DD/MM/YYYY
function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  // Se já está no formato DD/MM/YYYY, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  // Se está no formato YYYY-MM-DD, converte para DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Função helper para converter data de DD/MM/YYYY ou YYYY-MM-DD para objeto Date sem problemas de timezone
function parseDateSafe(dateStr) {
  if (!dateStr) return null;

  // Se está no formato YYYY-MM-DD, parsear manualmente para evitar problemas de timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Se está no formato DD/MM/YYYY, parsear manualmente
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback para new Date padrão
  return new Date(dateStr);
}

function openEditModal(installation) {
  currentEditInstallation = installation;

  // Converter dueDate de YYYY-MM-DD para DD/MM/YYYY para exibição
  const dueDateFormatted = formatDateForDisplay(installation.dueDate || "");

  // Preencher os campos do modal
  document.getElementById("editInstallationId").value = installation.id;
  document.getElementById("editClientId").value = installation.clientId || "";
  document.getElementById("editClientName").value =
    installation.clientName || "";
  document.getElementById("editInstallationType").value =
    installation.installationType || "";
  document.getElementById("editAttendant").value = installation.attendant || "";
  document.getElementById("editTurno").value =
    installation.turno_preferencial || "";
  document.getElementById("editDueDate").value = dueDateFormatted;
  document.getElementById("editObservation").value =
    installation.observation || "";

  // Mostrar o modal
  const modal = document.getElementById("editInstallationModal");
  if (modal) {
    modal.classList.remove("hidden");

    // Inicializar Flatpickr para o campo de data (mesma configuração do add_installation)
    if (typeof flatpickr !== "undefined") {
      const dueDateInput = document.getElementById("editDueDate");
      if (dueDateInput) {
        // Destruir instância anterior se existir
        if (dueDateInput._flatpickr) {
          dueDateInput._flatpickr.destroy();
        }

        // Buscar configurações de feriados, limites e datas bloqueadas (mesma lógica do add_installation)
        const filialInstalacao = installation.filial || "Caxias";

        Promise.all([
          fetchBlockedDates(filialInstalacao),
          fetch("/api/configuracoes").then((res) => res.json()),
        ])
          .then(([blockedDates, config]) => {
            const feriados = config.feriados || [];
            const limites = config.limite_diario || {};

            // Formatar datas bloqueadas para o formato esperado pelo Flatpickr
            const blockedDatesFormatted = blockedDates.map((dateStr) => {
              const [year, month, day] = dateStr.split("-");
              return `${day}/${month}/${year}`;
            });

            // Formatar feriados para o formato esperado pelo Flatpickr
            const feriadosFormatted = feriados.map((feriado) => {
              const [year, month, day] = feriado.split("-");
              return `${day}/${month}/${year}`;
            });

            // Configurar dias da semana bloqueados baseado nos limites da filial da instalação (mesma lógica do add_installation)
            const diasSemana = [
              "dom",
              "seg",
              "ter",
              "qua",
              "qui",
              "sex",
              "sab",
            ];
            const limitesFilial = limites[filialInstalacao] || {};
            const diasSemanaBloqueados = diasSemana
              .map((dia, idx) => {
                if (limitesFilial[dia] === 0 || limitesFilial[dia] === "0") {
                  return function (date) {
                    return date.getDay() === idx;
                  };
                }
                return null;
              })
              .filter(Boolean);

            // Parsear a data de forma segura para evitar problemas de timezone
            // Usar o valor já formatado do input ou parsear do dueDate original
            const inputValue = dueDateInput.value;
            const defaultDate = inputValue
              ? parseDateSafe(inputValue)
              : installation.dueDate
                ? parseDateSafe(installation.dueDate)
                : new Date();

            // Inicializar nova instância com a mesma configuração do add_installation
            flatpickr("#editDueDate", {
              dateFormat: "d/m/Y",
              minDate: new Date().fp_incr(-0),
              defaultDate: defaultDate,
              disable: [
                ...blockedDatesFormatted,
                ...feriadosFormatted,
                ...diasSemanaBloqueados,
                function (date) {
                  // Desabilitar domingos se não houver limite definido para a filial
                  return (
                    limitesFilial["dom"] === undefined && date.getDay() === 0
                  );
                },
              ],
              locale: {
                firstDayOfWeek: 1,
                weekdays: {
                  shorthand: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
                  longhand: [
                    "Domingo",
                    "Segunda-feira",
                    "Terça-feira",
                    "Quarta-feira",
                    "Quinta-feira",
                    "Sexta-feira",
                    "Sábado",
                  ],
                },
                months: {
                  shorthand: [
                    "Jan",
                    "Fev",
                    "Mar",
                    "Abr",
                    "Mai",
                    "Jun",
                    "Jul",
                    "Ago",
                    "Set",
                    "Out",
                    "Nov",
                    "Dez",
                  ],
                  longhand: [
                    "Janeiro",
                    "Fevereiro",
                    "Março",
                    "Abril",
                    "Maio",
                    "Junho",
                    "Julho",
                    "Agosto",
                    "Setembro",
                    "Outubro",
                    "Novembro",
                    "Dezembro",
                  ],
                },
              },
              disableMobile: true,
              allowInput: false,
            });
          })
          .catch((error) => {
            console.error("Erro ao carregar configurações:", error);
            // Parsear a data de forma segura para evitar problemas de timezone
            // Usar o valor já formatado do input ou parsear do dueDate original
            const inputValue = dueDateInput.value;
            const defaultDate = inputValue
              ? parseDateSafe(inputValue)
              : installation.dueDate
                ? parseDateSafe(installation.dueDate)
                : new Date();

            // Fallback: usar configuração básica
            flatpickr("#editDueDate", {
              dateFormat: "d/m/Y",
              minDate: new Date().fp_incr(-0),
              defaultDate: defaultDate,
              disableMobile: true,
              allowInput: false,
              locale: {
                firstDayOfWeek: 1,
                weekdays: {
                  shorthand: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
                  longhand: [
                    "Domingo",
                    "Segunda-feira",
                    "Terça-feira",
                    "Quarta-feira",
                    "Quinta-feira",
                    "Sexta-feira",
                    "Sábado",
                  ],
                },
                months: {
                  shorthand: [
                    "Jan",
                    "Fev",
                    "Mar",
                    "Abr",
                    "Mai",
                    "Jun",
                    "Jul",
                    "Ago",
                    "Set",
                    "Out",
                    "Nov",
                    "Dez",
                  ],
                  longhand: [
                    "Janeiro",
                    "Fevereiro",
                    "Março",
                    "Abril",
                    "Maio",
                    "Junho",
                    "Julho",
                    "Agosto",
                    "Setembro",
                    "Outubro",
                    "Novembro",
                    "Dezembro",
                  ],
                },
              },
            });
          });
      }
    }
  }
}

function closeEditModal() {
  const modal = document.getElementById("editInstallationModal");
  if (modal) {
    modal.classList.add("hidden");
  }
  currentEditInstallation = null;
}

async function handleEditSubmit(e) {
  e.preventDefault();

  if (isEditSubmitting) {
    return;
  }

  if (!currentEditInstallation) {
    console.error("Nenhuma instalação selecionada para edição");
    return;
  }

  const submitButton = e.target.querySelector('button[type="submit"]');
  isEditSubmitting = true;
  if (submitButton) {
    submitButton.disabled = true;
  }

  const formData = new FormData(e.target);

  // Formatar a data corretamente (igual ao add_installation),
  // sempre a partir do texto que o usuário vê (DD/MM/AAAA) para evitar problemas de timezone
  const dueDateInput = document.getElementById("editDueDate");
  let dueDateFormatted = "";
  const rawDueDate =
    dueDateInput && dueDateInput.value ? dueDateInput.value.trim() : "";
  if (rawDueDate) {
    const parts = rawDueDate.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      dueDateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  // Fallback de segurança: se não conseguir converter, tenta usar flatpickr
  if (
    !dueDateFormatted &&
    dueDateInput &&
    dueDateInput._flatpickr &&
    dueDateInput._flatpickr.selectedDates.length
  ) {
    const fp = dueDateInput._flatpickr;
    dueDateFormatted = fp.formatDate(fp.selectedDates[0], "Y-m-d");
  }

  const updateData = {
    id: currentEditInstallation.id,
    dueDate: dueDateFormatted,
    observation: formData.get("observation"),
  };

  if (!updateData.dueDate) {
    if (typeof showNotification === "function") {
      showNotification("Data de agendamento inválida.", "error");
    } else {
      alert("Data de agendamento inválida.");
    }
    isEditSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
    return;
  }

  try {
    const response = await fetch("/api/installations/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();

    if (result.success) {
      // Recarrega os dados do servidor para evitar estado local inconsistente
      const listUrl = window.API_URLS
        ? window.API_URLS.getInstallations
        : "/api/installations";
      const listResponse = await fetch(listUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const listResult = await listResponse.json();
      if (listResult.success && Array.isArray(listResult.installations)) {
        window.installations = listResult.installations;
      }

      filterTableByColumns();

      // Fechar o modal
      closeEditModal();

      // Mostrar mensagem de sucesso
      if (typeof showNotification === "function") {
        showNotification("Serviço atualizado com sucesso!", "success");
      } else {
        alert("Serviço atualizado com sucesso!");
      }
    } else {
      throw new Error(result.message || "Erro ao atualizar serviço");
    }
  } catch (error) {
    console.error("Erro ao atualizar serviço:", error);
    if (typeof showNotification === "function") {
      showNotification("Erro ao atualizar serviço: " + error.message, "error");
    } else {
      alert("Erro ao atualizar serviço: " + error.message);
    }
  } finally {
    isEditSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}
