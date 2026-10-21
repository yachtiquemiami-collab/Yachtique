// /available: day buttons filter the yachts; day names follow the chosen language.
(function () {
  var bar = document.getElementById("dayBar");
  var grid = document.getElementById("avGrid");
  var empty = document.getElementById("avEmpty");

  function labels() {
    var loc = window.yq ? yq.locale() : "en-US";
    document.querySelectorAll("[data-date]").forEach(function (el) {
      var p = el.getAttribute("data-date").split("-");
      var d = new Date(+p[0], p[1] - 1, +p[2]);
      var out = el.querySelector(".js-daylabel") || el;
      out.textContent = d.toLocaleDateString(loc, { weekday: "short" }).replace(".", "") + " " + d.getDate();
    });
  }

  function show(day) {
    if (!grid) return;
    var shown = 0;
    grid.querySelectorAll(".yacht").forEach(function (card) {
      var ok = !day || (" " + card.getAttribute("data-free") + " " + card.getAttribute("data-part") + " ").indexOf(" " + day + " ") > -1;
      card.hidden = !ok;
      if (ok) shown++;
      card.querySelectorAll(".adays li").forEach(function (li) { li.classList.toggle("is-on", li.getAttribute("data-date") === day); });
    });
    if (empty) empty.hidden = shown > 0;
  }

  if (bar) {
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-day]");
      if (!b) return;
      bar.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      show(b.getAttribute("data-day"));
      if (window.yq) yq.track("available_filter", { v: b.getAttribute("data-day") || "all" });
    });
  }
  labels();
  if (window.yq) yq.onLang(labels);
})();
