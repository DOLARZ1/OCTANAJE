/* =====================================================================
   NEXUS · Módulo Finanzas con IA
   Motor de análisis por reglas: detecta patrones, sobregasto, tasa de
   ahorro, proyecciones y genera recomendaciones personalizadas.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const EXPENSE_CATS = [
    "Comida", "Restaurantes", "Supermercado", "Transporte", "Combustible", "Vivienda",
    "Servicios", "Internet/Teléfono", "Ocio", "Viajes", "Salud", "Deporte", "Compras",
    "Ropa", "Tecnología", "Hogar", "Educación", "Suscripciones", "Mascotas", "Hijos",
    "Belleza", "Regalos", "Impuestos", "Seguros", "Deudas", "Ahorro/Inversión", "Donaciones", "Comisiones", "Otros"
  ];
  const INCOME_CATS = [
    "Salario", "Freelance", "Negocio", "Inversiones", "Dividendos", "Alquiler",
    "Intereses", "Bonos", "Reembolso", "Beca", "Pensión", "Regalo", "Ventas", "Otros"
  ];
  const CAT_ICON = {
    // gastos
    Comida: "🍔", Restaurantes: "🍽️", Supermercado: "🛒", Transporte: "🚗", Combustible: "⛽",
    Vivienda: "🏠", Servicios: "💡", "Internet/Teléfono": "📶", Ocio: "🎮", Viajes: "✈️",
    Salud: "🩺", Deporte: "🏋️", Compras: "🛍️", Ropa: "👕", Tecnología: "💻", Hogar: "🛋️",
    Educación: "📖", Suscripciones: "📺", Mascotas: "🐾", Hijos: "🧸", Belleza: "💅",
    Regalos: "🎁", Impuestos: "🧾", Seguros: "🛡️", Deudas: "💳", "Ahorro/Inversión": "🏦",
    Donaciones: "🤝", Comisiones: "🏷️",
    // ingresos
    Salario: "💼", Freelance: "🧑‍💻", Negocio: "🏢", Inversiones: "📈", Dividendos: "💹",
    Alquiler: "🔑", Intereses: "🪙", Bonos: "🎯", Reembolso: "↩️", Beca: "🎓", Pensión: "👴",
    Regalo: "🎁", Ventas: "🏷️",
    Otros: "•"
  };

  function fin() { return Store.get().finance; }
  function txs() { return fin().transactions; }

  function inMonth(t, mk) { return t.date.slice(0, 7) === (mk || DateUtil.monthKey()); }
  function sum(list) { return list.reduce((s, t) => s + t.amount, 0); }

  function monthIncome(mk) { return sum(txs().filter((t) => t.type === "income" && inMonth(t, mk))); }
  function monthExpense(mk) { return sum(txs().filter((t) => t.type === "expense" && inMonth(t, mk))); }
  function monthBalance(mk) { return monthIncome(mk) - monthExpense(mk); }

  function expenseByCategory(mk) {
    const map = {};
    txs().filter((t) => t.type === "expense" && inMonth(t, mk)).forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.keys(map).map((k) => ({ label: k, value: map[k] })).sort((a, b) => b.value - a.value);
  }

  function last6Months() {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = DateUtil.monthKey(d);
      out.push({ mk, label: d.toLocaleDateString("es-MX", { month: "short" }), income: monthIncome(mk), expense: monthExpense(mk) });
    }
    return out;
  }

  // gastos e ingresos por día de un mes (offset 0 = mes actual, -1 = anterior…)
  function dailyForMonth(offset) {
    const base = new Date();
    const y = base.getFullYear(), mo = base.getMonth() + (offset || 0);
    const first = new Date(y, mo, 1);
    const yy = first.getFullYear(), mm = first.getMonth();
    const days = new Date(yy, mm + 1, 0).getDate();
    const labels = [], income = [], expense = [];
    for (let d = 1; d <= days; d++) {
      const key = DateUtil.key(new Date(yy, mm, d));
      labels.push(String(d));
      income.push(sum(txs().filter((t) => t.type === "income" && t.date === key)));
      expense.push(sum(txs().filter((t) => t.type === "expense" && t.date === key)));
    }
    return { labels, income, expense };
  }

  // fecha legible con día de la semana: "mié, 9 jul"
  function niceDate(key) {
    const d = DateUtil.parse(key);
    const now = new Date();
    const opts = d.getFullYear() === now.getFullYear()
      ? { weekday: "short", day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
    return d.toLocaleDateString("es-MX", opts);
  }

  // vista de la gráfica de tendencia: "days" | "months"
  let trendMode = "days";
  let dayMonthOffset = 0;   // 0 = mes actual, -1 = mes anterior, …
  function trendSegBtn(mode, label, container) {
    const b = el("button", { text: label, onclick: () => { trendMode = mode; Audio.play("tab"); render(container); } });
    if (trendMode === mode) b.classList.add("on");
    return b;
  }

  // ---------------------------------------------------------------
  //  MOTOR DE IA — genera insights a partir de los datos
  // ---------------------------------------------------------------
  function analyze() {
    const insights = [];
    const inc = monthIncome(), exp = monthExpense(), bal = inc - exp;
    const f = fin();
    const cats = expenseByCategory();
    const months = last6Months();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const today = new Date().getDate();

    if (inc === 0 && exp === 0) {
      insights.push({ type: "info", icon: "🤖", txt: "Registra tus ingresos y gastos y analizaré tus finanzas al instante: tasa de ahorro, sobregastos, proyecciones y recomendaciones." });
      return { insights, score: null };
    }

    // 1) Tasa de ahorro
    if (inc > 0) {
      const rate = (bal / inc) * 100;
      if (rate >= 20) insights.push({ type: "good", icon: "💎", txt: `Excelente: ahorras el <b>${Math.round(rate)}%</b> de tus ingresos este mes. Estás por encima de la regla del 20%.` });
      else if (rate >= 0) insights.push({ type: "warn", icon: "📊", txt: `Tu tasa de ahorro es del <b>${Math.round(rate)}%</b>. Apunta al 20% (regla 50/30/20): recorta gastos no esenciales unos ${fmt.money(inc * 0.2 - bal)}.` });
      else insights.push({ type: "bad", icon: "🚨", txt: `Alerta: gastas <b>${fmt.money(-bal)}</b> más de lo que ingresas. Revisa las categorías más altas para equilibrar tu mes.` });
    }

    // 2) Categoría dominante
    if (cats.length && exp > 0) {
      const top = cats[0];
      const share = (top.value / exp) * 100;
      if (share > 40) insights.push({ type: "warn", icon: CAT_ICON[top.label] || "⚠️", txt: `<b>${top.label}</b> concentra el <b>${Math.round(share)}%</b> de tus gastos (${fmt.money(top.value)}). Es tu mayor oportunidad de ahorro.` });
      else insights.push({ type: "info", icon: CAT_ICON[top.label] || "📌", txt: `Tu mayor gasto es <b>${top.label}</b> con ${fmt.money(top.value)} (${Math.round(share)}%). Gasto bien distribuido.` });
    }

    // 3) Proyección fin de mes (ritmo de gasto)
    if (exp > 0 && today > 2) {
      const dailyRate = exp / today;
      const projected = dailyRate * daysInMonth;
      if (f.budget > 0) {
        if (projected > f.budget) insights.push({ type: "bad", icon: "📈", txt: `A este ritmo gastarás ~<b>${fmt.money(projected)}</b> este mes, superando tu presupuesto de ${fmt.money(f.budget)} en ${fmt.money(projected - f.budget)}.` });
        else insights.push({ type: "good", icon: "✅", txt: `Vas bien: proyección de ~<b>${fmt.money(projected)}</b>, dentro de tu presupuesto de ${fmt.money(f.budget)}.` });
      } else {
        insights.push({ type: "info", icon: "🔮", txt: `Según tu ritmo, cerrarás el mes con ~<b>${fmt.money(projected)}</b> en gastos. Define un presupuesto para recibir alertas.` });
      }
    }

    // 4) Tendencia vs mes anterior
    if (months.length >= 2) {
      const prev = months[months.length - 2], cur = months[months.length - 1];
      if (prev.expense > 0) {
        const chg = ((cur.expense - prev.expense) / prev.expense) * 100;
        if (chg > 15) insights.push({ type: "warn", icon: "⬆️", txt: `Tus gastos subieron un <b>${Math.round(chg)}%</b> respecto al mes pasado. Vigila el ritmo.` });
        else if (chg < -10) insights.push({ type: "good", icon: "⬇️", txt: `¡Bien! Redujiste tus gastos un <b>${Math.round(-chg)}%</b> frente al mes anterior.` });
      }
    }

    // 5) Suscripciones
    const subs = cats.find((c) => c.label === "Suscripciones");
    if (subs && subs.value > 0 && inc > 0 && subs.value / inc > 0.1) {
      insights.push({ type: "warn", icon: "📺", txt: `Gastas ${fmt.money(subs.value)} en suscripciones (${Math.round((subs.value / inc) * 100)}% de tus ingresos). Cancela las que no uses.` });
    }

    // 6) Meta de ahorro
    if (f.savingGoal > 0) {
      if (bal >= f.savingGoal) insights.push({ type: "good", icon: "🎯", txt: `¡Meta de ahorro cumplida! Guardaste ${fmt.money(bal)} de los ${fmt.money(f.savingGoal)} objetivo.` });
      else insights.push({ type: "info", icon: "🎯", txt: `Te faltan <b>${fmt.money(f.savingGoal - bal)}</b> para tu meta de ahorro mensual de ${fmt.money(f.savingGoal)}.` });
    }

    // 7) Fondo de emergencia (consejo educativo)
    if (bal > 0) {
      insights.push({ type: "info", icon: "🛡️", txt: `Consejo: destina parte de tus ${fmt.money(bal)} de balance a un fondo de emergencia (meta: 3-6 meses de gastos).` });
    }

    // ---- Salud financiera (score 0-100) ----
    let score = 50;
    if (inc > 0) {
      const rate = (bal / inc) * 100;
      score = 50 + Math.max(-40, Math.min(40, rate));            // ahorro
      if (cats.length && (cats[0].value / (exp || 1)) > 0.45) score -= 8; // concentración
      if (f.budget > 0 && exp <= f.budget) score += 8;
    }
    score = Math.round(Math.max(0, Math.min(100, score)));

    return { insights, score };
  }

  // ---------------------------------------------------------------
  //  Acciones
  // ---------------------------------------------------------------
  function addTx(type) {
    const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
    const body = UI.form([
      { type: "row", fields: [
        { name: "amount", label: "Monto", type: "number", min: 0, step: "0.01", placeholder: "0.00", required: true },
        { name: "category", label: "Categoría", type: "select", options: cats, value: cats[0] }
      ]},
      { name: "note", label: "Nota (opcional)", placeholder: type === "income" ? "Pago de nómina" : "Supermercado" },
      { name: "date", label: "Fecha", type: "date", value: DateUtil.todayKey(), required: true }
    ], (data) => {
      if (!data.amount || data.amount <= 0) { Audio.play("error"); toast({ icon: "⚠️", msg: "Ingresa un monto válido" }); return; }
      const xp = type === "income" ? 8 : 5;
      txs().push({ id: Store.uid(), type, amount: Number(data.amount), category: data.category, note: data.note, date: data.date, xpEarned: xp });
      Store.commit();
      Audio.play(type === "income" ? "money" : "coin");
      Gami.award(xp, type === "income" ? "Ingreso registrado" : "Gasto registrado");
      UI.closeModal();
      render(document.getElementById("view-finance"));
      N.App && N.App.refreshTop();
    }, type === "income" ? "Registrar ingreso" : "Registrar gasto");
    UI.openModal(type === "income" ? "＋ Nuevo ingreso" : "－ Nuevo gasto", body);
  }

  function editBudget() {
    const f = fin();
    const body = UI.form([
      { name: "budget", label: "Presupuesto mensual de gasto", type: "number", min: 0, value: f.budget || "", placeholder: "1500" },
      { name: "savingGoal", label: "Meta de ahorro mensual", type: "number", min: 0, value: f.savingGoal || "", placeholder: "300" }
    ], (data) => {
      f.budget = Number(data.budget) || 0;
      f.savingGoal = Number(data.savingGoal) || 0;
      Store.commit();
      toast({ icon: "🎯", msg: "Objetivos actualizados" });
      UI.closeModal();
      render(document.getElementById("view-finance"));
    }, "Guardar objetivos");
    UI.openModal("Objetivos financieros", body);
  }

  function removeTx(t) {
    UI.confirmBox("Eliminar movimiento", `¿Eliminar este ${t.type === "income" ? "ingreso" : "gasto"} de ${fmt.money(t.amount)}?`, () => {
      const arr = txs();
      arr.splice(arr.indexOf(t), 1);
      Audio.play("delete");
      const xp = t.xpEarned != null ? t.xpEarned : (t.type === "income" ? 8 : 5);
      if (xp) Gami.remove(xp); else Store.commit(); // devolver la XP ganada
      render(document.getElementById("view-finance"));
      N.App && N.App.refreshTop();
    }, "Eliminar");
  }

  // ---------------------------------------------------------------
  //  Render
  // ---------------------------------------------------------------
  function render(container) {
    container.innerHTML = "";
    const inc = monthIncome(), exp = monthExpense(), bal = inc - exp;
    const result = analyze();

    const head = el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [el("span", { class: "ico", text: "◈" }), "Finanzas"]),
        el("p", { class: "view-desc", text: "Controla tu dinero y sigue los mercados y noticias que mueven la economía." })
      ]),
      el("div", { class: "flex gap-8" }, [
        el("button", { class: "btn", onclick: editBudget, html: "🎯 Objetivos" }),
        el("button", { class: "btn ghost", onclick: () => addTx("expense"), html: "－ Gasto" }),
        el("button", { class: "btn primary", onclick: () => addTx("income"), html: "＋ Ingreso" })
      ])
    ]);
    container.appendChild(head);

    // KPIs
    container.appendChild(el("div", { class: "grid cols-4 mb-16" }, [
      kpi("Ingresos", fmt.money(inc), "este mes", "good"),
      kpi("Gastos", fmt.money(exp), "este mes", "bad"),
      kpi("Balance", fmt.money(bal), bal >= 0 ? "ahorro" : "déficit", bal >= 0 ? "good" : "bad"),
      kpi("Salud", result.score == null ? "—" : result.score + "/100", "financiera", healthClass(result.score))
    ]));

    // Panel de mercados y noticias (cotizaciones en vivo + fuentes)
    container.appendChild(marketsCard());

    // Gráficas
    const charts = el("div", { class: "grid cols-2 mb-16" });

    const nowD = new Date();
    const selMonth = new Date(nowD.getFullYear(), nowD.getMonth() + dayMonthOffset, 1);
    const sameYear = selMonth.getFullYear() === nowD.getFullYear();
    const monthLabel = selMonth.toLocaleDateString("es-MX", sameYear ? { month: "long" } : { month: "long", year: "numeric" });
    const atCurrent = dayMonthOffset >= 0;

    let leftGroup;
    if (trendMode === "days") {
      leftGroup = el("div", { class: "flex items-center gap-8" }, [
        el("button", { class: "icon-btn", style: "width:30px;height:30px;font-size:18px", title: "Mes anterior", html: "‹", onclick: () => { dayMonthOffset--; Audio.play("tap"); render(container); } }),
        el("div", { class: "card-title", style: "text-transform:capitalize" }, [el("span", { class: "dot" }), "Gastos · " + monthLabel]),
        el("button", { class: "icon-btn", style: "width:30px;height:30px;font-size:18px" + (atCurrent ? ";opacity:.3;pointer-events:none" : ""), title: "Mes siguiente", html: "›", onclick: () => { if (dayMonthOffset < 0) { dayMonthOffset++; Audio.play("tap"); render(container); } } })
      ]);
    } else {
      leftGroup = el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Ingresos vs Gastos · 6 meses"]);
    }

    const trendCard = el("div", { class: "card" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        leftGroup,
        el("div", { class: "seg" }, [
          trendSegBtn("days", "Por día", container),
          trendSegBtn("months", "6 meses", container)
        ])
      ])
    ]);
    const cvTrend = el("canvas");
    trendCard.appendChild(el("div", { class: "chart-box" }, [cvTrend]));
    trendCard.appendChild(el("div", { class: "flex gap-12 mt-8 fs-12" },
      trendMode === "days"
        ? [el("span", { class: "chip bad", text: "● Gasto de cada día" })]
        : [el("span", { class: "chip good", text: "● Ingresos" }), el("span", { class: "chip bad", text: "● Gastos" })]
    ));
    charts.appendChild(trendCard);

    const catCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Gastos por categoría"])])
    ]);
    const cvCat = el("canvas");
    catCard.appendChild(el("div", { class: "chart-box" }, [cvCat]));
    const cats = expenseByCategory();
    const legend = el("div", { class: "mt-8" });
    cats.slice(0, 5).forEach((c) => {
      legend.appendChild(el("div", { class: "flex items-center justify-between fs-12", style: "padding:3px 0" }, [
        el("span", { text: (CAT_ICON[c.label] || "•") + " " + c.label }),
        el("span", { class: "fw-700", text: fmt.money(c.value) })
      ]));
    });
    catCard.appendChild(legend);
    charts.appendChild(catCard);
    container.appendChild(charts);

    setTimeout(() => {
      if (trendMode === "days") {
        const dd = dailyForMonth(dayMonthOffset);
        Charts.bars(cvTrend, { labels: dd.labels, series: [{ values: dd.expense, color: "--bad" }] }, { height: 190 });
      } else {
        const m = last6Months();
        Charts.bars(cvTrend, {
          labels: m.map((x) => x.label),
          series: [{ values: m.map((x) => x.income), color: "--good" }, { values: m.map((x) => x.expense), color: "--bad" }]
        }, { height: 190 });
      }
      Charts.doughnut(cvCat, cats, { height: 190, centerLabel: fmt.money(exp), centerSub: "gasto mes" });
    }, 30);

    // Movimientos recientes
    const recent = txs().slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 12);
    const listCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Movimientos recientes"])])
    ]);
    if (!recent.length) {
      listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "◈" }), el("div", { text: "Sin movimientos todavía." })]));
    } else {
      recent.forEach((t) => {
        listCard.appendChild(el("div", { class: "item" }, [
          el("div", { style: "font-size:20px", text: CAT_ICON[t.category] || "•" }),
          el("div", { class: "item-main" }, [
            el("div", { class: "item-title", text: t.note || t.category }),
            el("div", { class: "item-meta" }, [
              el("span", { text: t.category }),
              el("span", { class: "chip accent", text: "📅 " + niceDate(t.date) })
            ])
          ]),
          el("div", { class: "fw-700 " + (t.type === "income" ? "text-good" : "text-bad"), text: (t.type === "income" ? "+" : "−") + fmt.money(t.amount) }),
          el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => removeTx(t) })
        ]));
      });
    }
    container.appendChild(listCard);
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }),
      el("div", { class: "kpi-val " + (cls || ""), text: val }),
      el("div", { class: "kpi-sub", text: sub })
    ])]);
  }
  function healthClass(s) { if (s == null) return ""; return s >= 70 ? "good" : s >= 45 ? "warn" : "bad"; }
  function healthChip(s) { return s >= 70 ? "good" : s >= 45 ? "warn" : "bad"; }

  // ---------------------------------------------------------------
  //  MERCADOS Y NOTICIAS
  //  Cotizaciones en vivo (API gratuita, se piden desde el navegador) +
  //  accesos directos a fuentes oficiales/actualizadas.
  // ---------------------------------------------------------------
  const FX_API = "https://open.er-api.com/v6/latest/USD";
  let mktCache = null; // { "q-usdmxn": "$18.30", ... }

  const NEWS_LINKS = [
    { icon: "🥇", t: "Oro · XAU/USD", d: "Investing", u: "https://es.investing.com/currencies/xau-usd" },
    { icon: "💶", t: "EUR/USD", d: "Investing", u: "https://es.investing.com/currencies/eur-usd" },
    { icon: "🛢️", t: "Petróleo WTI", d: "Investing", u: "https://es.investing.com/commodities/crude-oil" },
    { icon: "📈", t: "BMV · IPC", d: "Bolsa Mexicana de Valores", u: "https://www.bmv.com.mx/" },
    { icon: "💵", t: "Dólar oficial", d: "Banxico", u: "https://www.banxico.org.mx/tipcamb/main.do?page=tip&idioma=sp" },
    { icon: "⛽", t: "Gasolina México", d: "Profeco", u: "https://combustibleinteligente.profeco.gob.mx/" },
    { icon: "🔥", t: "Gas LP", d: "CRE · gob.mx", u: "https://www.gob.mx/cre/articulos/precios-vigentes-de-gas-lp-al-publico" },
    { icon: "📰", t: "El Financiero", d: "Mercados", u: "https://www.elfinanciero.com.mx/mercados/" },
    { icon: "📰", t: "Expansión", d: "Economía", u: "https://expansion.mx/economia" },
    { icon: "📰", t: "Bloomberg Línea", d: "México", u: "https://www.bloomberglinea.com/mexico/" }
  ];

  function quoteCard(id, label, sub) {
    return el("div", { class: "card", style: "padding:14px" }, [
      el("div", { class: "kpi" }, [
        el("div", { class: "kpi-lbl", text: label }),
        el("div", { class: "kpi-val accent", id: id, text: (mktCache && mktCache[id]) || "…" }),
        el("div", { class: "kpi-sub", text: sub })
      ])
    ]);
  }
  function linkCard(l) {
    return el("a", { href: l.u, target: "_blank", rel: "noopener", class: "card mktlink", style: "padding:12px;display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit" }, [
      el("span", { style: "font-size:20px", text: l.icon }),
      el("div", {}, [
        el("div", { class: "fs-13 fw-700", text: l.t }),
        el("div", { class: "fs-12 text-faint", text: l.d })
      ])
    ]);
  }

  function paintQuotes(rates) {
    if (!mktCache) mktCache = {};
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; mktCache[id] = val; };
    const usdmxn = rates.MXN, eurusd = 1 / rates.EUR, eurmxn = rates.MXN / rates.EUR;
    set("q-usdmxn", "$" + usdmxn.toFixed(3));
    set("q-eurusd", eurusd.toFixed(4));
    set("q-eurmxn", "$" + eurmxn.toFixed(3));
    const upd = document.getElementById("mkt-updated");
    if (upd) upd.textContent = "Actualizado: " + new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) + " · fuente: open.er-api.com (actualización diaria). Valores referenciales.";
  }

  function loadQuotes() {
    const upd = document.getElementById("mkt-updated");
    if (typeof fetch !== "function") { if (upd) upd.textContent = "Cotizaciones en vivo no disponibles aquí. Usa los enlaces de abajo. ↓"; return; }
    if (upd) upd.textContent = "Cargando cotizaciones en vivo…";
    fetch(FX_API).then((r) => r.json()).then((j) => {
      if (!j || j.result !== "success" || !j.rates) throw new Error("bad");
      paintQuotes(j.rates);
    }).catch(() => {
      if (upd) upd.textContent = "No se pudieron cargar las cotizaciones en vivo (revisa tu conexión). Usa los enlaces de abajo. ↓";
    });
  }

  function marketsCard() {
    const card = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "📰 Mercados y noticias"]),
        el("button", { class: "btn sm", html: "↻ Actualizar", onclick: () => loadQuotes() })
      ]),
      el("div", { class: "grid cols-3" }, [
        quoteCard("q-usdmxn", "Dólar · USD/MXN", "peso mexicano"),
        quoteCard("q-eurusd", "EUR/USD", "euro / dólar"),
        quoteCard("q-eurmxn", "EUR/MXN", "euro / peso")
      ]),
      el("div", { class: "fs-12 text-faint mt-8", id: "mkt-updated", text: "Cargando cotizaciones en vivo…" }),
      el("div", { class: "card-title mt-16", style: "margin-bottom:10px" }, [el("span", { class: "dot" }), "Noticias y precios en vivo · toca para abrir la fuente"]),
      el("div", { class: "grid cols-3" }, NEWS_LINKS.map(linkCard))
    ]);
    setTimeout(loadQuotes, 60);
    return card;
  }

  N.Finance = { render, monthIncome, monthExpense, monthBalance, expenseByCategory, last6Months, analyze };
})();
