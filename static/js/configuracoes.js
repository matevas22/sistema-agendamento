document.addEventListener("DOMContentLoaded", function () {
  // Dias da semana
  const dias = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  const filiais = ["Caxias", "Vilar"];
  const diasSemanaPt = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const mesesPt = [
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
  ];

  let config = {};
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let selectedFilial = "Caxias";
  let selectedDate = null;
  let installationsData = {};

  // Função para preencher os campos
  function preencherCampos(limites) {
    filiais.forEach((filial) => {
      dias.forEach((dia) => {
        const input = document.getElementById(`${filial.toLowerCase()}_${dia}`);
        if (input) {
          input.value =
            limites &&
            limites[filial] &&
            typeof limites[filial][dia] !== "undefined"
              ? limites[filial][dia]
              : 20;
        }
      });
    });
  }

  // Carregar configurações
  function loadConfig() {
    return fetch("/api/configuracoes")
      .then((res) => res.json())
      .then((data) => {
        config = data;
        if (config.limite_diario) {
          preencherCampos(config.limite_diario);
        }
        // Garantir que limites_personalizados existe
        if (!config.limites_personalizados) {
          config.limites_personalizados = {};
        }
        // Garantir que planos existe
        if (!config.planos) {
          config.planos = [];
        }
        renderPlanos();
        // Renderizar calendário sempre
        renderCalendar();
        return data;
      });
  }

  // Carregar dados de instalações
  function loadInstallations() {
    return fetch("/api/installations")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          installationsData = {};
          data.installations.forEach((inst) => {
            let date = inst.dueDate;
            // Converter formato de data se necessário (DD/MM/YYYY -> YYYY-MM-DD)
            if (date && date.includes("/")) {
              const parts = date.split("/");
              if (parts.length === 3) {
                date = `${parts[2]}-${parts[1].padStart(
                  2,
                  "0",
                )}-${parts[0].padStart(2, "0")}`;
              }
            }
            const filial = inst.filial || "Caxias";
            if (!installationsData[filial]) {
              installationsData[filial] = {};
            }
            if (!installationsData[filial][date]) {
              installationsData[filial][date] = 0;
            }
            installationsData[filial][date]++;
          });
          renderCalendar();
        }
      });
  }

  // Renderizar lista de planos
  function renderPlanos() {
    const lista = document.getElementById("listaPlanos");
    if (!lista) return;

    lista.innerHTML = "";
    const planos = config.planos || [];

    planos.forEach((plano, index) => {
      const li = document.createElement("li");
      li.style.padding = "8px 12px";
      li.style.borderBottom = "1px solid #eee";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      const span = document.createElement("span");
      span.textContent = plano;

      const btnDelete = document.createElement("button");
      btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
      btnDelete.className = "btn-delete-plano";
      btnDelete.style.background = "#ef4444";
      btnDelete.style.color = "white";
      btnDelete.style.border = "none";
      btnDelete.style.borderRadius = "4px";
      btnDelete.style.padding = "4px 8px";
      btnDelete.style.cursor = "pointer";
      btnDelete.onclick = function () {
        deletarPlano(index);
      };

      li.appendChild(span);
      li.appendChild(btnDelete);
      lista.appendChild(li);
    });
  }

  // Adicionar novo plano
  const btnAdicionarPlano = document.getElementById("btnAdicionarPlano");
  if (btnAdicionarPlano) {
    btnAdicionarPlano.addEventListener("click", function () {
      const input = document.getElementById("novoPlano");
      const novoPlano = input.value.trim();

      if (!novoPlano) {
        mostrarMensagem("msgPlanos", "Digite o nome do plano.", "error");
        return;
      }

      if (!config.planos) config.planos = [];

      if (config.planos.includes(novoPlano)) {
        mostrarMensagem("msgPlanos", "Este plano já existe.", "error");
        return;
      }

      config.planos.push(novoPlano);
      salvarConfiguracaoPlanos();
      input.value = "";
    });
  }

  // Deletar plano
  function deletarPlano(index) {
    if (confirm("Tem certeza que deseja excluir este plano?")) {
      config.planos.splice(index, 1);
      salvarConfiguracaoPlanos();
    }
  }

  // Salvar configuração de planos
  function salvarConfiguracaoPlanos() {
    fetch("/api/configuracoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": document.querySelector('input[name="csrf_token"]')
          ?.value,
      },
      body: JSON.stringify({ planos: config.planos }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          mostrarMensagem(
            "msgPlanos",
            "Planos atualizados com sucesso!",
            "success",
          );
          renderPlanos();
        } else {
          mostrarMensagem("msgPlanos", "Erro ao salvar planos.", "error");
        }
      })
      .catch((err) => {
        console.error(err);
        mostrarMensagem("msgPlanos", "Erro ao salvar planos.", "error");
      });
  }

  function mostrarMensagem(elementId, msg, type) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = msg;
      el.className = type === "error" ? "msg-error" : "msg-success";
      el.style.color = type === "error" ? "red" : "green";
      el.style.marginTop = "10px";
      setTimeout(() => {
        el.textContent = "";
      }, 3000);
    }
  }

  // Renderizar calendário
  function renderCalendar() {
    const container = document.getElementById("calendarContainer");
    if (!container) {
      console.error("calendarContainer não encontrado!");
      return;
    }

    // Garantir que config existe e tem estrutura mínima
    if (!config) {
      config = {
        limite_diario: {
          Caxias: {
            seg: 20,
            ter: 20,
            qua: 20,
            qui: 20,
            sex: 20,
            sab: 5,
            dom: 5,
          },
          Vilar: {
            seg: 20,
            ter: 20,
            qua: 20,
            qui: 20,
            sex: 20,
            sab: 5,
            dom: 5,
          },
        },
        limites_personalizados: {},
      };
    }
    if (!config.limite_diario) {
      config.limite_diario = {
        Caxias: { seg: 20, ter: 20, qua: 20, qui: 20, sex: 20, sab: 5, dom: 5 },
        Vilar: { seg: 20, ter: 20, qua: 20, qui: 20, sex: 20, sab: 5, dom: 5 },
      };
    }
    if (!config.limites_personalizados) {
      config.limites_personalizados = {};
    }
    if (!installationsData) {
      installationsData = {};
    }

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Ordem das colunas: Seg, Ter, Qua, Qui, Sex, Sáb, Dom
    // getDay() retorna: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
    // Precisamos mapear: 1->0, 2->1, 3->2, 4->3, 5->4, 6->5, 0->6

    let html = '<table class="calendar-table"><thead><tr>';
    // Segunda a Sábado
    for (let i = 1; i <= 6; i++) {
      html += `<th>${diasSemanaPt[i].substring(0, 3)}</th>`;
    }
    // Domingo no final
    html += `<th>${diasSemanaPt[0].substring(0, 3)}</th>`;
    html += "</tr></thead><tbody><tr>";

    // Converter startingDayOfWeek para a ordem correta (Seg=0, Dom=6)
    // getDay() retorna 0=Domingo, mas queremos domingo na última coluna (índice 6)
    // Se getDay() = 0 (domingo), coluna = 6
    // Se getDay() = 1 (segunda), coluna = 0
    // Se getDay() = 6 (sábado), coluna = 5
    let offsetColuna = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    // Espaços vazios antes do primeiro dia
    for (let i = 0; i < offsetColuna; i++) {
      html += "<td></td>";
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0",
      )}-${String(day).padStart(2, "0")}`;
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();

      // Verificar limite personalizado
      const limitesPersonalizados = config.limites_personalizados || {};
      const hasPersonalizado =
        limitesPersonalizados[selectedFilial] &&
        limitesPersonalizados[selectedFilial].hasOwnProperty(dateStr);
      const limitePersonalizado = hasPersonalizado
        ? parseInt(limitesPersonalizados[selectedFilial][dateStr], 10)
        : null;

      // Obter limite padrão
      const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const diaSemanaKey = diasSemana[dayOfWeek];
      const limitePadrao =
        (config.limite_diario &&
          config.limite_diario[selectedFilial] &&
          config.limite_diario[selectedFilial][diaSemanaKey]) ||
        20;
      // Se hasPersonalizado for true, usar limitePersonalizado (mesmo que seja 0)
      const limite = hasPersonalizado ? limitePersonalizado : limitePadrao;

      // Contar instalações
      const count =
        installationsData[selectedFilial] &&
        installationsData[selectedFilial][dateStr]
          ? installationsData[selectedFilial][dateStr]
          : 0;

      // Determinar cor
      let bgColor = "#e5e7eb"; // Normal
      let borderColor = "transparent";
      if (hasPersonalizado) {
        bgColor = "#fbbf24";
        borderColor = "#f59e0b";
      }
      if (count > 0) {
        bgColor = count >= limite ? "#ef4444" : "#3b82f6";
      }

      html += `<td class="calendar-day" data-date="${dateStr}" style="background: ${bgColor}; border: 2px solid ${borderColor}; cursor: pointer;" title="Limite: ${limite} | Agendados: ${count}${
        hasPersonalizado ? " (Personalizado)" : ""
      }">`;
      html += `<div class="day-number">${day}</div>`;
      html += `<div class="day-info">${count}/${limite}</div>`;
      if (hasPersonalizado) {
        html += `<div class="day-badge">⚙️</div>`;
      }
      html += "</td>";

      // Quebrar linha no final da semana (após domingo, que está na última coluna)
      // offsetColuna + day calcula a posição atual
      if ((offsetColuna + day) % 7 === 0) {
        html += "</tr>";
        // Se não for o último dia, abrir nova linha
        if (day < daysInMonth) {
          html += "<tr>";
        }
      }
    }

    // Espaços vazios após o último dia para completar a linha
    const ultimaPosicao = offsetColuna + daysInMonth;
    const remainingCells = 7 - (ultimaPosicao % 7);
    if (remainingCells < 7 && remainingCells > 0) {
      for (let i = 0; i < remainingCells; i++) {
        html += "<td></td>";
      }
    }

    // Fechar última linha e tabela
    html += "</tr></tbody></table>";
    container.innerHTML = html;

    // Atualizar label do mês
    const monthLabel = document.getElementById("currentMonth");
    if (monthLabel) {
      monthLabel.textContent = `${mesesPt[currentMonth]} ${currentYear}`;
    }

    // Adicionar event listeners aos dias
    container.querySelectorAll(".calendar-day").forEach((day) => {
      day.addEventListener("click", function () {
        const dateStr = this.getAttribute("data-date");
        openDayModal(dateStr);
      });
    });
  }

  // Abrir modal de edição
  function openDayModal(dateStr) {
    selectedDate = dateStr;
    const modal = document.getElementById("dayEditModal");
    const modalDate = document.getElementById("modalDate");
    const modalLimit = document.getElementById("modalLimit");
    const modalInfo = document.getElementById("modalInfo");
    const btnRemove = document.getElementById("btnRemoveDayLimit");

    const date = new Date(dateStr + "T00:00:00");
    const dateFormatted = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    modalDate.textContent =
      dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

    // Obter limite atual
    const limitesPersonalizados = config.limites_personalizados || {};
    const hasPersonalizado =
      limitesPersonalizados[selectedFilial] &&
      limitesPersonalizados[selectedFilial].hasOwnProperty(dateStr);
    const limitePersonalizado = hasPersonalizado
      ? parseInt(limitesPersonalizados[selectedFilial][dateStr], 10)
      : null;

    // Obter limite padrão
    const dayOfWeek = date.getDay();
    const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const diaSemanaKey = diasSemana[dayOfWeek];
    const limitePadrao =
      (config.limite_diario &&
        config.limite_diario[selectedFilial] &&
        config.limite_diario[selectedFilial][diaSemanaKey]) ||
      20;

    // Se hasPersonalizado for true, usar limitePersonalizado (mesmo que seja 0)
    modalLimit.value = hasPersonalizado ? limitePersonalizado : limitePadrao;

    const count =
      installationsData[selectedFilial] &&
      installationsData[selectedFilial][dateStr]
        ? installationsData[selectedFilial][dateStr]
        : 0;
    modalInfo.innerHTML = `<p><strong>Limite padrão:</strong> ${limitePadrao}</p><p><strong>Agendados:</strong> ${count}</p>`;

    if (hasPersonalizado) {
      btnRemove.style.display = "block";
    } else {
      btnRemove.style.display = "none";
    }

    modal.style.display = "block";
  }

  // Salvar limite personalizado
  function saveDayLimit(limit) {
    if (!config.limites_personalizados) {
      config.limites_personalizados = {};
    }
    if (!config.limites_personalizados[selectedFilial]) {
      config.limites_personalizados[selectedFilial] = {};
    }
    config.limites_personalizados[selectedFilial][selectedDate] = parseInt(
      limit,
      10,
    );

    fetch("/api/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limites_personalizados: config.limites_personalizados,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          loadConfig().then(() => {
            renderCalendar();
            closeDayModal();
            showMessage(
              "msgLimitePersonalizado",
              "Limite personalizado salvo com sucesso!",
              "success",
            );
          });
        } else {
          showMessage(
            "msgLimitePersonalizado",
            data.message || "Erro ao salvar.",
            "error",
          );
        }
      })
      .catch(() => {
        showMessage("msgLimitePersonalizado", "Erro ao salvar.", "error");
      });
  }

  // Remover limite personalizado
  function removeDayLimit() {
    if (!selectedDate || !selectedFilial) {
      showMessage(
        "msgLimitePersonalizado",
        "Data ou filial não selecionada.",
        "error",
      );
      return;
    }

    if (
      !config.limites_personalizados ||
      !config.limites_personalizados[selectedFilial]
    ) {
      showMessage(
        "msgLimitePersonalizado",
        "Não há limite personalizado para remover.",
        "error",
      );
      return;
    }

    if (
      !config.limites_personalizados[selectedFilial].hasOwnProperty(
        selectedDate,
      )
    ) {
      showMessage(
        "msgLimitePersonalizado",
        "Não há limite personalizado para esta data.",
        "error",
      );
      return;
    }

    fetch("/api/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remover_limite_personalizado: true,
        filial: selectedFilial,
        date: selectedDate,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          // Remover do objeto local
          if (config.limites_personalizados[selectedFilial]) {
            delete config.limites_personalizados[selectedFilial][selectedDate];
            // Se a filial ficou vazia, remover também
            if (
              Object.keys(config.limites_personalizados[selectedFilial])
                .length === 0
            ) {
              delete config.limites_personalizados[selectedFilial];
            }
          }
          // Recarregar configurações do servidor
          loadConfig().then(() => {
            renderCalendar();
            closeDayModal();
            showMessage(
              "msgLimitePersonalizado",
              "Limite personalizado removido com sucesso!",
              "success",
            );
          });
        } else {
          showMessage(
            "msgLimitePersonalizado",
            data.message || "Erro ao remover.",
            "error",
          );
        }
      })
      .catch((error) => {
        console.error("Erro ao remover limite:", error);
        showMessage(
          "msgLimitePersonalizado",
          "Erro ao remover limite personalizado.",
          "error",
        );
      });
  }

  function closeDayModal() {
    document.getElementById("dayEditModal").style.display = "none";
    selectedDate = null;
  }

  function showMessage(id, text, type) {
    const msg = document.getElementById(id);
    if (msg) {
      msg.textContent = text;
      msg.style.color = type === "success" ? "#10b981" : "#ef4444";
      setTimeout(() => (msg.textContent = ""), 3000);
    }
  }

  // Event listeners para calendário
  const selectFilial = document.getElementById("selectFilialLimite");
  if (selectFilial) {
    selectFilial.addEventListener("change", function () {
      selectedFilial = this.value;
      renderCalendar();
    });
  }

  const prevMonthBtn = document.getElementById("prevMonth");
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", function () {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  const nextMonthBtn = document.getElementById("nextMonth");
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", function () {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  }

  const btnSaveDayLimit = document.getElementById("btnSaveDayLimit");
  if (btnSaveDayLimit) {
    btnSaveDayLimit.addEventListener("click", function () {
      const limit = document.getElementById("modalLimit").value;
      if (limit && limit >= 0) {
        saveDayLimit(limit);
      }
    });
  }

  const btnRemoveDayLimit = document.getElementById("btnRemoveDayLimit");
  if (btnRemoveDayLimit) {
    btnRemoveDayLimit.addEventListener("click", function (e) {
      e.preventDefault();
      if (
        confirm("Tem certeza que deseja remover a personalização deste dia?")
      ) {
        removeDayLimit();
      }
    });
  }

  const btnCancelDayLimit = document.getElementById("btnCancelDayLimit");
  if (btnCancelDayLimit) {
    btnCancelDayLimit.addEventListener("click", closeDayModal);
  }

  const closeModalBtn = document.querySelector(".close-modal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeDayModal);
  }

  window.onclick = function (event) {
    const modal = document.getElementById("dayEditModal");
    if (event.target == modal) {
      closeDayModal();
    }
  };

  // Inputs desabilitados por padrão
  function setInputsDisabled(disabled) {
    filiais.forEach((filial) => {
      dias.forEach((dia) => {
        const input = document.getElementById(`${filial.toLowerCase()}_${dia}`);
        if (input) input.disabled = disabled;
      });
    });
  }
  setInputsDisabled(true);

  // Botão Editar
  const btnEditar = document.getElementById("btnEditarLimite");
  if (btnEditar) {
    btnEditar.addEventListener("click", function () {
      setInputsDisabled(false);
      this.style.display = "none";
      document.getElementById("btnSalvarLimite").style.display = "";
    });
  }

  // Salvar limites padrão
  const formLimites = document.getElementById("formLimites");
  if (formLimites) {
    formLimites.addEventListener("submit", function (e) {
      e.preventDefault();
      const limites = {};
      filiais.forEach((filial) => {
        limites[filial] = {};
        dias.forEach((dia) => {
          const input = document.getElementById(
            `${filial.toLowerCase()}_${dia}`,
          );
          limites[filial][dia] = parseInt(input.value, 10) || 0;
        });
      });
      fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limite_diario: limites }),
      })
        .then((res) => res.json())
        .then((data) => {
          const msg = document.getElementById("msgLimite");
          if (data.success) {
            msg.textContent = "Limites salvos com sucesso!";
            msg.style.color = "#2563eb";
            setInputsDisabled(true);
            document.getElementById("btnEditarLimite").style.display = "";
            document.getElementById("btnSalvarLimite").style.display = "none";
            loadConfig().then(() => renderCalendar());
          } else {
            msg.textContent = data.message || "Erro ao salvar.";
            msg.style.color = "#dc2626";
          }
        })
        .catch(() => {
          const msg = document.getElementById("msgLimite");
          msg.textContent = "Erro ao salvar.";
          msg.style.color = "#dc2626";
        });
    });
  }

  // Inicializar - Garantir que o calendário seja renderizado
  // Garantir valores iniciais
  if (!config || Object.keys(config).length === 0) {
    config = {
      limite_diario: {
        Caxias: { seg: 20, ter: 20, qua: 20, qui: 20, sex: 20, sab: 5, dom: 5 },
        Vilar: { seg: 20, ter: 20, qua: 20, qui: 20, sex: 20, sab: 5, dom: 5 },
      },
      limites_personalizados: {},
    };
  }
  if (!installationsData) {
    installationsData = {};
  }

  // Carregar configurações e renderizar calendário
  loadConfig()
    .then(() => {
      // Renderizar calendário mesmo antes de carregar instalações
      renderCalendar();
      return loadInstallations();
    })
    .then(() => {
      // Re-renderizar após carregar instalações para mostrar contagens
      renderCalendar();
    })
    .catch((error) => {
      console.error("Erro ao carregar:", error);
      // Renderizar calendário mesmo se houver erro
      renderCalendar();
    });

  // --- FERIADOS ---
  let feriados = [];
  const inputFeriados = document.getElementById("inputFeriados");
  if (inputFeriados) {
    // Inicializa flatpickr para múltiplas datas
    flatpickr(inputFeriados, {
      mode: "multiple",
      dateFormat: "d/m/Y",
      locale: "pt",
      onChange: function (selectedDates, dateStr, instance) {
        feriados = selectedDates.map((d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        });
      },
    });
    // Carregar feriados existentes
    fetch("/api/configuracoes")
      .then((res) => res.json())
      .then((config) => {
        if (config.feriados && Array.isArray(config.feriados)) {
          feriados = config.feriados;
          if (feriados.length > 0) {
            const fp = inputFeriados._flatpickr;
            if (fp) {
              fp.setDate(feriados, true, "Y-m-d");
            }
          }
        }
      });
    // Salvar feriados
    document
      .getElementById("formFeriados")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        fetch("/api/configuracoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feriados }),
        })
          .then((res) => res.json())
          .then((data) => {
            const msg = document.getElementById("msgFeriados");
            if (data.success) {
              msg.textContent = "Feriados salvos com sucesso!";
              msg.style.color = "#2563eb";
            } else {
              msg.textContent = data.message || "Erro ao salvar.";
              msg.style.color = "#dc2626";
            }
          })
          .catch(() => {
            const msg = document.getElementById("msgFeriados");
            msg.textContent = "Erro ao salvar.";
            msg.style.color = "#dc2626";
          });
      });
  }
});

