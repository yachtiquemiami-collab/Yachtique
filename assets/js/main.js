// WhatsApp number in international format, digits only (e.g. 13055551234).
var WHATSAPP_NUMBER = "13058124721";

(function () {
  // Fleet: live from YCN via /api/fleet (see netlify/functions/fleet.mjs)
  var grid = document.getElementById("fleetGrid");
  var select = document.getElementById("yachtSelect");
  var dialog = document.getElementById("yachtDialog");
  var filters = document.getElementById("fleetFilters");
  var finder = document.getElementById("finder");
  var searchBar = document.getElementById("fleetSearch");
  var searchText = document.getElementById("fleetSearchText");
  var formDate = document.querySelector('.form input[name="date"]');
  var formGuests = document.querySelector('.form input[name="guests"]');
  var dateNote = document.getElementById("dateNote");
  var fleet = [];
  // What the visitor is looking for (from the hero finder and the size buttons)
  var want = { date: "", guests: 0, min: 0, max: 999 };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function sized(src, w) { return src + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w; }
  function label(y) { return y.name + " (" + y.feet + "ft " + y.builder + ")"; }
  function shortDur(d) { return d.replace(/ hours?$/, "h"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function niceDate(s) {
    var p = s.split("-");
    return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  function waLink(text) {
    return WHATSAPP_NUMBER ? "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text) : "#contact";
  }
  function cabins(n) { return n + (n === 1 ? " cabin" : " cabins"); }
  function stateOn(y, date) { return date && y.busy ? y.busy[date] || "free" : null; }

  function card(y, i) {
    var photo = y.images[0]
      ? '<img src="' + esc(sized(y.images[0], 900)) + '" alt="' + esc(label(y)) + '" loading="lazy">'
      : '<img src="/assets/img/logo-icon.png" alt="" loading="lazy">';
    var first = y.durations[0];
    var bits = [y.builder + " · " + y.feet + " ft"];
    if (y.guests) bits.push("up to " + y.guests + " guests");
    else if (y.cabins) bits.push(cabins(y.cabins));
    return (
      '<article class="yacht reveal" data-i="' + i + '">' +
        '<button type="button" class="yacht__media js-open" data-i="' + i + '" aria-label="View ' + esc(y.name) + '">' + photo +
          '<span class="yacht__tag">' + esc(y.type) + "</span>" +
          '<span class="yacht__avail" hidden></span>' +
          '<span class="yacht__price"><b>' + money(first.price) + "</b>/ " + esc(shortDur(first.label)) + "</span>" +
        "</button>" +
        '<div class="yacht__body">' +
          "<div><h3>" + esc(y.name) + "</h3>" +
          '<p class="yacht__model">' + esc(bits.join(" · ")) + "</p></div>" +
          '<button type="button" class="yacht__more js-open" data-i="' + i + '" aria-label="Details for ' + esc(y.name) + '">→</button>' +
        "</div>" +
      "</article>"
    );
  }

  // Show, hide, badge and order the cards for the current search
  function applyWant() {
    if (!fleet.length) return;
    var cards = [].slice.call(grid.querySelectorAll(".yacht"));
    var shown = 0, free = 0;
    cards.forEach(function (el) {
      var y = fleet[+el.getAttribute("data-i")];
      var fits = y.feet >= want.min && y.feet <= want.max && !(want.guests && y.guests && y.guests < want.guests);
      el.hidden = !fits;
      var st = stateOn(y, want.date);
      var badge = el.querySelector(".yacht__avail");
      badge.hidden = !st;
      if (st) {
        badge.className = "yacht__avail yacht__avail--" + st;
        badge.textContent = st === "free" ? "Available" : st === "partial" ? "Partly booked" : "Booked";
      }
      el.classList.toggle("is-booked", st === "full");
      el.style.order = st === "full" ? 2 : st === "partial" ? 1 : 0;
      if (fits) { shown++; if (st !== "full") free++; }
    });
    if (filters) {
      filters.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("is-active", +b.getAttribute("data-min") === want.min && +b.getAttribute("data-max") === want.max);
      });
    }
    if (searchBar) {
      var parts = [];
      if (want.date) parts.push(free + " of " + shown + " yachts available on " + niceDate(want.date));
      if (want.guests) parts.push("for " + want.guests + " guests");
      searchBar.hidden = !parts.length;
      searchText.textContent = parts.join(" ");
    }
  }

  function renderFleet() {
    grid.innerHTML = fleet.map(card).join("");
    observe(grid.querySelectorAll(".reveal"));
    if (filters) filters.hidden = false;
    applyWant();
  }

  function fillSelect() {
    if (!select) return;
    fleet.forEach(function (y) {
      var o = document.createElement("option");
      o.textContent = label(y);
      o.setAttribute("data-handle", y.handle);
      select.appendChild(o);
    });
  }

  function fillStats() {
    var set = function (k, v) { var el = document.querySelector('[data-stat="' + k + '"]'); if (el) el.textContent = v; };
    var feet = fleet.map(function (y) { return y.feet; });
    var marinas = {};
    fleet.forEach(function (y) {
      (y.locations || []).forEach(function (l) {
        if (!/private house/i.test(l)) marinas[l.replace(/\s*\(.*\)/, "").replace(/bay ?street/i, "Bay Street").toLowerCase()] = 1;
      });
    });
    set("count", fleet.length);
    set("range", Math.min.apply(null, feet) + "–" + Math.max.apply(null, feet) + " ft");
    set("marinas", Object.keys(marinas).length);
  }

  if (grid) {
    grid.innerHTML = '<p class="fleet__status">Loading the fleet…</p>';
    fetch("/api/fleet")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        fleet = data.yachts || [];
        if (!fleet.length) throw new Error("empty");
        renderFleet();
        fillSelect();
        fillStats();
      })
      .catch(function () {
        grid.innerHTML = '<p class="fleet__status">Our fleet list is being updated. <a href="#contact">Tell us your plans</a> and we\'ll send you the best options for your date.</p>';
      });
  }

  // Hero finder: date, guests, size
  if (finder) {
    var finderDate = document.getElementById("finderDate");
    finderDate.min = ymd(new Date());
    finder.addEventListener("submit", function (e) {
      e.preventDefault();
      var size = document.getElementById("finderSize").value.split("-");
      want.date = finderDate.value;
      want.guests = +document.getElementById("finderGuests").value || 0;
      want.min = +size[0]; want.max = +size[1];
      if (formDate && want.date) formDate.value = want.date;
      if (formGuests && want.guests) formGuests.value = want.guests;
      applyWant();
      document.getElementById("fleet").scrollIntoView({ behavior: "smooth" });
    });
  }
  var clearBtn = document.getElementById("fleetSearchClear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      want = { date: "", guests: 0, min: 0, max: 999 };
      if (finder) finder.reset();
      applyWant();
    });
  }

  // Size buttons above the fleet
  if (filters) {
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-min]");
      if (!b) return;
      want.min = +b.getAttribute("data-min");
      want.max = +b.getAttribute("data-max");
      applyWant();
    });
  }

  // Yacht details
  var current = null, month = null;

  function calendarHtml(y) {
    if (!y.busy) return '<p class="muted ydlg__small">Live availability for this yacht is confirmed on enquiry.</p>';
    var first = new Date(month.getFullYear(), month.getMonth(), 1);
    var days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var today = ymd(new Date());
    var head = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(function (d) { return "<span>" + d + "</span>"; }).join("");
    var cells = "";
    for (var k = 0; k < (first.getDay() + 6) % 7; k++) cells += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var key = ymd(new Date(month.getFullYear(), month.getMonth(), d));
      var state = key < today ? "past" : y.busy[key] || "free";
      cells += '<span class="cal__d cal__d--' + state + (key === want.date ? " is-picked" : "") + '" title="' + key + '">' + d + "</span>";
    }
    var name = month.toLocaleString("en-US", { month: "long", year: "numeric" });
    var now = new Date();
    var atStart = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
    return (
      '<div class="cal">' +
        '<div class="cal__head"><button type="button" class="cal__nav js-month" data-step="-1" aria-label="Previous month"' + (atStart ? " disabled" : "") + ">‹</button>" +
        "<b>" + name + "</b>" +
        '<button type="button" class="cal__nav js-month" data-step="1" aria-label="Next month">›</button></div>' +
        '<div class="cal__grid">' + head + cells + "</div>" +
        '<p class="cal__legend"><i class="cal__d--free"></i>Available <i class="cal__d--partial"></i>Partly booked <i class="cal__d--full"></i>Booked</p>' +
      "</div>"
    );
  }

  function list(arr) { return arr && arr.length ? arr.map(esc).join(" · ") : "—"; }

  function openYacht(i) {
    var y = fleet[i];
    if (!y || !dialog) return;
    current = y;
    if (want.date) { var p = want.date.split("-"); month = new Date(+p[0], p[1] - 1, 1); }
    else { month = new Date(); month.setDate(1); }
    var thumbs = y.images.map(function (src, n) {
      return '<button type="button" class="ydlg__thumb js-thumb' + (n ? "" : " is-active") + '" data-src="' + esc(src) + '"><img src="' + esc(sized(src, 200)) + '" alt="" loading="lazy"></button>';
    }).join("");
    var prices = y.durations.map(function (d) {
      return "<li><span>" + esc(d.label) + "</span><b>" + money(d.price) + "</b></li>";
    }).join("");
    var waText = "Hi Yachtique, I'm interested in " + label(y) + (want.date ? " on " + niceDate(want.date) : "") + (want.guests ? " for " + want.guests + " guests" : "") + ".";
    dialog.querySelector(".ydlg__body").innerHTML =
      '<div class="ydlg__gallery">' +
        '<img class="ydlg__main" src="' + esc(sized(y.images[0] || "", 1400)) + '" alt="' + esc(label(y)) + '">' +
        '<div class="ydlg__thumbs">' + thumbs + "</div>" +
      "</div>" +
      '<div class="ydlg__info">' +
        '<p class="eyebrow">' + esc(y.type) + "</p>" +
        "<h3>" + esc(y.name) + "</h3>" +
        '<p class="yacht__model">' + esc(y.builder) + " · " + y.feet + " ft" + (y.guests ? " · up to " + y.guests + " guests" : "") + (y.cabins ? " · " + cabins(y.cabins) : "") + "</p>" +
        (y.summary ? '<p class="ydlg__summary">' + esc(y.summary) + "</p>" : "") +
        '<h4>Rates</h4><ul class="ydlg__prices">' + prices + "</ul>" +
        '<p class="muted ydlg__small">Starting rates. Sales tax' + (y.gratuityIncluded ? "" : " and crew gratuity") + " may apply. Your final quote is confirmed on enquiry.</p>" +
        '<dl class="ydlg__meta">' +
          "<dt>Departs from</dt><dd>" + list(y.locations) + "</dd>" +
          "<dt>Crew</dt><dd>" + list(y.crew) + "</dd>" +
          "<dt>Toys</dt><dd>" + list(y.toys) + "</dd>" +
        "</dl>" +
        "<h4>Availability</h4><div class=\"ydlg__cal\">" + calendarHtml(y) + "</div>" +
        '<div class="ydlg__ctas">' +
          '<a href="#contact" class="btn btn--gold btn--block js-enquire">Enquire about ' + esc(y.name) + "</a>" +
          (WHATSAPP_NUMBER ? '<a href="' + esc(waLink(waText)) + '" class="btn btn--wa btn--block" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Ask on WhatsApp</a>' : "") +
        "</div>" +
      "</div>";
    dialog.showModal();
    dialog.querySelector(".ydlg__body").scrollTop = 0;
  }

  if (dialog) {
    document.addEventListener("click", function (e) {
      var open = e.target.closest(".js-open");
      if (open) { openYacht(+open.getAttribute("data-i")); return; }
      if (!dialog.open) return;
      var thumb = e.target.closest(".js-thumb");
      if (thumb) {
        dialog.querySelector(".ydlg__main").src = sized(thumb.getAttribute("data-src"), 1400);
        dialog.querySelectorAll(".js-thumb").forEach(function (t) { t.classList.toggle("is-active", t === thumb); });
      }
      var nav = e.target.closest(".js-month");
      if (nav) {
        month.setMonth(month.getMonth() + +nav.getAttribute("data-step"));
        dialog.querySelector(".ydlg__cal").innerHTML = calendarHtml(current);
      }
      if (e.target.closest(".js-enquire")) {
        if (select) select.value = label(current);
        checkDate();
        dialog.close();
      }
      if (e.target.closest(".js-close") || e.target === dialog) dialog.close();
    });
  }

  // Warn in the form when the chosen yacht is booked on the chosen date
  function checkDate() {
    if (!dateNote || !select || !formDate) return;
    var opt = select.options[select.selectedIndex];
    var handle = opt && opt.getAttribute("data-handle");
    var y = fleet.filter(function (x) { return x.handle === handle; })[0];
    var state = y && y.busy && formDate.value ? y.busy[formDate.value] : null;
    dateNote.textContent = state === "full"
      ? y.name + " is booked on this date. Send your enquiry anyway and we'll suggest similar yachts."
      : state === "partial"
        ? y.name + " has another charter that day. Some hours may still be free."
        : "";
    dateNote.hidden = !dateNote.textContent;
  }
  if (select) select.addEventListener("change", checkDate);
  if (formDate) formDate.addEventListener("change", checkDate);

  // WhatsApp links
  document.querySelectorAll(".js-wa").forEach(function (a) {
    if (WHATSAPP_NUMBER) {
      a.href = waLink("Hi Yachtique, I'd like to plan a charter.");
    } else {
      a.href = "#contact";
      a.removeAttribute("target");
    }
  });

  // Nav: background on scroll + mobile menu
  var nav = document.querySelector(".nav");
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
  }

  // Reveal on scroll (also used for fleet cards added after loading)
  var io = "IntersectionObserver" in window && new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  function observe(items) {
    items.forEach(function (el) { io ? io.observe(el) : el.classList.add("is-visible"); });
  }
  observe(document.querySelectorAll(".reveal"));

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
