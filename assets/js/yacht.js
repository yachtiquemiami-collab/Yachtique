// Yacht page (/yachts/:handle): photo viewer, availability calendars, booked-date warning, mobile menu.
(function () {
  var dataEl = document.getElementById("yachtData");
  var y = dataEl ? JSON.parse(dataEl.textContent) : { images: [], busy: null };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  var T = function (k, en, v) { return window.yq ? yq.t(k, en, v) : en; };
  var loc = function () { return window.yq ? yq.locale() : "en-US"; };
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
    // Back on a phone closes the photos instead of leaving the page
    if (!history.state || !history.state.yqLight) history.pushState({ yqLight: 1 }, "");
  }
  function closeLight(fromBack) {
    if (light.hidden) return;
    light.hidden = true;
    document.body.style.overflow = "";
    if (!fromBack && history.state && history.state.yqLight) history.back();
  }
  window.addEventListener("popstate", function () { if (light) closeLight(true); });
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
    var cells = "";
    for (var w = 0; w < 7; w++) cells += "<span>" + new Date(2024, 0, 1 + w).toLocaleDateString(loc(), { weekday: "short" }).replace(".", "").slice(0, 2) + "</span>";
    for (var k = 0; k < (first.getDay() + 6) % 7; k++) cells += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var key = ymd(new Date(m.getFullYear(), m.getMonth(), d));
      var st = key < today ? "past" : (y.busy && y.busy[key]) || "free";
      var hrs = st === "partial" && y.busyHours && y.busyHours[key] && window.yq && yq.bookedTimes ? ' title="' + T("y.bookedAt", "Booked {t}", { t: yq.bookedTimes(y.busyHours[key]) }) + '"' : "";
      cells += '<button type="button" class="cal__d cal__d--' + st + (key === picked ? " is-picked" : "") + '" data-day="' + key + '"' + hrs + (st === "past" ? " disabled" : "") + ">" + d + "</button>";
    }
    return '<div class="cal"><div class="cal__head"><b>' + m.toLocaleString(loc(), { month: "long", year: "numeric" }) + '</b></div><div class="cal__grid">' + cells + "</div></div>";
  }
  function drawCals() {
    if (!cals) return;
    var now = new Date(); now.setDate(1);
    var second = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    cals.innerHTML =
      '<div class="ycals__bar">' +
        '<button type="button" class="cal__nav js-cprev" aria-label="' + T("cal.prev", "Previous month") + '"' + (start <= now ? " disabled" : "") + ">‹</button>" +
        '<span class="muted">' + T("y.tap", "Tap a free day to choose it") + "</span>" +
        '<button type="button" class="cal__nav js-cnext" aria-label="' + T("cal.next", "Next month") + '">›</button>' +
      "</div>" +
      '<div class="ycals__pair">' + month(start) + month(second) + "</div>" +
      '<p class="cal__legend"><i class="cal__d--free"></i>' + T("cal.free", "Available") + ' <i class="cal__d--partial"></i>' + T("cal.partial", "Partly booked") + ' <i class="cal__d--full"></i>' + T("cal.full", "Booked") + "</p>";
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
        if (window.yq && yq.trip) yq.trip.set({ date: picked });
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
      ? T("y.booked", "{y} is booked on this date. Send your request anyway and we'll suggest similar yachts.", { y: y.name })
      : st === "partial" ? partialText(dateInput.value) : "";
    note.hidden = !note.textContent;
    markStartTimes();
    if (picked !== dateInput.value) { picked = dateInput.value; drawCals(); }
  }
  // "Caprice is booked from 1:00 pm to 5:00 pm that day", when the calendar says when
  function partialText(day) {
    var hrs = y.busyHours && y.busyHours[day];
    return hrs && hrs.length && window.yq && yq.bookedTimes
      ? T("y.partialAt", "{y} is booked {t} that day. Other hours may still be free.", { y: y.name, t: yq.bookedTimes(hrs) })
      : T("y.partial", "{y} has another charter that day. Some hours may still be free.", { y: y.name });
  }
  // Start times that would overlap the other charter that day are greyed out
  function markStartTimes() {
    var sel = document.querySelector('.ybook__form [name="start"]');
    if (!sel || !dateInput) return;
    var hrs = (y.busyHours && y.busyHours[dateInput.value]) || [];
    var c = document.querySelector('.ybook__form [name="duration"]:checked');
    var len = (parseInt(c && c.value, 10) || 4) * 60;
    [].forEach.call(sel.options, function (o) {
      if (!o._yqText) o._yqText = o.textContent;
      var m = /^(\d+):(\d+) (am|pm)$/.exec(o.value), start = m ? (+m[1] % 12 + (m[3] === "pm" ? 12 : 0)) * 60 + +m[2] : null;
      var clash = start != null && hrs.some(function (r) { return start < (r[1] != null ? r[1] : 24 * 60) && start + len > r[0]; });
      o.disabled = clash;
      o.textContent = o._yqText + (clash ? " · " + T("form.taken", "booked") : "");
    });
    if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) sel.value = "";
  }
  if (dateInput) {
    dateInput.min = ymd(new Date());
    dateInput._yqBusy = y.busy; // booked days show in the date picker too
    dateInput.addEventListener("change", checkDate);
  }

  // Departure: each marina shows its price for the chosen duration, and the card's price follows the choice
  var form = document.querySelector(".ybook__form");
  var depSel = document.getElementById("ybDeparture");
  var fromB = document.querySelector(".ybook__from b");
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function chosenDur() { var c = form && form.querySelector('[name="duration"]:checked'); return c ? c.value : ""; }
  function showPrices() {
    if (!depSel) return;
    var dur = chosenDur();
    // Each duration card shows its price from the chosen marina
    var here = (y.departures[depSel.selectedIndex] || {}).prices || {};
    [].forEach.call(form.querySelectorAll("[data-dur-price]"), function (b) {
      var p = here[b.getAttribute("data-dur-price")];
      if (p) b.textContent = money(p);
    });
    [].forEach.call(depSel.options, function (o, i) {
      var p = (y.departures[i] || {}).prices || {};
      o.textContent = o.value + (p[dur] ? " \u00b7 " + money(p[dur]) : "");
    });
    var pick = (y.departures[depSel.selectedIndex] || {}).prices || {};
    var fromDur = document.querySelector("[data-from-dur]");
    if (fromB && pick[dur]) {
      fromB.textContent = money(pick[dur]);
      if (fromDur) fromDur.textContent = window.yq ? yq.dur(dur.replace(/ hours?$/, "h")) : dur.replace(/ hours?$/, "h");
    }
  }
  if (depSel && form) {
    depSel.addEventListener("change", showPrices);
    form.addEventListener("change", function (e) { if (e.target.name === "duration") { showPrices(); markStartTimes(); } });
    showPrices();
  }

  // Arriving from a proposal's Choose button (?proposal=id&departure=…, with the date, guests and duration):
  // the marina and the proposal are filled in, so the client only adds their name, phone and email
  var qs = new URLSearchParams(location.search);
  var fromProposal = (qs.get("proposal") || "").replace(/[^a-z0-9-]/gi, "");
  if (form && fromProposal) {
    var dep = qs.get("departure");
    if (depSel && dep) [].forEach.call(depSel.options, function (o, i) { if (o.value === dep) depSel.selectedIndex = i; });
    var dur = qs.get("duration");
    var durIn = dur && [].filter.call(form.querySelectorAll('[name="duration"]'), function (r) { return r.value === dur; })[0];
    if (durIn) durIn.checked = true;
    var msg = form.querySelector('[name="message"]');
    if (msg && !msg.value) msg.value = T("y.fromprop", "From my proposal: yachtique.co/p/{id}", { id: fromProposal }) + (qs.get("off") ? " (" + qs.get("off") + " off)" : "") + ". ";
    showPrices();
    if (dateInput) checkDate();
  }

  // Phone bar "Request" button
  document.querySelectorAll(".js-tobook").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("book").scrollIntoView({ behavior: "smooth" });
    });
  });


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
  // Redraw the calendars and the booked-date note when the language changes
  if (window.yq) yq.onLang(function () { drawCals(); if (dateInput) checkDate(); });
})();