// --- PESQUISA E EDIÇÃO DE SERVIÇOS ---
document.addEventListener("DOMContentLoaded", function () {
  // Inicializar flatpickr para o campo de data de instalação
  const editDueDateInput = document.getElementById("editDueDate");
  if (editDueDateInput) {
    flatpickr(editDueDateInput, {
      dateFormat: "d/m/Y",
      locale: "pt",
      allowInput: true,
      onChange: function (selectedDates, dateStr, instance) {
        // Atualizar o valor do input com a data formatada
        instance.input.value = dateStr;
      },
    });
  }

  // Botão de pesquisa
  const btnPesquisar = document.getElementById("btnPesquisar");
  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", function () {
      const pesquisaId = document.getElementById("pesquisaId").value.trim();
      const pesquisaNome = document.getElementById("pesquisaNome").value.trim();

      if (!pesquisaId && !pesquisaNome) {
        mostrarMensagemPesquisa(
          "Por favor, digite o ID ou nome do cliente.",
          "error",
        );
        return;
      }

      pesquisarServico(pesquisaId, pesquisaNome);
    });
  }

  // Permitir pesquisa ao pressionar Enter nos campos
  const pesquisaIdInput = document.getElementById("pesquisaId");
  const pesquisaNomeInput = document.getElementById("pesquisaNome");

  if (pesquisaIdInput) {
    pesquisaIdInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        btnPesquisar.click();
      }
    });
  }

  if (pesquisaNomeInput) {
    pesquisaNomeInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        btnPesquisar.click();
      }
    });
  }

  // Botão cancelar edição
  const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
  if (btnCancelarEdicao) {
    btnCancelarEdicao.addEventListener("click", function () {
      ocultarFormularioEdicao();
      limparMensagens();
    });
  }

  // Formulário de edição
  const formServicos = document.getElementById("formServicos");
  if (formServicos) {
    formServicos.addEventListener("submit", function (e) {
      e.preventDefault();
      salvarEdicaoServico();
    });
  }
});

