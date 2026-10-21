// Loaded first on every page. Three shared jobs:
//  1. Language: English / Spanish switch (same idea as Yacht Bites). Text marked data-i18n="key" is swapped
//     for the Spanish in COMMON below or in the page's own <script type="application/json" id="i18n-es">.
//     Attributes: data-i18n-attr="placeholder:key;aria-label:key". The choice is remembered; ?lang=es also works.
//     Visitors whose browser is set to Spanish see Spanish first.
//  2. Tracking: anonymous counts of page views and clicks (WhatsApp, calls, enquiries, yachts viewed), no cookies.
//     Sent to /api/track, which writes them to the Events tab of the Yachtique Google Sheet.
//  3. Shortlist: hearts on yachts, saved in this browser, compared at /shortlist.
(function () {
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  /* ---------------- Language ---------------- */
  var COMMON = {
    "nav.fleet": "Flota", "nav.available": "Disponibles", "nav.experiences": "Experiencias", "nav.concierge": "Concierge",
    "nav.about": "Nosotros", "nav.enquire": "Reservar", "nav.menu": "Abrir menú",
    "foot.tag": "Alquiler privado de yates y concierge en Miami, organizado por un solo bróker desde el primer mensaje hasta el muelle.",
    "foot.explore": "Explorar", "foot.fleet": "La flota", "foot.available": "Disponibles esta semana", "foot.shortlist": "Mi selección",
    "foot.concierge": "Concierge", "foot.faq": "Preguntas frecuentes", "foot.terms": "Condiciones de reserva", "foot.privacy": "Política de privacidad",
    "foot.where": "Dónde navegamos", "foot.occasions": "Ocasiones", "foot.contact": "Contacto",
    "foot.rights": "Yachtique. Miami, Florida.",
    "wa.chat": "Chatear por WhatsApp", "wa.ask": "Preguntar por WhatsApp", "wa.short": "WhatsApp",
    "mb.enquire": "Reservar", "mb.request": "Solicitar",
    "btn.enquiry": "Enviar una solicitud", "btn.viewyacht": "Ver yate", "btn.viewfleet": "Ver la flota", "btn.refresh": "Actualizar",
    "save.add": "Guardar en mi selección", "save.remove": "Quitar de mi selección", "save.pill": "Mi selección",
    "card.from": "desde", "card.guests": "invitados", "card.cabin": "camarote", "card.cabins": "camarotes",
    "card.quick": "Vista rápida de",
    "f.length": "Eslora", "f.guests": "Invitados", "f.cabins": "Camarotes", "f.sleeps": "Pernoctan", "f.crew": "Tripulación", "f.builder": "Astillero",
    "f.upto": "Hasta",
    "y.rates": "Tarifas", "y.onboard": "A bordo", "y.availability": "Disponibilidad", "y.theyacht": "El yate",
    "y.departs": "Sale desde", "y.toys": "Juguetes acuáticos", "y.gratuity": "Propina", "y.included": "Incluida", "y.notincluded": "No incluida",
    "y.ratesnote": "Tarifas desde el punto de salida más económico. Pueden aplicarse impuestos y la propina de la tripulación. Su cotización final se confirma con la solicitud.",
    "y.ratesnote.tip": "Tarifas desde el punto de salida más económico. Pueden aplicarse impuestos. Su cotización final se confirma con la solicitud.",
    "y.popnote": "Tarifas desde. Pueden aplicarse impuestos y la propina de la tripulación. Su cotización final se confirma con la solicitud.",
    "y.popnote.tip": "Tarifas desde. Pueden aplicarse impuestos. Su cotización final se confirma con la solicitud.",
    "y.noavail": "La disponibilidad de este yate se confirma con la solicitud.",
    "y.full": "Ver todos los detalles", "y.enquire": "Solicitar", "y.photos": "Ver las {n} fotos", "y.photo": "Ver foto",
    "y.similar": "Yates similares", "y.english": "Descripción del yate en inglés.", "y.tap": "Toque un día libre para elegirlo",
    "y.request": "Solicitar", "y.nopay": "Sin pago ahora. Le respondemos con opciones, normalmente en menos de una hora.",
    "y.booked": "{y} está reservado en esta fecha. Envíe su solicitud de todos modos y le sugeriremos yates similares.",
    "y.partial": "{y} tiene otro alquiler ese día. Puede que aún queden horas libres.",
    "y.notfound": "Este yate no está disponible", "y.notfound.p": "Puede que haya salido de la flota. Vea los yates que podemos ofrecer hoy.",
    "y.wait": "Un momento", "y.wait.p": "Estamos actualizando la flota. Actualice esta página en unos segundos o escríbanos por WhatsApp.",
    "form.date": "Fecha", "form.guests": "Invitados", "form.duration": "Duración", "form.name": "Nombre", "form.phone": "Teléfono / WhatsApp",
    "form.email": "Correo electrónico", "form.else": "¿Algo más?", "form.else.ph": "Ocasión, punto de salida, peticiones especiales…",
    "form.notsure": "Aún no lo sé",
    "cal.free": "Disponible", "cal.partial": "Parcialmente reservado", "cal.full": "Reservado",
    "cal.prev": "Mes anterior", "cal.next": "Mes siguiente",
    "dp.pick": "Elegir fecha", "dp.clear": "Borrar", "dp.close": "Cerrar", "dp.choose": "Elija una fecha",
    "dp.times": "Los horarios se acuerdan con usted", "dp.booked": "reservado", "dp.partial": "parcialmente reservado",
    "crumb.fleet": "La flota", "lang.label": "Idioma",
    "occ.sunset-cruise": "Cruceros al atardecer", "occ.birthday": "Cumpleaños y celebraciones", "occ.bachelorette-bachelor": "Despedidas de soltero y soltera",
    "occ.sandbar-day": "Días en el banco de arena", "occ.corporate": "Corporativo y VIP", "occ.proposal": "Propuestas de matrimonio",
    "area.miami-beach": "Miami Beach y Downtown Miami", "area.coconut-grove-key-biscayne": "Coconut Grove y Key Biscayne",
    "area.fort-lauderdale": "Fort Lauderdale", "area.palm-beach-boca-raton": "Palm Beach y Boca Raton", "area.key-west": "Key West",
    "area.bahamas-bimini": "Bimini y las Bahamas",
    "save.cta": "Guardar", "save.saved": "Guardado", "card.From": "Desde",
    // yacht types and durations from the fleet feed
    "type:Motor Yacht": "Yate a motor", "type:Express Cruiser": "Crucero exprés", "type:Power Catamaran": "Catamarán a motor",
    "type:Sailing catamaran": "Catamarán de vela", "type:Super Yacht": "Superyate", "type:Sport Yacht": "Yate deportivo",
  };
  var PAGE = {};
  try { var pd = document.getElementById("i18n-es"); if (pd) PAGE = JSON.parse(pd.textContent); } catch (e) {}
  var ES = {};
  [COMMON, PAGE].forEach(function (src) { for (var k in src) ES[k] = src[k]; });

  var params = new URLSearchParams(location.search);
  var asked = params.get("lang");
  // A page can ask for a default (a proposal written for a Spanish-speaking client): <body data-lang-default="es">
  var pageDefault = document.body && document.body.getAttribute("data-lang-default");
  var lang = asked === "es" || asked === "en" ? asked
    : pageDefault === "es" ? "es"
    : store("yq_lang") || (/^es\b/i.test(navigator.language || "") ? "es" : "en");
  if (asked === "es" || asked === "en") store("yq_lang", asked);

  function t(key, en, vars) {
    var s = lang === "es" && ES[key] != null ? ES[key] : en;
    if (vars) for (var v in vars) s = s.split("{" + v + "}").join(vars[v]);
    return s;
  }
  function type(tp) { return t("type:" + tp, tp); }
  function dur(label) {
    if (lang !== "es") return label;
    return String(label).replace(/(\d+)\s*hours?/i, "$1 horas").replace(/Day Trip/i, "excursión de un día").replace(/Multi-day \/ week/i, "Varios días / semana");
  }
  function guests(n) { return n + " " + t("card.guests", "guests"); }
  function cabins(n) { return n + " " + (n === 1 ? t("card.cabin", "cabin") : t("card.cabins", "cabins")); }
  function locale() { return lang === "es" ? "es-US" : "en-US"; }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el._yqEn == null) el._yqEn = el.innerHTML;
      var k = el.getAttribute("data-i18n");
      el.innerHTML = lang === "es" && ES[k] != null ? ES[k] : el._yqEn;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":"), a = (p[0] || "").trim(), k = (p[1] || "").trim();
        if (!a || !k) return;
        el._yqAttr = el._yqAttr || {};
        if (el._yqAttr[a] == null) el._yqAttr[a] = el.getAttribute(a) || "";
        el.setAttribute(a, lang === "es" && ES[k] != null ? ES[k] : el._yqAttr[a]);
      });
    });
    document.querySelectorAll("a[data-wa-es]").forEach(function (a) {
      if (a._yqHref == null) a._yqHref = a.getAttribute("href");
      a.setAttribute("href", lang === "es" ? a._yqHref.split("?")[0] + "?text=" + encodeURIComponent(a.getAttribute("data-wa-es")) : a._yqHref);
    });
    document.querySelectorAll("[data-dur]").forEach(function (el) {
      if (el._yqEn == null) el._yqEn = el.textContent;
      el.textContent = dur(el._yqEn);
    });
    if (ES._title) {
      if (document._yqTitle == null) document._yqTitle = document.title;
      document.title = lang === "es" ? ES._title : document._yqTitle;
    }
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  var langSubs = [];
  function setLang(l) {
    if (l === lang || (l !== "en" && l !== "es")) return;
    lang = l;
    store("yq_lang", l);
    apply();
    slSync();
    langSubs.forEach(function (fn) { try { fn(l); } catch (e) {} });
    track("language", { v: l });
  }

  /* ---------------- Tracking ---------------- */
  var source = (function () {
    var saved = null;
    try { saved = JSON.parse(store("yq_src") || "null"); } catch (e) {}
    if (saved && Date.now() - saved.t < 30 * 86400000) return saved.s;
    var u = params.get("utm_source") || params.get("ref");
    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch (e) {}
    if (ref === location.hostname) ref = "";
    var s = (u ? u + (params.get("utm_campaign") ? " / " + params.get("utm_campaign") : "") : ref) || "direct";
    store("yq_src", JSON.stringify({ s: s, t: Date.now() }));
    return s;
  })();

  function track(event, data) {
    if (/^(localhost|127\.)/.test(location.hostname)) return;
    data = data || {};
    var body = JSON.stringify({
      e: event, p: location.pathname, y: data.y || "", v: String(data.v || "").slice(0, 120),
      l: lang, s: source, d: window.innerWidth < 800 ? "phone" : "desktop",
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))) return;
    } catch (e) {}
    try { fetch("/api/track", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }); } catch (e) {}
  }

  // Where on the page a click happened: the nearest data-track label, else the section id
  function placeOf(el) {
    var tagged = el.closest("[data-track]");
    if (tagged) return tagged.getAttribute("data-track");
    var sec = el.closest("section[id], header, footer, .mobilebar, .wa-float, .ybook, dialog");
    if (!sec) return "page";
    return sec.id || (sec.className && String(sec.className).split(" ")[0]) || sec.tagName.toLowerCase();
  }

  /* ---------------- Shortlist ---------------- */
  var SL = "yq_shortlist";
  function slGet() { try { var a = JSON.parse(store(SL) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  var slSubs = [];
  function slSet(a) { store(SL, JSON.stringify(a.slice(0, 12))); slSync(); slSubs.forEach(function (fn) { try { fn(slGet()); } catch (e) {} }); }
  function slToggle(h) {
    var a = slGet(), i = a.indexOf(h);
    if (i > -1) a.splice(i, 1); else a.push(h);
    slSet(a);
    track(i > -1 ? "shortlist_remove" : "shortlist_add", { y: h });
  }
  var pill = null;
  function slSync() {
    var a = slGet();
    document.querySelectorAll("[data-save]").forEach(function (b) {
      var on = a.indexOf(b.getAttribute("data-save")) > -1;
      b.classList.toggle("is-saved", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", on ? t("save.remove", "Remove from shortlist") : t("save.add", "Save to shortlist"));
      var txt = b.querySelector(".save__txt");
      if (txt) txt.textContent = on ? t("save.saved", "Saved") : t("save.cta", "Save");
    });
    if (/^\/shortlist/.test(location.pathname)) { if (pill) pill.hidden = true; return; }
    if (!pill && a.length) {
      pill = document.createElement("a");
      pill.className = "slpill";
      pill.href = "/shortlist";
      document.body.appendChild(pill);
    }
    if (pill) {
      pill.hidden = !a.length;
      pill.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>' +
        "<span>" + t("save.pill", "Shortlist") + "</span><b>" + a.length + "</b>";
    }
  }

  /* ---------------- Wiring ---------------- */
  document.addEventListener("click", function (e) {
    var langBtn = e.target.closest("[data-lang]");
    if (langBtn) { e.preventDefault(); setLang(langBtn.getAttribute("data-lang")); return; }
    var save = e.target.closest("[data-save]");
    if (save) { e.preventDefault(); e.stopPropagation(); slToggle(save.getAttribute("data-save")); return; }
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/wa\.me\//.test(href)) track("whatsapp", { v: placeOf(a), y: a.getAttribute("data-yacht") || "" });
    else if (/^tel:/.test(href)) track("call", { v: placeOf(a) });
    else if (/^mailto:/.test(href)) track("email", { v: placeOf(a) });
    else if (/instagram\.com/.test(href)) track("instagram", { v: placeOf(a) });
  }, true);

  // Enquiry forms: record the send, and pass the visit's source and language to the Sheet
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || f.getAttribute("name") !== "enquiry") return;
    [["source", source], ["lang", lang]].forEach(function (p) {
      var inp = f.querySelector('input[name="' + p[0] + '"]');
      if (!inp) { inp = document.createElement("input"); inp.type = "hidden"; inp.name = p[0]; f.appendChild(inp); }
      inp.value = p[1];
    });
    var y = f.querySelector('[name="yacht"]');
    track("enquiry", { v: placeOf(f), y: y ? y.value : "" });
  }, true);

  window.yq = {
    lang: function () { return lang; }, t: t, type: type, dur: dur, guests: guests, cabins: cabins, locale: locale,
    setLang: setLang, onLang: function (fn) { langSubs.push(fn); }, apply: apply,
    track: track,
    shortlist: { get: slGet, set: slSet, toggle: slToggle, sync: slSync, on: function (fn) { slSubs.push(fn); } },
  };

  function start() {
    apply();
    slSync();
    track("view", { y: document.body.getAttribute("data-yacht") || "" });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
