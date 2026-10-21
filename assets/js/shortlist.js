// /shortlist: compare saved yachts, check a date, share with the group, send to Yachtique.
(function () {
  var app = document.getElementById("slApp");
  if (!app) return;
  var WA = "13058124721";
  var ES = {
    "sl.empty": "Su selección está vacía. Toque el corazón en cualquier yate para guardarlo aquí.",
    "sl.browse": "Ver la flota", "sl.shared": "Selección compartida", "sl.shared.p": "Alguien compartió estos yates con usted.",
    "sl.keep": "Guardar en mi selección", "sl.kept": "Guardados en su selección",
    "sl.date": "Revisar una fecha", "sl.type": "Tipo", "sl.from": "Desde", "sl.longest": "Día más largo",
    "sl.departs": "Sale desde", "sl.on": "El", "sl.remove": "Quitar", "sl.view": "Ver yate",
    "sl.send": "Enviar mi selección por WhatsApp", "sl.share": "Compartir con mi grupo", "sl.enquire": "Solicitar estos yates",
    "sl.copied": "Enlace copiado. Péguelo en el chat de su grupo.", "sl.more": "más",
    "sl.free": "Disponible", "sl.partial": "Parcialmente reservado", "sl.full": "Reservado", "sl.unknown": "A confirmar",
    "sl.msg": "Hola Yachtique, estos son los yates que me gustan:", "sl.msg.date": "Fecha", "sl.loading": "Cargando su selección…",
    "sl.error": "No pudimos cargar la flota. Actualice la página en unos segundos.",
  };
  // Page strings join the shared dictionary
  var t = function (k, en, v) {
    var s = window.yq && yq.lang() === "es" && ES[k] ? ES[k] : en;
    if (v) for (var x in v) s = s.split("{" + x + "}").join(v[x]);
    return s;
  };

  var params = new URLSearchParams(location.search);
  var shared = (params.get("y") || "").split(",").filter(Boolean);
  var fleet = [], date = "";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function niceDate(v) { var p = v.split("-"); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(yq.locale(), { weekday: "short", month: "short", day: "numeric" }); }
  function sized(src, w) { return src + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w; }
  function handles() { return shared.length ? shared : yq.shortlist.get(); }
  function yachts() {
    var map = {}; fleet.forEach(function (y) { map[y.handle] = y; });
    return handles().map(function (h) { return map[h]; }).filter(Boolean);
  }
  function link() { return location.origin + "/shortlist?y=" + handles().join(","); }

  function render() {
    var list = yachts();
    if (!list.length) {
      app.innerHTML = '<div class="slempty"><p class="lead">' + t("sl.empty", "Your shortlist is empty. Tap the heart on any yacht to save it here.") + "</p>" +
        '<a href="/#fleet" class="btn btn--gold">' + t("sl.browse", "Browse the fleet") + "</a></div>";
      return;
    }
    var mine = yq.shortlist.get();
    var allKept = list.every(function (y) { return mine.indexOf(y.handle) > -1; });
    var head = shared.length
      ? '<div class="slshared"><div><b>' + t("sl.shared", "Shared shortlist") + "</b><span>" + t("sl.shared.p", "Someone shared these yachts with you.") + "</span></div>" +
        (allKept ? "<em>" + t("sl.kept", "Saved to your shortlist") + "</em>" : '<button type="button" class="btn btn--ghost btn--sm js-keep">' + t("sl.keep", "Save to my shortlist") + "</button>") + "</div>"
      : "";
    var stateTxt = function (y) {
      if (!date) return "";
      var st = y.busy ? y.busy[date] || "free" : null;
      if (!st) return '<span class="slstate">' + t("sl.unknown", "To confirm") + "</span>";
      return '<span class="slstate slstate--' + st + '">' + (st === "free" ? t("sl.free", "Available") : st === "partial" ? t("sl.partial", "Partly booked") : t("sl.full", "Booked")) + "</span>";
    };
    var places = function (y) {
      var l = (y.locations || []).map(function (s) { return s.replace(/\s*\(.*\)/, ""); });
      return l.length > 2 ? esc(l.slice(0, 2).join(", ")) + " +" + (l.length - 2) + " " + t("sl.more", "more") : esc(l.join(", ")) || "—";
    };
    var rows = [
      ["", function (y) {
        return '<div class="slcard"><a href="/yachts/' + esc(y.handle) + '" class="slcard__img"><img src="' + esc(sized(y.images[0] || "", 600)) + '" alt="' + esc(y.name) + '" loading="lazy"></a>' +
          '<h3><a href="/yachts/' + esc(y.handle) + '">' + esc(y.name) + "</a></h3>" + stateTxt(y) + "</div>";
      }],
      [t("sl.type", "Type"), function (y) { return esc(yq.type(y.type)); }],
      [yq.t("f.length", "Length"), function (y) { return y.feet + " ft"; }],
      [yq.t("f.guests", "Guests"), function (y) { return y.guests ? yq.t("f.upto", "Up to") + " " + y.guests : "—"; }],
      [yq.t("f.cabins", "Cabins"), function (y) { return y.cabins || "—"; }],
      [t("sl.from", "From"), function (y) { var d = y.durations[0]; return "<b>" + money(d.price) + "</b> / " + esc(yq.dur(d.label)); }],
      [t("sl.longest", "Longest day"), function (y) { var d = y.durations[y.durations.length - 1]; return y.durations.length > 1 ? money(d.price) + " / " + esc(yq.dur(d.label)) : "—"; }],
      [t("sl.departs", "Departs from"), places],
      [yq.t("f.crew", "Crew"), function (y) { return y.crew && y.crew.length ? esc(y.crew.join(", ")) : "—"; }],
      [yq.t("y.toys", "Toys"), function (y) { return y.toys && y.toys.length ? esc(y.toys.join(", ")) : "—"; }],
      [yq.t("y.gratuity", "Gratuity"), function (y) { return y.gratuityIncluded ? yq.t("y.included", "Included") : yq.t("y.notincluded", "Not included"); }],
      ["", function (y) {
        return '<div class="slacts"><a href="/yachts/' + esc(y.handle) + '" class="yacht__link">' + t("sl.view", "View yacht") + " →</a>" +
          (shared.length ? "" : '<button type="button" class="link-btn js-remove" data-h="' + esc(y.handle) + '">' + t("sl.remove", "Remove") + "</button>") + "</div>";
      }],
    ];
    var table = '<div class="cmp"><table><tbody>' + rows.map(function (r) {
      return "<tr><th scope=\"row\">" + r[0] + "</th>" + list.map(function (y) { return "<td>" + r[1](y) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>";

    app.innerHTML = head +
      '<div class="sltools"><label class="form sldate"><span>' + t("sl.date", "Check a date") + '</span><input type="date" id="slDate"></label></div>' +
      table +
      '<div class="slshare">' +
        '<a class="btn btn--wa js-send" target="_blank" rel="noopener" href="#"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>' + t("sl.send", "Send my shortlist on WhatsApp") + "</a>" +
        '<button type="button" class="btn btn--ghost js-share">' + t("sl.share", "Share with my group") + "</button>" +
        '<a class="btn btn--gold js-enq" href="/?shortlist=' + encodeURIComponent(handles().join(",")) + '#contact">' + t("sl.enquire", "Enquire about these") + "</a>" +
      "</div>" +
      '<p class="slnote" id="slNote" hidden></p>';

    var inp = document.getElementById("slDate");
    inp.min = new Date().toISOString().slice(0, 10);
    inp.value = date;
    if (window.yqDates) yqDates.enhance(inp);
    inp.addEventListener("change", function () { date = inp.value; render(); });
    updateSend();
  }

  function updateSend() {
    var send = app.querySelector(".js-send");
    if (!send) return;
    var lines = yachts().map(function (y) { return "- " + y.name + " (" + y.feet + "ft " + y.builder + ") " + location.origin + "/yachts/" + y.handle; });
    var msg = t("sl.msg", "Hi Yachtique, these are the yachts I like:") + "\n" + lines.join("\n") + (date ? "\n" + t("sl.msg.date", "Date") + ": " + niceDate(date) : "");
    send.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  app.addEventListener("click", function (e) {
    var rm = e.target.closest(".js-remove");
    if (rm) { yq.shortlist.toggle(rm.getAttribute("data-h")); render(); return; }
    if (e.target.closest(".js-keep")) {
      var mine = yq.shortlist.get();
      shared.forEach(function (h) { if (mine.indexOf(h) < 0) mine.push(h); });
      yq.shortlist.set(mine);
      render();
      return;
    }
    if (e.target.closest(".js-send")) yq.track("shortlist_send", { v: String(yachts().length) });
    if (e.target.closest(".js-share")) {
      var url = link();
      yq.track("shortlist_share", { v: String(yachts().length) });
      if (navigator.share) { navigator.share({ title: "Yachtique", url: url }).catch(function () {}); return; }
      var note = document.getElementById("slNote");
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
        note.textContent = t("sl.copied", "Link copied. Paste it in your group chat.");
      }, function () { note.textContent = url; }).then(function () { note.hidden = false; });
    }
  });

  app.innerHTML = '<p class="fleet__status">' + t("sl.loading", "Loading your shortlist…") + "</p>";
  fetch("/api/fleet").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
    fleet = d.yachts || [];
    render();
    yq.onLang(render);
    yq.shortlist.on(function () { if (!shared.length) render(); });
  }).catch(function () {
    app.innerHTML = '<p class="fleet__status">' + t("sl.error", "We couldn't load the fleet. Please refresh in a few seconds.") + "</p>";
  });
})();
