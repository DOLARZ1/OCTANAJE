/* =====================================================================
   OCTANAJE · UI — helpers de DOM, toasts y modal
   ===================================================================== */
(function () {
  "use strict";
  const Audio = window.NEXUS.Audio;
  const Store = window.NEXUS.Store;

  // ---------- helpers DOM ----------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
        else if (k === "dataset") { for (const d in attrs[k]) node.dataset[d] = attrs[k][d]; }
        // atributos booleanos de HTML (disabled, checked, readonly, required…):
        // su sola presencia activa el comportamiento sin importar el valor,
        // así que "false" NO debe agregarse al elemento en absoluto.
        else if (attrs[k] === false) { /* omitir: no agregar el atributo */ }
        else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return node;
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ---------- formato ----------
  const fmt = {
    money(n) {
      const s = (Store && Store.get().settings) || {};
      const cur = s.currency || "MXN";
      const loc = s.locale || "es-MX";
      const v = Number(n) || 0;
      try {
        return v.toLocaleString(loc, { style: "currency", currency: cur, maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
      } catch (e) {
        return "$" + v.toLocaleString("es-MX");
      }
    },
    num(n) {
      const loc = (Store && Store.get().settings.locale) || "es-MX";
      return (Number(n) || 0).toLocaleString(loc);
    },
    pct(n) { return Math.round(Number(n) || 0) + "%"; }
  };

  // ---------- toasts ----------
  const stack = () => document.getElementById("toast-stack");
  function toast(opts) {
    opts = typeof opts === "string" ? { msg: opts } : opts;
    const icon = opts.icon || "✦";
    const node = el("div", { class: "toast" + (opts.level ? " level" : "") }, [
      el("span", { class: "t-ico", text: icon }),
      el("div", { class: "t-body" }, [
        opts.title ? el("div", { class: "t-title", text: opts.title }) : null,
        el("div", { class: "t-msg", text: opts.msg || "" })
      ])
    ]);
    stack().appendChild(node);
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => node.remove(), 400);
    }, opts.duration || 3200);
  }

  // ---------- modal ----------
  const overlay = () => document.getElementById("modal-overlay");
  function openModal(title, bodyNode) {
    document.getElementById("modal-title").textContent = title;
    const body = document.getElementById("modal-body");
    body.innerHTML = "";
    body.appendChild(bodyNode);
    overlay().hidden = false;
    const firstInput = body.querySelector("input, textarea, select");
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }
  function closeModal() { overlay().hidden = true; }

  // ---------- form builder ----------
  // fields: [{name,label,type,value,options,placeholder,required,min,step}]
  function form(fields, onSubmit, submitLabel, extrasFn) {
    const inputs = {};
    const wrap = el("form", { class: "nexus-form" });
    fields.forEach((f) => {
      if (f.type === "row" && f.fields) {
        const row = el("div", { class: "row" });
        f.fields.forEach((sf) => { const fld = buildField(sf, inputs); row.appendChild(fld); });
        wrap.appendChild(row);
        return;
      }
      wrap.appendChild(buildField(f, inputs));
    });
    // contenido extra opcional (recibe el mapa de inputs para leer valores en vivo)
    if (typeof extrasFn === "function") { try { const ex = extrasFn(inputs); if (ex) wrap.appendChild(ex); } catch (e) {} }
    const submit = el("button", { class: "btn primary block mt-8", type: "submit", text: submitLabel || "Guardar" });
    wrap.appendChild(submit);
    wrap.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = {};
      let ok = true;
      for (const name in inputs) {
        const inp = inputs[name];
        let val = inp.value;
        if (inp.type === "number") val = val === "" ? "" : Number(val);
        if (inp.dataset.required === "1" && (val === "" || val == null)) { ok = false; inp.style.borderColor = "var(--bad)"; }
        data[name] = val;
      }
      if (!ok) { Audio.play("error"); toast({ icon: "⚠️", title: "Faltan datos", msg: "Completa los campos obligatorios." }); return; }
      onSubmit(data);
    });
    return wrap;
  }

  function buildField(f, inputs) {
    const field = el("div", { class: "field" });
    if (f.label) field.appendChild(el("label", { text: f.label + (f.required ? " *" : "") }));

    // Selector visual con íconos (emoji o SVG). Guarda el valor en un input oculto.
    if (f.type === "iconpick") {
      const hidden = el("input", { type: "hidden" });
      hidden.value = f.value != null ? f.value : (f.options && f.options[0] ? f.options[0].value : "");
      const grid = el("div", { class: "iconpick" });
      (f.options || []).forEach((o) => {
        const btn = el("button", { type: "button", class: "iconpick-btn" + (o.value === hidden.value ? " on" : ""), title: o.label });
        const ic = o.svg ? "<span class='ip-ic'>" + o.svg + "</span>" : "<span class='ip-ic ip-emoji'>" + (o.icon || "") + "</span>";
        btn.innerHTML = ic + "<span class='ip-lbl'>" + o.label + "</span>";
        btn.addEventListener("click", () => {
          hidden.value = o.value;
          grid.querySelectorAll(".iconpick-btn").forEach((b) => b.classList.remove("on"));
          btn.classList.add("on");
        });
        grid.appendChild(btn);
      });
      inputs[f.name] = hidden;
      field.appendChild(grid);
      field.appendChild(hidden);
      return field;
    }

    // Selector de días de la semana (para programar hábitos). Guarda CSV de 0..6.
    if (f.type === "weekdays") {
      const initial = Array.isArray(f.value) ? f.value.slice() : (typeof f.value === "string" && f.value ? f.value.split(",").map(Number) : [0, 1, 2, 3, 4, 5, 6]);
      const sel = new Set(initial);
      const hidden = el("input", { type: "hidden" });
      const sync = () => { hidden.value = Array.from(sel).sort().join(","); };
      sync();
      const order = [[1, "L"], [2, "M"], [3, "M"], [4, "J"], [5, "V"], [6, "S"], [0, "D"]];
      const btns = {};
      const grid = el("div", { class: "wdays" });
      order.forEach((o) => {
        const b = el("button", { type: "button", class: "wday" + (sel.has(o[0]) ? " on" : ""), text: o[1] });
        b.addEventListener("click", () => { if (sel.has(o[0])) sel.delete(o[0]); else sel.add(o[0]); b.classList.toggle("on"); sync(); });
        btns[o[0]] = b; grid.appendChild(b);
      });
      const setPreset = (arr) => { sel.clear(); arr.forEach((d) => sel.add(d)); order.forEach((o) => btns[o[0]].classList.toggle("on", sel.has(o[0]))); sync(); };
      const presets = el("div", { class: "flex gap-8", style: "margin-bottom:8px;flex-wrap:wrap" }, [
        el("button", { type: "button", class: "btn sm ghost", text: "Todos", onclick: () => setPreset([0, 1, 2, 3, 4, 5, 6]) }),
        el("button", { type: "button", class: "btn sm ghost", text: "Lun-Vie", onclick: () => setPreset([1, 2, 3, 4, 5]) }),
        el("button", { type: "button", class: "btn sm ghost", text: "Fin de semana", onclick: () => setPreset([0, 6]) })
      ]);
      inputs[f.name] = hidden;
      field.appendChild(presets);
      field.appendChild(grid);
      field.appendChild(hidden);
      return field;
    }

    let input;
    if (f.type === "select") {
      input = el("select", { class: "select" });
      (f.options || []).forEach((o) => {
        const opt = el("option", { value: o.value != null ? o.value : o, text: o.label != null ? o.label : o });
        if ((o.value != null ? o.value : o) == f.value) opt.selected = true;
        input.appendChild(opt);
      });
    } else if (f.type === "textarea") {
      input = el("textarea", { class: "textarea", placeholder: f.placeholder || "" });
      input.value = f.value || "";
    } else {
      input = el("input", { class: "input", type: f.type || "text", placeholder: f.placeholder || "" });
      if (f.value != null) input.value = f.value;
      if (f.min != null) input.min = f.min;
      if (f.step != null) input.step = f.step;
    }
    if (f.required) input.dataset.required = "1";
    inputs[f.name] = input;
    input.addEventListener("input", () => { input.style.borderColor = ""; });
    field.appendChild(input);
    return field;
  }

  // ---------- confirm ----------
  function confirmBox(title, msg, onYes, yesLabel) {
    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13 mb-16", text: msg }),
      el("div", { class: "row" }, [
        el("button", { class: "btn ghost", text: "Cancelar", onclick: closeModal }),
        el("button", { class: "btn danger", text: yesLabel || "Confirmar", onclick: () => { closeModal(); onYes(); } })
      ])
    ]);
    openModal(title, body);
  }

  window.NEXUS.UI = { el, $, $$, fmt, toast, openModal, closeModal, form, confirmBox };
})();
