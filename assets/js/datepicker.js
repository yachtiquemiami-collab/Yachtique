// Date fields: one Yachtique calendar in every browser (Safari, iPhone and Chrome look the same).
// Each <input type="date"> stays in the form (so enquiries send the same YYYY-MM-DD value) but is hidden;
// a button shows "Pick a date" or "Thu, Oct 29, 2026" and opens the calendar.
// Pages can mark booked days by setting input._yqBusy = { "2026-10-29": "full" | "partial" }.
(function () {
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(v) { var p = v.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  // Words and date formats follow the language chosen in core.js
  function T(k, en) { return window.yq ? yq.t(k, en) : en; }
  function loc() { return window.yq ? yq.locale() : "en-US"; }
  function nice(v) { return parse(v).toLocaleDateString(loc(), { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
  function weekdays() {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(new Date(2024, 0, 1 + i).toLocaleDateString(loc(), { weekday: "short" }).replace(".", "").slice(0, 2));
    return out;
  }
  var syncs = [];
  var phone = window.matchMedia("(max-width: 600px)");
  var open = null;

  function enhance(inp) {
    if (inp._yq) return;
    inp._yq = true;
    var wrap = document.createElement("span");
    wrap.className = "datewrap";
    inp.parentNode.insertBefore(wrap, inp);
    // The button comes first so a click on the field's label opens our calendar, not the browser's
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "datewrap__btn";
    btn.setAttribute("aria-haspopup", "dialog");
    wrap.appendChild(btn);
    wrap.appendChild(inp);
    inp.tabIndex = -1;
    inp.setAttribute("aria-hidden", "true");
    function sync() {
      btn.textContent = inp.value ? nice(inp.value) : T("dp.pick", "Pick a date");
      wrap.classList.toggle("has-value", !!inp.value);
    }
    inp.addEventListener("input", sync);
    inp.addEventListener("change", sync);
    syncs.push(sync);
    sync();
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (open && open.inp === inp) close(); else show(inp, wrap, btn);
    });
  }

  function show(inp, wrap, btn) {
    close();
    var v = inp.value ? parse(inp.value) : inp.min ? parse(inp.min) : new Date();
    var pop = document.createElement("div");
    pop.className = "dp";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", T("dp.choose", "Choose a date"));
    var back = document.createElement("div");
    back.className = "dp-backdrop";
    document.body.appendChild(back);
    document.body.appendChild(pop);
    wrap.classList.add("is-open");
    open = { inp: inp, wrap: wrap, btn: btn, pop: pop, back: back, view: new Date(v.getFullYear(), v.getMonth(), 1) };
    draw();
    place();
    pop.addEventListener("click", onPick);
    back.addEventListener("click", close);
    var focusDay = pop.querySelector(".is-picked") || pop.querySelector(".dp__d:not(:disabled)");
    if (focusDay && !phone.matches) focusDay.focus({ preventScroll: true });
  }

  function place() {
    if (!open) return;
    if (phone.matches) { open.pop.style.left = open.pop.style.top = ""; return; }
    var r = open.wrap.getBoundingClientRect();
    var w = open.pop.offsetWidth;
    var left = Math.max(12, Math.min(r.left - 4, document.documentElement.clientWidth - w - 12));
    open.pop.style.left = left + window.scrollX + "px";
    // Open upwards when there's no room below but there is above (e.g. the hero finder on a laptop)
    var h = open.pop.offsetHeight, below = window.innerHeight - r.bottom, above = r.top - 70;
    var up = below < h + 16 && above > below;
    open.pop.style.top = (up ? r.top - h - 12 : r.bottom + 12) + window.scrollY + "px";
    open.pop.classList.toggle("dp--up", up);
  }

  function draw() {
    var o = open, m = o.view;
    var today = ymd(new Date()), min = o.inp.min || "", busy = o.inp._yqBusy || null;
    var lead = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
    var days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    var atMin = min && ymd(m).slice(0, 7) <= min.slice(0, 7);
    var html =
      '<div class="dp__head">' +
        '<button type="button" class="dp__nav" data-step="-1" aria-label="' + T("cal.prev", "Previous month") + '"' + (atMin ? " disabled" : "") + ">‹</button>" +
        "<b>" + m.toLocaleString(loc(), { month: "long", year: "numeric" }) + "</b>" +
        '<button type="button" class="dp__nav" data-step="1" aria-label="' + T("cal.next", "Next month") + '">›</button>' +
      '</div><div class="dp__grid">' +
      weekdays().map(function (d) { return "<span>" + d + "</span>"; }).join("");
    for (var k = 0; k < lead; k++) html += "<i></i>";
    for (var d = 1; d <= days; d++) {
      var key = ymd(new Date(m.getFullYear(), m.getMonth(), d));
      var st = busy && busy[key];
      var off = min && key < min;
      html += '<button type="button" class="dp__d' + (key === today ? " is-today" : "") + (key === o.inp.value ? " is-picked" : "") +
        (st && !off ? " is-" + st : "") + '" data-day="' + key + '"' + (off ? " disabled" : "") +
        ' aria-label="' + nice(key) + (st === "full" ? ", " + T("dp.booked", "booked") : st === "partial" ? ", " + T("dp.partial", "partly booked") : "") + '">' + d + "</button>";
    }
    html += '</div><div class="dp__foot">' +
      (busy ? '<span class="dp__legend"><i class="is-partial"></i>' + T("cal.partial", "Partly booked") + ' <i class="is-full"></i>' + T("cal.full", "Booked") + "</span>"
        : '<span class="dp__legend">' + T("dp.times", "Times are arranged with you") + "</span>") +
      '<span class="dp__acts"><button type="button" class="dp__clear">' + T("dp.clear", "Clear") + '</button><button type="button" class="dp__close">' + T("dp.close", "Close") + "</button></span></div>";
    o.pop.innerHTML = html;
  }

  function set(v) {
    var inp = open.inp, btn = open.btn;
    inp.value = v;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    close();
    btn.focus({ preventScroll: true });
  }

  function onPick(e) {
    e.stopPropagation();
    var nav = e.target.closest(".dp__nav");
    if (nav && !nav.disabled) { open.view.setMonth(open.view.getMonth() + +nav.getAttribute("data-step")); draw(); return; }
    var day = e.target.closest(".dp__d");
    if (day && !day.disabled) { set(day.getAttribute("data-day")); return; }
    if (e.target.closest(".dp__clear")) { set(""); return; }
    if (e.target.closest(".dp__close")) close();
  }

  function close() {
    if (!open) return;
    open.pop.remove();
    open.back.remove();
    open.wrap.classList.remove("is-open");
    open = null;
  }

  document.addEventListener("pointerdown", function (e) {
    if (open && !open.pop.contains(e.target) && !open.wrap.contains(e.target)) close();
  });
  document.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") { var b = open.btn; close(); b.focus(); return; }
    var cur = document.activeElement;
    if (!cur || !cur.classList || !cur.classList.contains("dp__d")) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    var next = parse(cur.getAttribute("data-day"));
    next.setDate(next.getDate() + step);
    var key = ymd(next);
    if (open.inp.min && key < open.inp.min) return;
    if (next.getMonth() !== open.view.getMonth()) { open.view = new Date(next.getFullYear(), next.getMonth(), 1); draw(); }
    var el = open.pop.querySelector('[data-day="' + key + '"]');
    if (el) el.focus();
  });
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, { passive: true });

  function init() {
    document.querySelectorAll('input[type="date"]').forEach(enhance);
    if (window.yq && !init.done) { init.done = true; yq.onLang(function () { syncs.forEach(function (f) { f(); }); if (open) draw(); }); }
  }
  window.yqDates = { enhance: enhance, init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
