/**
 * Franciele Cominetti — Lógica de reserva de turnos
 * Calendario, horarios y envío por WhatsApp
 */
(function () {
  const WHATSAPP_NUMBER = "59891567464";
  const HOUR_START = 8;
  const HOUR_END = 20;
  const SLOT_MINUTES = 30;
  const DAYS_AHEAD = 14;

  const form = document.getElementById("booking-form");
  const serviceSelect = document.getElementById("service-select");
  const priceEl = document.getElementById("booking-price");
  const calendarEl = document.getElementById("booking-calendar");
  const timesEl = document.getElementById("booking-times");

  if (!form || !serviceSelect || !calendarEl || !timesEl) return;

  let selectedDate = null;

  // Pre-seleccionar servicio desde URL (?servicio=valor)
  const params = new URLSearchParams(window.location.search);
  const servicioParam = params.get("servicio");
  if (servicioParam) {
    const opts = Array.from(serviceSelect.options);
    const match = opts.find(function (o) {
      return o.value && o.value.toLowerCase().indexOf(servicioParam.toLowerCase()) !== -1;
    });
    if (match) serviceSelect.value = match.value;
    updatePrice();
  } else {
    updatePrice();
  }

  // Actualizar precio al cambiar servicio
  serviceSelect.addEventListener("change", updatePrice);

  function updatePrice() {
    const opt = serviceSelect.options[serviceSelect.selectedIndex];
    if (!opt || !opt.value) {
      priceEl.textContent = "";
      priceEl.className = "booking-price";
      return;
    }
    const price = opt.getAttribute("data-price");
    if (price) {
      priceEl.textContent = "Precio: $" + formatPrice(price);
      priceEl.className = "booking-price booking-price--visible";
    } else {
      priceEl.textContent = "Consultar precio por WhatsApp";
      priceEl.className = "booking-price booking-price--visible booking-price--consultar";
    }
  }

  function formatPrice(n) {
    return parseInt(n, 10).toLocaleString("es-UY");
  }

  // Generar calendario (próximos N días)
  function buildCalendar() {
    calendarEl.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fragment = document.createDocumentFragment();
    const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);

      const dayNum = d.getDate();
      const month = d.getMonth();
      const year = d.getFullYear();
      const weekday = d.getDay();
      const dateStr = formatDateForStorage(d);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "booking-date";
      btn.setAttribute("data-date", dateStr);
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML =
        "<span class=\"booking-date__weekday\">" + weekDays[weekday] + "</span>" +
        "<span class=\"booking-date__day\">" + dayNum + "</span>" +
        "<span class=\"booking-date__month\">" + formatMonth(month) + "</span>";

      if (i === 0) btn.classList.add("booking-date--today");

      btn.addEventListener("click", function () {
        selectDate(dateStr);
      });

      fragment.appendChild(btn);
    }

    calendarEl.appendChild(fragment);
  }

  function formatMonth(m) {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return months[m];
  }

  function formatDateForStorage(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function formatDateForDisplay(dateStr) {
    const [y, m, d] = dateStr.split("-");
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return parseInt(d, 10) + " de " + months[parseInt(m, 10) - 1] + " " + y;
  }

  function selectDate(dateStr) {
    selectedDate = dateStr;

    calendarEl.querySelectorAll(".booking-date").forEach(function (btn) {
      const isSelected = btn.getAttribute("data-date") === dateStr;
      btn.classList.toggle("booking-date--selected", isSelected);
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    buildTimeSlots(dateStr);
  }

  // Horarios: 8:00 - 20:00 cada 30 min (Lunes a Lunes)
  function buildTimeSlots(dateStr) {
    timesEl.innerHTML = "";

    const [y, m, d] = dateStr.split("-").map(Number);
    const slotDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = slotDate.getTime() === today.getTime();
    const now = new Date();

    const fragment = document.createDocumentFragment();
    for (let h = HOUR_START; h < HOUR_END; h++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        const slotTime = new Date(y, m - 1, d, h, min, 0, 0);
        const label = pad(h) + ":" + pad(min);

        if (isToday && slotTime <= now) continue;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booking-time";
        btn.setAttribute("data-time", label);
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = label;

        btn.addEventListener("click", function () {
          timesEl.querySelectorAll(".booking-time").forEach(function (b) {
            b.classList.remove("booking-time--selected");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("booking-time--selected");
          btn.setAttribute("aria-pressed", "true");
        });

        fragment.appendChild(btn);
      }
    }

    timesEl.appendChild(fragment);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function getSelectedTime() {
    const btn = timesEl.querySelector(".booking-time--selected");
    return btn ? btn.getAttribute("data-time") : null;
  }

  // Submit: abrir WhatsApp con mensaje preparado
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const service = serviceSelect.value;
    if (!service) {
      serviceSelect.focus();
      return;
    }
    if (!selectedDate) {
      calendarEl.querySelector(".booking-date")?.focus();
      return;
    }
    const time = getSelectedTime();
    if (!time) {
      timesEl.focus();
      return;
    }

    const name = document.getElementById("booking-name").value.trim();
    const phone = document.getElementById("booking-phone").value.trim();
    const email = document.getElementById("booking-email").value.trim();

    if (!name || !phone) {
      document.getElementById("booking-name").reportValidity();
      return;
    }

    let msg = "¡Hola! Me gustaría reservar turno:\n\n";
    msg += "• *Servicio:* " + service + "\n";
    msg += "• *Fecha:* " + formatDateForDisplay(selectedDate) + "\n";
    msg += "• *Horario:* " + time + " hs\n";
    msg += "• *Nombre:* " + name + "\n";
    msg += "• *Teléfono:* " + phone + "\n";
    if (email) msg += "• *Email:* " + email + "\n";

    const encoded = encodeURIComponent(msg);
    const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encoded;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  buildCalendar();
})();