function pesquisarServico(clientId, clientName) {
  // Construir URL com parâmetros de query
  const params = new URLSearchParams();
  if (clientId) {
    params.append("client_id", clientId);
  }
  if (clientName) {
    params.append("client_name", clientName);
  }

  const url = `/api/installations/search?${params.toString()}`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        preencherFormularioEdicao(data.installation);
        mostrarFormularioEdicao();
        const searchTerm = clientId || clientName;
        mostrarMensagemPesquisa(
          `Serviço encontrado para "${searchTerm}"!`,
          "success",
        );
      } else {
        const searchTerm = clientId || clientName;
        mostrarMensagemPesquisa(
          data.message || `Serviço não encontrado para "${searchTerm}".`,
          "error",
        );
        ocultarFormularioEdicao();
      }
    })
    .catch((error) => {
      console.error("Erro na pesquisa:", error);
      mostrarMensagemPesquisa("Erro ao pesquisar serviço.", "error");
      ocultarFormularioEdicao();
    });
}

// Função helper para converter data de YYYY-MM-DD para DD/MM/YYYY
function formatDateForDisplayConfig(dateStr) {
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
function parseDateSafeConfig(dateStr) {
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

function preencherFormularioEdicao(installation) {
  document.getElementById("editServiceId").value = installation.id || "";
  document.getElementById("editClientId").value = installation.clientId || "";
  document.getElementById("editClientName").value =
    installation.clientName || "";
  document.getElementById("editInstallationType").value =
    installation.installationType || "";
  document.getElementById("editPlan").value = installation.plan || "";
  document.getElementById("editRequestDate").value =
    installation.requestDate || "";

  // Converter dueDate para o formato correto de exibição
  const dueDateFormatted = formatDateForDisplayConfig(
    installation.dueDate || "",
  );
  document.getElementById("editDueDate").value = dueDateFormatted;
  document.getElementById("editAttendant").value = installation.attendant || "";
  document.getElementById("editObservation").value =
    installation.observation || "";

  // Armazenar o ID do serviço para uso na edição
  document.getElementById("formServicos").dataset.serviceId = installation.id;

  // Atualizar o flatpickr com a nova data de forma segura
  const editDueDateInput = document.getElementById("editDueDate");
  if (editDueDateInput && editDueDateInput._flatpickr) {
    // Parsear a data de forma segura para evitar problemas de timezone
    const parsedDate = parseDateSafeConfig(installation.dueDate || "");
    if (parsedDate) {
      editDueDateInput._flatpickr.setDate(parsedDate, false);
    } else {
      editDueDateInput._flatpickr.setDate(dueDateFormatted, true, "d/m/Y");
    }
  }
}

function mostrarFormularioEdicao() {
  document.getElementById("formularioEdicao").style.display = "block";
}

function ocultarFormularioEdicao() {
  document.getElementById("formularioEdicao").style.display = "none";
  document.getElementById("formServicos").dataset.serviceId = "";
}

function mostrarMensagemPesquisa(mensagem, tipo) {
  const msgElement = document.getElementById("msgPesquisa");
  msgElement.textContent = mensagem;
  msgElement.style.color = tipo === "success" ? "#10b981" : "#ef4444";
}

function mostrarMensagemEdicao(mensagem, tipo) {
  const msgElement = document.getElementById("msgEdicao");
  msgElement.textContent = mensagem;
  msgElement.style.color = tipo === "success" ? "#10b981" : "#ef4444";
}

function limparMensagens() {
  document.getElementById("msgPesquisa").textContent = "";
  document.getElementById("msgEdicao").textContent = "";
}

function salvarEdicaoServico() {
  const serviceId = document.getElementById("formServicos").dataset.serviceId;

  if (!serviceId) {
    mostrarMensagemEdicao("ID do serviço não encontrado.", "error");
    return;
  }

  const editServiceId = document.getElementById("editServiceId").value;
  const clientId = document.getElementById("editClientId").value;
  const clientName = document.getElementById("editClientName").value;
  const installationType = document.getElementById(
    "editInstallationType",
  ).value;
  const plan = document.getElementById("editPlan").value;
  const requestDate = document.getElementById("editRequestDate").value;
  const dueDate = document.getElementById("editDueDate").value;
  const attendant = document.getElementById("editAttendant").value;
  const observation = document.getElementById("editObservation").value;

  if (!dueDate) {
    mostrarMensagemEdicao("A data de instalação é obrigatória.", "error");
    return;
  }

  const dadosEdicao = {
    id: editServiceId || serviceId,
    client_id: clientId,
    client_name: clientName,
    installation_type: installationType,
    plan: plan,
    request_date: requestDate,
    due_date: dueDate,
    attendant: attendant,
    observation: observation,
  };

  fetch(`/api/installations/${serviceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dadosEdicao),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      if (data.success) {
        mostrarMensagemEdicao("Serviço atualizado com sucesso!", "success");
        setTimeout(() => {
          ocultarFormularioEdicao();
          document.getElementById("pesquisaId").value = "";
          document.getElementById("pesquisaNome").value = "";
          limparMensagens();
        }, 2000);
      } else {
        mostrarMensagemEdicao(
          data.message || "Erro ao atualizar serviço.",
          "error",
        );
      }
    })
    .catch((error) => {
      console.error("Erro na edição:", error);
      mostrarMensagemEdicao("Erro ao atualizar serviço.", "error");
    });
}
