// WhatsApp number in international format, digits only (e.g. 13055551234).
var WHATSAPP_NUMBER = "13058124721";

// Guest reviews shown on the home page. Only add real reviews, with the guest's permission.
// The section stays hidden while this list is empty. Example:
//   { quote: "Best day of our trip...", name: "Sarah M.", occasion: "Birthday, 70ft Azimut" },
var REVIEWS = [];

(function () {
  // Language helpers from /assets/js/core.js (English when core.js is missing)
  var yq = window.yq || { t: function (k, en) { return en; }, type: function (x) { return x; }, dur: function (x) { return x; },
    lang: function () { return "en"; }, locale: function () { return "en-US"; }, onLang: function () {}, track: function () {} };
  var t = yq.t;
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
  // Home page shows the featured yachts until the visitor asks for more
  var showAll = false;
  var moreWrap = document.getElementById("fleetMore");
  var moreBtn = document.getElementById("fleetMoreBtn");

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
    return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(yq.locale(), { weekday: "short", month: "short", day: "numeric" });
  }
  function waLink(text) {
    return WHATSAPP_NUMBER ? "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text) : "#contact";
  }
  function cabins(n) { return n + " " + (n === 1 ? t("card.cabin", "cabin") : t("card.cabins", "cabins")); }
  // Two-letter weekday names, Monday first, in the visitor's language
  function weekdays() {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(new Date(2024, 0, 1 + i).toLocaleDateString(yq.locale(), { weekday: "short" }).replace(".", "").slice(0, 2));
    return out;
  }
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
  function stateOn(y, date) { return date && y.busy ? y.busy[date] || "free" : null; }

  function card(y, i) {
    var photo = y.images[0]
      ? '<img src="' + esc(sized(y.images[0], 900)) + '" alt="' + esc(label(y)) + '" loading="lazy">'
      : '<img src="/assets/img/logo-icon.png" alt="" loading="lazy">';
    var first = y.durations[0];
    var bits = [yq.type(y.type), y.builder, y.feet + " ft"];
    if (y.guests) bits.push(y.guests + " " + t("card.guests", "guests"));
    else if (y.cabins) bits.push(cabins(y.cabins));
    return (
      '<article class="yacht reveal" data-i="' + i + '">' +
        '<div class="yacht__mediawrap">' +
          '<button type="button" class="yacht__media js-open" data-i="' + i + '" aria-label="' + esc(t("card.quick", "Quick view of") + " " + y.name) + '">' + photo + "</button>" +
          '<button type="button" class="save" data-save="' + esc(y.handle) + '" aria-pressed="false" aria-label="' + esc(t("save.add", "Save to shortlist")) + '">' + HEART + "</button>" +
        "</div>" +
        '<div class="yacht__body">' +
          '<div class="yacht__row"><h3><a href="/yachts/' + esc(y.handle) + '">' + esc(y.name) + "</a></h3>" +
          '<span class="yacht__price">' + t("card.from", "from") + " <b>" + money(first.price) + "</b> / " + esc(shortDur(first.label)) + "</span></div>" +
          '<p class="yacht__model">' + esc(bits.join(" · ")) + "</p>" +
          '<div class="yacht__row yacht__row--foot"><span class="yacht__avail" hidden></span>' +
          '<a class="yacht__link" href="/yachts/' + esc(y.handle) + '">' + t("btn.viewyacht", "View yacht") + ' <span aria-hidden="true">→</span></a></div>' +
        "</div>" +
      "</article>"
    );
  }

  // Show, hide, badge and order the cards for the current search
  function applyWant() {
    if (!fleet.length) return;
    var cards = [].slice.call(grid.querySelectorAll(".yacht"));
    var shown = 0, free = 0;
    var searching = want.date || want.guests || want.min !== 0 || want.max !== 999;
    var hasFeatured = fleet.some(function (y) { return y.featured >= 0; });
    var collapsed = !showAll && !searching;
    cards.forEach(function (el, n) {
      var y = fleet[+el.getAttribute("data-i")];
      var rank = hasFeatured ? y.featured : (n < 6 ? n : -1);
      var fits = y.feet >= want.min && y.feet <= want.max && !(want.guests && y.guests && y.guests < want.guests);
      el.hidden = !fits || (collapsed && rank < 0);
      var st = stateOn(y, want.date);
      var badge = el.querySelector(".yacht__avail");
      badge.hidden = !st;
      if (st) {
        badge.className = "yacht__avail yacht__avail--" + st;
        badge.textContent = st === "free" ? t("cal.free", "Available") : st === "partial" ? t("cal.partial", "Partly booked") : t("cal.full", "Booked");
      }
      el.classList.toggle("is-booked", st === "full");
      el.style.order = collapsed ? rank : st === "full" ? 2 : st === "partial" ? 1 : 0;
      if (fits) { shown++; if (st !== "full") free++; }
    });
    if (moreWrap) {
      moreWrap.hidden = !collapsed;
      if (moreBtn) moreBtn.textContent = t("m.viewall", "View all {n} yachts", { n: fleet.length });
    }
    if (filters) {
      filters.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("is-active", +b.getAttribute("data-min") === want.min && +b.getAttribute("data-max") === want.max);
      });
    }
    if (searchBar) {
      var parts = [];
      if (want.date) parts.push(t("m.avail", "{free} of {shown} yachts available on {date}", { free: free, shown: shown, date: niceDate(want.date) }));
      if (want.guests) parts.push(t("m.for", "for {g} guests", { g: want.guests }));
      searchBar.hidden = !parts.length;
      searchText.textContent = parts.join(" ");
    }
  }

  function renderFleet() {
    grid.innerHTML = fleet.map(card).join("");
    observe(grid.querySelectorAll(".reveal"));
    if (yq.shortlist) yq.shortlist.sync();
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
    grid.innerHTML = '<p class="fleet__status">' + t("m.loading", "Loading the fleet…") + "</p>";
    fetch("/api/fleet")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        fleet = data.yachts || [];
        if (!fleet.length) throw new Error("empty");
        renderFleet();
        fillSelect();
        fillStats();
        prefillShortlist();
      })
      .catch(function () {
        grid.innerHTML = '<p class="fleet__status">' + t("m.error", 'Our fleet list is being updated. <a href="#contact">Tell us your plans</a> and we\'ll send you the best options for your date.') + "</p>";
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
      if (formDate && want.date) { formDate.value = want.date; formDate.dispatchEvent(new Event("input")); }
      if (formGuests && want.guests) formGuests.value = want.guests;
      yq.track("search", { v: [want.date || "any date", want.guests ? want.guests + " guests" : "", size.join("-") === "0-999" ? "" : size.join("-") + " ft"].filter(Boolean).join(" · ") });
      applyWant();
      document.getElementById("fleet").scrollIntoView({ behavior: "smooth" });
    });
  }
  var clearBtn = document.getElementById("fleetSearchClear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      want = { date: "", guests: 0, min: 0, max: 999 };
      if (finder) { finder.reset(); var fd = document.getElementById("finderDate"); if (fd) { fd.value = ""; fd.dispatchEvent(new Event("input")); } }
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
      showAll = true;
      applyWant();
    });
  }
  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      showAll = true;
      applyWant();
    });
  }

  // Yacht details
  var current = null, currentIndex = -1, month = null;

  function calendarHtml(y) {
    if (!y.busy) return '<p class="muted ydlg__small">' + t("y.noavail", "Live availability for this yacht is confirmed on enquiry.") + "</p>";
    var first = new Date(month.getFullYear(), month.getMonth(), 1);
    var days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var today = ymd(new Date());
    var head = weekdays().map(function (d) { return "<span>" + d + "</span>"; }).join("");
    var cells = "";
    for (var k = 0; k < (first.getDay() + 6) % 7; k++) cells += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var key = ymd(new Date(month.getFullYear(), month.getMonth(), d));
      var state = key < today ? "past" : y.busy[key] || "free";
      cells += '<span class="cal__d cal__d--' + state + (key === want.date ? " is-picked" : "") + '" title="' + key + '">' + d + "</span>";
    }
    var name = month.toLocaleString(yq.locale(), { month: "long", year: "numeric" });
    var now = new Date();
    var atStart = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
    return (
      '<div class="cal">' +
        '<div class="cal__head"><button type="button" class="cal__nav js-month" data-step="-1" aria-label="' + t("cal.prev", "Previous month") + '"' + (atStart ? " disabled" : "") + ">‹</button>" +
        "<b>" + name + "</b>" +
        '<button type="button" class="cal__nav js-month" data-step="1" aria-label="' + t("cal.next", "Next month") + '">›</button></div>' +
        '<div class="cal__grid">' + head + cells + "</div>" +
        '<p class="cal__legend"><i class="cal__d--free"></i>' + t("cal.free", "Available") + ' <i class="cal__d--partial"></i>' + t("cal.partial", "Partly booked") + ' <i class="cal__d--full"></i>' + t("cal.full", "Booked") + "</p>" +
      "</div>"
    );
  }

  function list(arr) { return arr && arr.length ? arr.map(esc).join(" · ") : "—"; }

  function openYacht(i) {
    var y = fleet[i];
    if (!y || !dialog) return;
    current = y;
    currentIndex = i;
    yq.track("yacht_quickview", { y: y.handle });
    if (want.date) { var p = want.date.split("-"); month = new Date(+p[0], p[1] - 1, 1); }
    else { month = new Date(); month.setDate(1); }
    var thumbs = y.images.map(function (src, n) {
      return '<button type="button" class="ydlg__thumb js-thumb' + (n ? "" : " is-active") + '" data-src="' + esc(src) + '"><img src="' + esc(sized(src, 200)) + '" alt="" loading="lazy"></button>';
    }).join("");
    var prices = y.durations.map(function (d) {
      return "<li><span>" + esc(yq.dur(d.label)) + "</span><b>" + money(d.price) + "</b></li>";
    }).join("");
    var waText = t("m.wa.yacht", "Hi Yachtique, I'm interested in {y}", { y: label(y) }) +
      (want.date ? t("m.on", " on {d}", { d: niceDate(want.date) }) : "") + (want.guests ? t("m.forg", " for {g} guests", { g: want.guests }) : "") + ".";
    dialog.querySelector(".ydlg__body").innerHTML =
      '<div class="ydlg__gallery">' +
        '<img class="ydlg__main" src="' + esc(sized(y.images[0] || "", 1400)) + '" alt="' + esc(label(y)) + '">' +
        '<div class="ydlg__thumbs">' + thumbs + "</div>" +
      "</div>" +
      '<div class="ydlg__info">' +
        '<p class="eyebrow">' + esc(yq.type(y.type)) + "</p>" +
        "<h3>" + esc(y.name) + "</h3>" +
        '<ul class="yfacts yfacts--sm">' +
          "<li><b>" + y.feet + " ft</b><span>" + t("f.length", "Length") + "</span></li>" +
          (y.guests ? "<li><b>" + y.guests + "</b><span>" + t("f.guests", "Guests") + "</span></li>" : "") +
          (y.cabins ? "<li><b>" + esc(y.cabins) + "</b><span>" + t("f.cabins", "Cabins") + "</span></li>" : "") +
          "<li><b>" + esc(y.builder) + "</b><span>" + t("f.builder", "Builder") + "</span></li>" +
        "</ul>" +
        (y.summary ? '<p class="ydlg__summary">' + esc(y.summary) + "</p>" : "") +
        "<h4>" + t("y.rates", "Rates") + '</h4><ul class="ydlg__prices">' + prices + "</ul>" +
        '<p class="muted ydlg__small">' + (y.gratuityIncluded
          ? t("y.popnote.tip", "Starting rates. Sales tax may apply. Your final quote is confirmed on enquiry.")
          : t("y.popnote", "Starting rates. Sales tax and crew gratuity may apply. Your final quote is confirmed on enquiry.")) + "</p>" +
        '<dl class="ydlg__meta">' +
          "<dt>" + t("y.departs", "Departs from") + "</dt><dd>" + list(y.locations) + "</dd>" +
          "<dt>" + t("f.crew", "Crew") + "</dt><dd>" + list(y.crew) + "</dd>" +
          "<dt>" + t("y.toys", "Toys") + "</dt><dd>" + list(y.toys) + "</dd>" +
        "</dl>" +
        "<h4>" + t("y.availability", "Availability") + '</h4><div class="ydlg__cal">' + calendarHtml(y) + "</div>" +
        '<div class="ydlg__ctas">' +
          '<button type="button" class="btn btn--ghost btn--block save save--btn" data-save="' + esc(y.handle) + '" aria-pressed="false">' + HEART + '<span class="save__txt">' + t("save.cta", "Save") + "</span></button>" +
          '<a href="/yachts/' + esc(y.handle) + '" class="btn btn--ghost btn--block">' + t("y.full", "View full details") + "</a>" +
          '<a href="#contact" class="btn btn--gold btn--block js-enquire">' + t("y.enquire", "Enquire about") + " " + esc(y.name) + "</a>" +
          (WHATSAPP_NUMBER ? '<a href="' + esc(waLink(waText)) + '" data-yacht="' + esc(y.handle) + '" class="btn btn--wa btn--block" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>' + t("wa.ask", "Ask on WhatsApp") + "</a>" : "") +
        "</div>" +
      "</div>";
    if (yq.shortlist) yq.shortlist.sync();
    if (!dialog.open) dialog.showModal();
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
      ? t("y.booked", "{y} is booked on this date. Send your enquiry anyway and we'll suggest similar yachts.", { y: y.name })
      : state === "partial"
        ? t("y.partial", "{y} has another charter that day. Some hours may still be free.", { y: y.name })
        : "";
    dateNote.hidden = !dateNote.textContent;
  }
  if (select) select.addEventListener("change", checkDate);
  if (formDate) formDate.addEventListener("change", checkDate);

  // WhatsApp links (message in the visitor's language)
  function waLinks() {
    document.querySelectorAll(".js-wa").forEach(function (a) {
      if (WHATSAPP_NUMBER) {
        a.href = waLink(t("m.wa", "Hi Yachtique, I'd like to plan a charter."));
      } else {
        a.href = "#contact";
        a.removeAttribute("target");
      }
    });
  }
  waLinks();

  // Arriving from an occasion page (?occasion=birthday) or a shortlist (?shortlist=a,b): start the message for them
  var params = new URLSearchParams(location.search);
  var message = document.querySelector('.form textarea[name="message"]');
  var OCC = {
    "sunset-cruise": ["Sunset cruise", "Crucero al atardecer"], "birthday": ["Birthday", "Cumpleaños"],
    "bachelorette-bachelor": ["Bachelorette / bachelor party", "Despedida de soltera / soltero"], "sandbar-day": ["Sandbar day", "Día en el banco de arena"],
    "corporate": ["Corporate / VIP", "Corporativo / VIP"], "proposal": ["Proposal", "Propuesta de matrimonio"],
  };
  var occ = OCC[params.get("occasion")];
  if (occ && message && !message.value) message.value = t("m.occasion", "Occasion") + ": " + occ[yq.lang() === "es" ? 1 : 0] + ". ";
  function prefillShortlist() {
    var hs = (params.get("shortlist") || "").split(",").filter(Boolean);
    if (!hs.length || !message || message.value) return;
    var names = hs.map(function (h) { var y = fleet.filter(function (x) { return x.handle === h; })[0]; return y ? label(y) : null; }).filter(Boolean);
    if (names.length) message.value = t("m.shortlist", "My shortlist") + ": " + names.join(", ") + ". ";
  }

  // Language switch: redraw everything this script wrote
  yq.onLang(function () {
    if (fleet.length) { renderFleet(); }
    waLinks();
    if (dialog && dialog.open && currentIndex > -1) openYacht(currentIndex);
    checkDate();
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

  // Reviews
  var reviews = document.getElementById("reviews");
  if (reviews && REVIEWS.length) {
    document.getElementById("reviewsGrid").innerHTML = REVIEWS.map(function (r) {
      return '<figure class="review reveal"><blockquote>“' + esc(r.quote) + '”</blockquote>' +
        '<figcaption><b>' + esc(r.name) + "</b>" + (r.occasion ? "<span>" + esc(r.occasion) + "</span>" : "") + "</figcaption></figure>";
    }).join("");
    reviews.hidden = false;
    observe(reviews.querySelectorAll(".reveal"));
  }


  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
