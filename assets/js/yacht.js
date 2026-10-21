// Yacht page (/yachts/:handle): photo viewer, availability calendars, booked-date warning, mobile menu.
(function () {
  var dataEl = document.getElementById("yachtData");
  var y = dataEl ? JSON.parse(dataEl.textContent) : { images: [], busy: null };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function sized(src, w) { return src + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w; }

  // Photo viewer
  var light = document.getElementById("ylight");
  var lightImg = document.getElementById("ylightImg");
  var lightCount = document.getElementById("ylightCount");
  var at = 0;
  function show(i) {
    at = (i + y.images.length) % y.images.length;
    lightImg.src = sized(y.images[at], 1800);
    lightCount.textContent = (at + 1) + " / " + y.images.length;
  }
  function openLight(i) {
    if (!light || !y.images.length) return;
    show(i);
    light.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLight() {
    light.hidden = true;
    document.body.style.overflow = "";
  }
  document.addEventListener("click", function (e) {
    var p = e.target.closest(".js-photo");
    if (p) { openLight(+p.getAttribute("data-i")); return; }
    if (!light) return;
    if (e.target.closest(".js-lclose") || e.target === light) closeLight();
    if (e.target.closest(".js-lprev")) show(at - 1);
    if (e.target.closest(".js-lnext")) show(at + 1);
  });
  document.addEventListener("keydown", function (e) {
    if (!light || light.hidden) return;
    if (e.key === "Escape") closeLight();
    if (e.key === "ArrowLeft") show(at - 1);
    if (e.key === "ArrowRight") show(at + 1);
  });
  // Swipe on phones
  var x0 = null;
  if (light) light.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  if (light) light.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // Availability: two months side by side
  var cals = document.getElementById("yachtCals");
  var start = new Date(); start.setDate(1);
  var picked = "";
  function month(m) {
    var first = new Date(m.getFullYear(), m.getMonth(), 1);
    var days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    var today = ymd(new Date());
    var cells = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(function (d) { return "<span>" + d + "</span>"; }).join("");
    for (var k = 0; k < (first.getDay() + 6) % 7; k++) cells += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var key = ymd(new Date(m.getFullYear(), m.getMonth(), d));
      var st = key < today ? "past" : (y.busy && y.busy[key]) || "free";
      cells += '<button type="button" class="cal__d cal__d--' + st + (key === picked ? " is-picked" : "") + '" data-day="' + key + '"' + (st === "past" ? " disabled" : "") + ">" + d + "</button>";
    }
    return '<div class="cal"><div class="cal__head"><b>' + m.toLocaleString("en-US", { month: "long", year: "numeric" }) + '</b></div><div class="cal__grid">' + cells + "</div></div>";
  }
  function drawCals() {
    if (!cals) return;
    var now = new Date(); now.setDate(1);
    var second = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    cals.innerHTML =
      '<div class="ycals__bar">' +
        '<button type="button" class="cal__nav js-cprev" aria-label="Previous months"' + (start <= now ? " disabled" : "") + ">‹</button>" +
        '<span class="muted">Tap a free day to choose it</span>' +
        '<button type="button" class="cal__nav js-cnext" aria-label="Next months">›</button>' +
      "</div>" +
      '<div class="ycals__pair">' + month(start) + month(second) + "</div>" +
      '<p class="cal__legend"><i class="cal__d--free"></i>Available <i class="cal__d--partial"></i>Partly booked <i class="cal__d--full"></i>Booked</p>';
  }
  if (cals) {
    drawCals();
    cals.addEventListener("click", function (e) {
      if (e.target.closest(".js-cprev")) { start.setMonth(start.getMonth() - 1); drawCals(); }
      if (e.target.closest(".js-cnext")) { start.setMonth(start.getMonth() + 1); drawCals(); }
      var day = e.target.closest("[data-day]");
      if (day && !day.disabled) {
        picked = day.getAttribute("data-day");
        if (dateInput) { dateInput.value = picked; dateInput.dispatchEvent(new Event("input")); checkDate(); }
        drawCals();
        if (window.innerWidth < 1000) document.getElementById("book").scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Booked-date warning in the enquiry card
  var dateInput = document.getElementById("ybDate");
  var note = document.getElementById("ybNote");
  function checkDate() {
    if (!note) return;
    var st = y.busy && dateInput.value ? y.busy[dateInput.value] : null;
    note.textContent = st === "full"
      ? y.name + " is booked on this date. Send your request anyway and we'll suggest similar yachts."
      : st === "partial" ? y.name + " has another charter that day. Some hours may still be free." : "";
    note.hidden = !note.textContent;
    if (picked !== dateInput.value) { picked = dateInput.value; drawCals(); }
  }
  if (dateInput) {
    dateInput.min = ymd(new Date());
    dateInput.addEventListener("change", checkDate);
  }

  // Phone bar "Request" button
  document.querySelectorAll(".js-tobook").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("book").scrollIntoView({ behavior: "smooth" });
    });
  });

  // Date fields: show "Pick a date" while empty (phones show a blank box otherwise)
  function datePlaceholders() {
    document.querySelectorAll('input[type="date"]').forEach(function (inp) {
      if (inp.parentNode.classList && inp.parentNode.classList.contains("datewrap")) return;
      var wrap = document.createElement("span");
      wrap.className = "datewrap";
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
      var ph = document.createElement("span");
      ph.className = "datewrap__ph";
      ph.setAttribute("aria-hidden", "true");
      ph.textContent = "Pick a date";
      wrap.appendChild(ph);
      function sync() { wrap.classList.toggle("has-value", !!inp.value); }
      inp.addEventListener("input", sync);
      inp.addEventListener("change", sync);
      sync();
    });
  }
  datePlaceholders();

  // Mobile menu
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
  }
})();
