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

async function fetchLimitesDiarios() {
  try {
    const res = await fetch("/api/configuracoes");
    const data = await res.json();
    if (data && data.limite_diario) {
      return data.limite_diario;
    }
  } catch (e) {
    console.error("Erro ao buscar limites diários:", e);
  }
  return {
    Caxias: { seg: 30, ter: 30, qua: 30, qui: 30, sex: 30, sab: 30, dom: 30 },
    Vilar: { seg: 30, ter: 30, qua: 30, qui: 30, sex: 30, sab: 30, dom: 30 },
  };
}

document.addEventListener("DOMContentLoaded", function () {
  const filialSelect = document.getElementById("filial");
  let flatpickrInstance = null;

  function setupFlatpickr(filial) {
    if (flatpickrInstance) {
      flatpickrInstance.destroy();
    }
    Promise.all([
      fetchBlockedDates(filial),
      fetchLimitesDiarios(),
      fetch("/api/configuracoes").then((res) => res.json()),
    ]).then(([blockedDates, limitesDiarios, config]) => {
      const blockedDatesFormatted = blockedDates.map((dateStr) => {
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
      });
      let feriados = [];
      if (config.feriados && Array.isArray(config.feriados)) {
        feriados = config.feriados.map((dateStr) => {
          const [year, month, day] = dateStr.split("-");
          return `${day}/${month}/${year}`;
        });
      }
      const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      const limites = limitesDiarios[filial] || {};
      const diasSemanaBloqueados = diasSemana
        .map((dia, idx) => {
          if (limites[dia] === 0) {
            return function (date) {
              return date.getDay() === idx;
            };
          }
          return null;
        })
        .filter(Boolean);
      flatpickrInstance = flatpickr("#dueDate", {
        dateFormat: "d/m/Y",
        minDate: new Date().fp_incr(-0),
        defaultDate: new Date(),
        disable: [
          ...blockedDatesFormatted,
          ...feriados,
          ...diasSemanaBloqueados,
          function (date) {
            return limites["dom"] === undefined && date.getDay() === 0;
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
    });
  }

  filialSelect.addEventListener("change", function () {
    if (filialSelect.value) {
      setupFlatpickr(filialSelect.value);
    } else if (flatpickrInstance) {
      flatpickrInstance.destroy();
      flatpickrInstance = null;
    }
  });

  if (filialSelect.value) {
    setupFlatpickr(filialSelect.value);
  }

  const filial = document.getElementById("filial");
  const form = document.getElementById("addInstallationForm");
  const fields = Array.from(
    form.querySelectorAll(
      'input:not([name="csrf_token"]):not([id="filial"]), select:not([id="filial"]), textarea'
    )
  );

  function toggleFields(disabled) {
    fields.forEach((f) => {
      f.disabled = disabled;
    });
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.classList.toggle("opacity-50", disabled);
      btn.classList.toggle("pointer-events-none", disabled);
      btn.disabled = false;
    }
  }

  toggleFields(true);
  filial.addEventListener("change", function () {
    toggleFields(!filial.value);
    if (requestDateInput) {
      setTimeout(toggleRequestDateRequired, 100);
    }
  });

  const requestDateInput = document.getElementById("requestDate");
  const planSelect = document.getElementById("plan");
  const installationTypeSelect = document.getElementById("installationType");

  const servicesWithoutDueDate = [
    "Troca de cômodo",
    "Transferência + troc. titularidade",
    "Transferência Fibra",
    "Transferência de Comodo",
    "Transferência",
    "Pedido de Transferência",
    "Migração",
  ];

  const servicesWithOptionalRequestDate = ["Extenção de Fibra"];

  const transferServices = [
    "Pedido de Transferência",
    "Transferência",
    "Transferência de Comodo",
    "Transferência Fibra",
    "Transferência Utp",
    "Transferência + troc. titularidade",
    "Troca de cômodo",
    "Extenção de Fibra",
    "Migração",
    "Outra instalação fibra",
    "Outra instalação Utp",
  ];

  const installationTypesWithoutDueDateForPrepaid = [
    "Instalação Fibra",
    "Instalação Utp",
    "Outra instalação fibra",
    "Outra instalação Utp",
  ];
  const allPlans = [
    "20MB",
    "50MB",
    "70MB",
    "90MB",
    "300MB",
    "500MB",
    "600MB",
    "800MB",
    "1000MB",
    "600MB PRÉ-PAGO",
    "300MB + Telefonia",
    "500MB + Telefonia",
    "600MB + Telefonia",
    "800MB + Telefonia",
    "1000MB + Telefonia",
    "Telefonia",
    "30MB FUNCIONARIO",
  ];
  function showTransferServiceNotification() {
    const selectedService = installationTypeSelect.value;
    const clientIdInput = document.getElementById("clientId");
    const clientNameInput = document.getElementById("clientName");

    if (transferServices.includes(selectedService)) {
      const existingNotification = document.querySelector(
        ".transfer-notification"
      );
      if (existingNotification) {
        existingNotification.remove();
      }
      const notification = document.createElement("div");
      notification.className = "transfer-notification";
      notification.innerHTML = `
        <div class="notification-content">
          <i class="fas fa-info-circle"></i>
          <span>Serviço de transferência ou Troca de cômodo selecionado. Este tipo de serviço permite duplicação mesmo se o cliente já possuir outros agendamentos.</span>
        </div>
      `;

      const installationTypeContainer =
        installationTypeSelect.closest(".field-container");
      if (installationTypeContainer) {
        installationTypeContainer.parentNode.insertBefore(
          notification,
          installationTypeContainer.nextSibling
        );
      }
    } else {
      const existingNotification = document.querySelector(
        ".transfer-notification"
      );
      if (existingNotification) {
        existingNotification.remove();
      }
    }
  }

  function toggleRequestDateRequired() {
    const selectedPlan = planSelect.value;
    const selectedService = installationTypeSelect.value;
    const fieldsEnabled = filial.value ? true : false;
    if (!fieldsEnabled) {
      requestDateInput.disabled = true;
      requestDateInput.style.opacity = "0.5";
      requestDateInput.style.cursor = "not-allowed";
      const container = requestDateInput.closest(".field-container");
      if (container) {
        const parentDiv = container.parentElement;
        if (parentDiv) {
          parentDiv.style.display = "none";
        }
      }
      return;
    }

    const isServiceWithoutDueDate =
      servicesWithoutDueDate.includes(selectedService);
    const isServiceWithOptionalDate =
      servicesWithOptionalRequestDate.includes(selectedService);
    const isPrepaidPlan = selectedPlan === "600MB PRÉ-PAGO";

    const container = requestDateInput.closest(".field-container");
    const parentDiv = container ? container.parentElement : null;

    if (isPrepaidPlan) {
      requestDateInput.removeAttribute("required");
      requestDateInput.value = "";
      requestDateInput.disabled = true;
      if (parentDiv) {
        parentDiv.style.display = "none";
      }
    } else if (isServiceWithoutDueDate) {
      requestDateInput.removeAttribute("required");
      requestDateInput.value = "";
      requestDateInput.disabled = true;
      requestDateInput.style.opacity = "0.5";
      requestDateInput.style.cursor = "not-allowed";
      if (parentDiv) {
        parentDiv.style.display = "block";
      }
      if (container) {
        container.style.pointerEvents = "none";
        container.style.opacity = "0.5";
      }
    } else if (isServiceWithOptionalDate) {
      requestDateInput.removeAttribute("required");
      requestDateInput.disabled = false;
      requestDateInput.style.opacity = "1";
      requestDateInput.style.cursor = "pointer";
      if (parentDiv) {
        parentDiv.style.display = "block";
      }
      if (container) {
        container.style.pointerEvents = "auto";
        container.style.opacity = "1";
      }
    } else {
      requestDateInput.setAttribute("required", "required");
      requestDateInput.disabled = false;
      requestDateInput.style.opacity = "1";
      requestDateInput.style.cursor = "pointer";
      if (parentDiv) {
        parentDiv.style.display = "block";
      }
      if (container) {
        container.style.pointerEvents = "auto";
        container.style.opacity = "1";
      }
    }
  }
  if (requestDateInput) {
    if (planSelect) {
      planSelect.addEventListener("change", toggleRequestDateRequired);
    }
    if (installationTypeSelect) {
      installationTypeSelect.addEventListener(
        "change",
        toggleRequestDateRequired
      );
      installationTypeSelect.addEventListener(
        "change",
        showTransferServiceNotification
      );
    }

    toggleRequestDateRequired();
    showTransferServiceNotification();

    setTimeout(() => {
      toggleRequestDateRequired();
      showTransferServiceNotification();
    }, 500);
  } else {
    console.error("requestDateInput not found!");
  }

  const clientIdInput = document.getElementById("clientId");
  const clientNameInput = document.getElementById("clientName");

  async function buscarNomeClienteIXC(idCliente) {
    if (!idCliente) return;
    try {
      const response = await fetch(
        "/api/ixc_cliente_nome?id=" + encodeURIComponent(idCliente)
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.razao) {
        clientNameInput.value = data.razao;
      }
    } catch (e) {}
  }

  if (clientIdInput && clientNameInput) {
    clientIdInput.addEventListener("blur", function () {
      buscarNomeClienteIXC(this.value.trim());
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const planSelect = document.getElementById("plan");
      const installationTypeSelect =
        document.getElementById("installationType");
      const selectedService = installationTypeSelect.value;
      const selectedPlan = planSelect.value;
      const isPrepaidPlan = selectedPlan === "600MB PRÉ-PAGO";
      const isServiceWithoutDueDate =
        servicesWithoutDueDate.includes(selectedService);
      const isServiceWithOptionalDate =
        typeof servicesWithOptionalRequestDate !== "undefined" &&
        servicesWithOptionalRequestDate.includes(selectedService);
      const needsDueDateValidation =
        !isPrepaidPlan &&
        !isServiceWithoutDueDate &&
        !isServiceWithOptionalDate;

      if (requestDateInput && needsDueDateValidation) {
        const day = parseInt(requestDateInput.value, 10);
        if (isNaN(day) || day < 1 || day > 31) {
          await Swal.fire({
            icon: "error",
            title: "Erro!",
            text: 'O campo "Vencimento para o dia" deve ser um número entre 1 e 31.',
            confirmButtonText: "OK",
          });
          requestDateInput.focus();
          return;
        }
      }

      const formData = new FormData(form);
      const dueDateInput = document.getElementById("dueDate");

      let dueDateFormatted = "";
      const rawDueDate =
        dueDateInput && dueDateInput.value ? dueDateInput.value.trim() : "";
      if (rawDueDate) {
        const parts = rawDueDate.split("/");
        if (parts.length === 3) {
          const [day, month, year] = parts;
          dueDateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(
            2,
            "0"
          )}`;
        }
      }

      if (
        !dueDateFormatted &&
        dueDateInput &&
        dueDateInput._flatpickr &&
        dueDateInput._flatpickr.selectedDates.length
      ) {
        const fp = dueDateInput._flatpickr;
        dueDateFormatted = fp.formatDate(fp.selectedDates[0], "Y-m-d");
      }

      formData.set("dueDate", dueDateFormatted);
      try {
        const response = await fetch("/add_installation", {
          method: "POST",
          headers: {
            "X-CSRF-Token": formData.get("csrf_token"),
          },
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          let redirected = false;
          await Swal.fire({
            icon: "success",
            title: "Sucesso!",
            text: data.message,
            confirmButtonText: "Ir para lista",
            timer: 2000,
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: (popup) => {
              const confirmBtn = Swal.getConfirmButton();
              confirmBtn.addEventListener("click", () => {
                if (!redirected) {
                  redirected = true;
                  window.location.href = "/view_installations";
                }
              });
            },
            willClose: () => {
              if (!redirected) {
                redirected = true;
                window.location.href = "/view_installations";
              }
            },
          });
        } else {
          await Swal.fire({
            icon: "error",
            title: "Erro!",
            text: data.message,
            confirmButtonText: "OK",
          });
        }
      } catch (error) {
        console.error("Erro ao adicionar instalação:", error);
        await Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Erro ao processar a solicitação.",
          confirmButtonText: "OK",
        });
      }
    });
  }
});
