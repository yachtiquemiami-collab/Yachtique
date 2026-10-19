// WhatsApp number in international format, digits only (e.g. 13055551234).
// Leave empty until Nektarios confirms it; the links then fall back to the contact form.
var WHATSAPP_NUMBER = "";

(function () {
  // Fleet
  var grid = document.getElementById("fleetGrid");
  var select = document.getElementById("yachtSelect");
  var fleet = window.YACHTIQUE_FLEET || [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  if (grid) {
    grid.innerHTML = fleet.map(function (y) {
      var media = y.photo
        ? '<div class="yacht__media"><img src="' + esc(y.photo) + '" alt="' + esc(y.name + ", " + y.model) + '" loading="lazy"></div>'
        : '<div class="yacht__media yacht__media--empty"><img src="/assets/img/logo-icon.png" alt="" loading="lazy"></div>';
      var tag = y.tag ? '<span class="yacht__tag">' + esc(y.tag) + "</span>" : "";
      var price = y.price ? "<b>" + esc(y.price) + "</b>" : "Rates on request";
      return (
        '<article class="yacht reveal">' +
          media.replace("</div>", tag + "</div>") +
          '<div class="yacht__body">' +
            "<h3>" + esc(y.name) + "</h3>" +
            '<p class="yacht__model">' + esc(y.model) + "</p>" +
            '<ul class="yacht__specs">' +
              "<li><b>" + esc(y.guests) + "</b>Guests</li>" +
              "<li><b>" + esc(y.cabins) + "</b>Cabins</li>" +
              "<li><b>" + esc(y.crew) + "</b>Crew</li>" +
            "</ul>" +
            '<div class="yacht__foot">' +
              '<span class="yacht__price">' + price + "</span>" +
              '<a href="#contact" class="btn btn--ghost btn--sm js-pick" data-yacht="' + esc(y.name + " (" + y.model + ")") + '">Enquire</a>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  if (select) {
    fleet.forEach(function (y) {
      var o = document.createElement("option");
      o.textContent = y.name + " (" + y.model + ")";
      select.appendChild(o);
    });
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".js-pick");
      if (btn) select.value = btn.getAttribute("data-yacht");
    });
  }

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

  // Reveal on scroll
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-visible"); });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
