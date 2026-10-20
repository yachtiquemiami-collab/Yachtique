// WhatsApp number in international format, digits only (e.g. 13055551234).
// Leave empty until Nektarios confirms it; the links then fall back to the contact form.
var WHATSAPP_NUMBER = "";

(function () {
  // Fleet: live from YCN via /api/fleet (see netlify/functions/fleet.mjs)
  var grid = document.getElementById("fleetGrid");
  var select = document.getElementById("yachtSelect");
  var dialog = document.getElementById("yachtDialog");
  var filters = document.getElementById("fleetFilters");
  var dateInput = document.querySelector('.form input[name="date"]');
  var dateNote = document.getElementById("dateNote");
  var fleet = [];

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

  function card(y, i) {
    var photo = y.images[0]
      ? '<img src="' + esc(sized(y.images[0], 800)) + '" alt="' + esc(label(y)) + '" loading="lazy">'
      : '<img src="/assets/img/logo-icon.png" alt="" loading="lazy">';
    var people = y.guests ? { v: y.guests, l: "Guests" } : { v: y.cabins || "—", l: "Cabins" };
    var first = y.durations[0];
    return (
      '<article class="yacht reveal" data-feet="' + y.feet + '">' +
        '<button type="button" class="yacht__media js-open" data-i="' + i + '" aria-label="View ' + esc(y.name) + '">' + photo +
          '<span class="yacht__tag">' + esc(y.type) + "</span></button>" +
        '<div class="yacht__body">' +
          "<h3>" + esc(y.name) + "</h3>" +
          '<p class="yacht__model">' + esc(y.builder) + " · " + y.feet + " ft</p>" +
          '<ul class="yacht__specs">' +
            "<li><b>" + y.feet + "</b>Feet</li>" +
            "<li><b>" + esc(people.v) + "</b>" + people.l + "</li>" +
            "<li><b>" + ((y.crew && y.crew.length) || "—") + "</b>Crew</li>" +
          "</ul>" +
          '<div class="yacht__foot">' +
            '<span class="yacht__price">From <b>' + money(first.price) + "</b> / " + esc(shortDur(first.label)) + "</span>" +
            '<button type="button" class="btn btn--ghost btn--sm js-open" data-i="' + i + '">Details</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderFleet() {
    grid.innerHTML = fleet.map(card).join("");
    observe(grid.querySelectorAll(".reveal"));
    if (filters) filters.hidden = false;
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

  if (grid) {
    grid.innerHTML = '<p class="fleet__status">Loading the fleet…</p>';
    fetch("/api/fleet")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        fleet = data.yachts || [];
        if (!fleet.length) throw new Error("empty");
        renderFleet();
        fillSelect();
      })
      .catch(function () {
        grid.innerHTML = '<p class="fleet__status">Our fleet list is being updated. <a href="#contact">Tell us your plans</a> and we\'ll send you the best options for your date.</p>';
      });
  }

  // Size filter
  if (filters) {
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-min]");
      if (!b) return;
      filters.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      var min = +b.getAttribute("data-min"), max = +b.getAttribute("data-max");
      grid.querySelectorAll(".yacht").forEach(function (el) {
        var f = +el.getAttribute("data-feet");
        el.hidden = f < min || f > max;
      });
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
      cells += '<span class="cal__d cal__d--' + state + '" title="' + key + '">' + d + "</span>";
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
    month = new Date(); month.setDate(1);
    var thumbs = y.images.map(function (src, n) {
      return '<button type="button" class="ydlg__thumb js-thumb' + (n ? "" : " is-active") + '" data-src="' + esc(src) + '"><img src="' + esc(sized(src, 200)) + '" alt="" loading="lazy"></button>';
    }).join("");
    var prices = y.durations.map(function (d) {
      return "<li><span>" + esc(d.label) + "</span><b>" + money(d.price) + "</b></li>";
    }).join("");
    dialog.querySelector(".ydlg__body").innerHTML =
      '<div class="ydlg__gallery">' +
        '<img class="ydlg__main" src="' + esc(sized(y.images[0] || "", 1400)) + '" alt="' + esc(label(y)) + '">' +
        '<div class="ydlg__thumbs">' + thumbs + "</div>" +
      "</div>" +
      '<div class="ydlg__info">' +
        '<p class="eyebrow">' + esc(y.type) + "</p>" +
        "<h3>" + esc(y.name) + "</h3>" +
        '<p class="yacht__model">' + esc(y.builder) + " · " + y.feet + " ft" + (y.guests ? " · up to " + y.guests + " guests" : "") + (y.cabins ? " · " + y.cabins + " cabins" : "") + "</p>" +
        (y.summary ? '<p class="ydlg__summary">' + esc(y.summary) + "</p>" : "") +
        '<h4>Rates</h4><ul class="ydlg__prices">' + prices + "</ul>" +
        '<p class="muted ydlg__small">Starting rates. Sales tax' + (y.gratuityIncluded ? "" : " and crew gratuity") + " may apply. Your final quote is confirmed on enquiry.</p>" +
        '<dl class="ydlg__meta">' +
          "<dt>Departs from</dt><dd>" + list(y.locations) + "</dd>" +
          "<dt>Crew</dt><dd>" + list(y.crew) + "</dd>" +
          "<dt>Toys</dt><dd>" + list(y.toys) + "</dd>" +
        "</dl>" +
        "<h4>Availability</h4><div class=\"ydlg__cal\">" + calendarHtml(y) + "</div>" +
        '<a href="#contact" class="btn btn--gold btn--block js-enquire">Enquire about ' + esc(y.name) + "</a>" +
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
    if (!dateNote || !select || !dateInput) return;
    var opt = select.options[select.selectedIndex];
    var handle = opt && opt.getAttribute("data-handle");
    var y = fleet.filter(function (x) { return x.handle === handle; })[0];
    var state = y && y.busy && dateInput.value ? y.busy[dateInput.value] : null;
    dateNote.textContent = state === "full"
      ? y.name + " is booked on this date. Send your enquiry anyway and we'll suggest similar yachts."
      : state === "partial"
        ? y.name + " has another charter that day. Some hours may still be free."
        : "";
    dateNote.hidden = !dateNote.textContent;
  }
  if (select) select.addEventListener("change", checkDate);
  if (dateInput) dateInput.addEventListener("change", checkDate);

  // WhatsApp links
  document.querySelectorAll(".js-wa").forEach(function (a) {
    if (WHATSAPP_NUMBER) {
      a.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent("Hi Yachtique, I'd like to plan a charter.");
    } else {
      a.href = "#contact";
      a.removeAttribute("target");
      if (!a.classList.contains("wa-float")) a.textContent = "Coming soon";
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
