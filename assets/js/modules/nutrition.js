/* =====================================================================
   OCTANAJE · Módulo Alimentación
   Base de datos de alimentos + registro diario con gramos.
   Medidor radial de anillos (calorías/proteínas/carbohidratos vs metas)
   y exportación de resumen detallado a PDF (diario/semanal/mensual).
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  const DEFAULT_GOALS = { kcal: 2000, prot: 120, carb: 250 };

  // Configuración de los 3 macros (orden = anillo externo → interno)
  const MACROS = [
    { key: "kcal", label: "Calorías", unit: "kcal", color: "--warn" },
    { key: "prot", label: "Proteínas", unit: "g", color: "--good" },
    { key: "carb", label: "Carbohidratos", unit: "g", color: "--accent" }
  ];

  function nut() {
    const s = Store.get();
    if (!s.nutrition || typeof s.nutrition !== "object") s.nutrition = {};
    if (!Array.isArray(s.nutrition.log)) s.nutrition.log = [];
    if (!s.nutrition.goals) s.nutrition.goals = Object.assign({}, DEFAULT_GOALS);
    if (!Array.isArray(s.nutrition.customFoods)) s.nutrition.customFoods = [];
    if (!Array.isArray(s.nutrition.favorites)) s.nutrition.favorites = [];
    return s.nutrition;
  }
  function log() { return nut().log; }
  function goals() { return nut().goals; }
  const r1 = (x) => Math.round(x * 10) / 10;

  // ---------------- Alimentos personalizados (guardados por el usuario) ----------------
  function customFoods() { return nut().customFoods; }
  // catálogo completo = base de datos incluida + los que el usuario agregó
  function allFoods() { return N.FOODS.concat(customFoods()); }

  function addCustomFood(data) {
    const food = {
      id: Store.uid(), custom: true,
      name: data.name.trim(), cat: data.cat || "Platillos mexicanos",
      kcal: Math.max(0, Number(data.kcal) || 0),
      prot: Math.max(0, Number(data.prot) || 0),
      carb: Math.max(0, Number(data.carb) || 0)
    };
    if (data.portionGrams && Number(data.portionGrams) > 0) {
      food.portion = { grams: Number(data.portionGrams), label: (data.portionLabel && data.portionLabel.trim()) || (Number(data.portionGrams) + " g aprox.") };
    }
    customFoods().push(food);
    Store.commit();
    return food;
  }
  function updateCustomFood(food, data) {
    food.name = data.name.trim(); food.cat = data.cat || food.cat;
    food.kcal = Math.max(0, Number(data.kcal) || 0);
    food.prot = Math.max(0, Number(data.prot) || 0);
    food.carb = Math.max(0, Number(data.carb) || 0);
    if (data.portionGrams && Number(data.portionGrams) > 0) {
      food.portion = { grams: Number(data.portionGrams), label: (data.portionLabel && data.portionLabel.trim()) || (Number(data.portionGrams) + " g aprox.") };
    } else {
      delete food.portion;
    }
    Store.commit();
  }
  function removeCustomFood(food) {
    const arr = customFoods(); const i = arr.indexOf(food);
    if (i >= 0) arr.splice(i, 1);
    // si estaba marcado como favorito, se limpia también
    const favs = nut().favorites; const fi = favs.indexOf(food.name);
    if (fi >= 0) favs.splice(fi, 1);
    Store.commit();
  }

  // ---------------- Favoritos ----------------
  const FAV_CAT = "⭐ Favoritos";
  function isFavorite(food) { return nut().favorites.includes(food.name); }
  function toggleFavorite(food) {
    const favs = nut().favorites;
    const i = favs.indexOf(food.name);
    if (i >= 0) { favs.splice(i, 1); } else { favs.push(food.name); }
    Store.commit();
    Audio.play("tap");
    return i < 0; // true si quedó marcado como favorito
  }
  function favoriteFoods() {
    const set = new Set(nut().favorites);
    return allFoods().filter((f) => set.has(f.name)).sort((a, b) => a.name.localeCompare(b.name));
  }

  function addEntry(food, grams) {
    const f = grams / 100;
    log().push({
      id: Store.uid(), name: food.name, cat: food.cat, grams: Math.round(grams),
      kcal: Math.round(food.kcal * f), prot: r1(food.prot * f), carb: r1(food.carb * f),
      date: today(), xpEarned: 2
    });
    Store.commit();
    Gami.award(2, "Alimento registrado 🍽️");
  }

  function removeEntry(e) {
    const a = log(); a.splice(a.indexOf(e), 1);
    Audio.play("delete");
    if (e.xpEarned) Gami.remove(e.xpEarned); else Store.commit();
    render(document.getElementById("view-nutrition"));
    N.App && N.App.refreshTop();
  }

  // elimina un registro y refresca el detalle de ESE día (para el historial,
  // donde puede no ser el día de hoy) además del fondo de la vista principal
  function removeEntryFromDay(e, dateKey) {
    const a = log(); const i = a.indexOf(e); if (i >= 0) a.splice(i, 1);
    Audio.play("delete");
    if (e.xpEarned) Gami.remove(e.xpEarned); else Store.commit();
    const bg = document.getElementById("view-nutrition");
    if (bg) render(bg);
    N.App && N.App.refreshTop();
    openDayDetail(dateKey);
  }

  function dayTotals(key) {
    return log().filter((x) => x.date === key).reduce((t, x) => {
      t.kcal += x.kcal; t.prot += x.prot; t.carb += x.carb; return t;
    }, { kcal: 0, prot: 0, carb: 0 });
  }
  // lista de días (más reciente primero) que tienen al menos un alimento registrado
  function historyDays() {
    const set = new Set(log().map((x) => x.date));
    return Array.from(set).sort().reverse();
  }
  function weekSeries(macro) {
    const days = DateUtil.lastNDays(7);
    return {
      labels: days.map((d) => DateUtil.weekday(d)),
      values: days.map((d) => Math.round(log().filter((x) => x.date === d).reduce((s, x) => s + x[macro], 0)))
    };
  }

  // ---------------- Buscador de alimentos ----------------
  let browseCat = "Todos";
  let browseQuery = "";

  function openBrowser() {
    const search = el("input", { class: "input", placeholder: "🔍 Buscar alimento…", value: browseQuery });
    const listWrap = el("div", { style: "max-height:42vh;overflow-y:auto;margin-top:10px" });
    const addBtn = el("button", { class: "btn primary block", style: "margin-top:10px", html: "＋ Agregar alimento nuevo a la lista", onclick: () => openCustomFoodForm() });

    function renderList() {
      listWrap.innerHTML = "";
      const q = browseQuery.trim().toLowerCase();
      if (browseCat === FAV_CAT) {
        const favs = favoriteFoods().filter((f) => !q || f.name.toLowerCase().includes(q));
        if (!favs.length) { listWrap.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "⭐" }), el("div", { text: "Aún no tienes favoritos. Toca la ⭐ de un alimento para agregarlo." })])); return; }
        favs.forEach((f) => listWrap.appendChild(foodRow(f)));
        return;
      }
      let items = allFoods().filter((f) => (browseCat === "Todos" || f.cat === browseCat) && (!q || f.name.toLowerCase().includes(q)));
      items = items.slice().sort((a, b) => a.name.localeCompare(b.name));
      if (!items.length) { listWrap.appendChild(el("div", { class: "empty", text: "Sin resultados." })); return; }
      if (browseCat === "Todos") {
        const groups = {};
        items.forEach((f) => { (groups[f.cat] = groups[f.cat] || []).push(f); });
        N.FOOD_CATS.forEach((cat) => {
          if (!groups[cat]) return;
          listWrap.appendChild(el("div", { class: "card-title", style: "margin:12px 0 6px", text: cat }));
          groups[cat].forEach((f) => listWrap.appendChild(foodRow(f)));
        });
      } else {
        items.forEach((f) => listWrap.appendChild(foodRow(f)));
      }
    }

    search.addEventListener("input", () => { browseQuery = search.value; renderList(); });

    const chips = el("div", { class: "flex gap-8", style: "flex-wrap:wrap;margin-top:10px" });
    [FAV_CAT, "Todos"].concat(N.FOOD_CATS).forEach((cat) => {
      const c = el("button", { class: "chip" + (cat === browseCat ? " accent" : ""), text: cat, style: "cursor:pointer" });
      c.addEventListener("click", () => { browseCat = cat; Audio.play("tap"); openBrowser(); });
      chips.appendChild(c);
    });

    const body = el("div", {}, [search, chips, listWrap, addBtn]);
    UI.openModal("🍽️ Alimentos", body);
    renderList();
  }

  function foodRow(f) {
    const macroLbl = "P " + f.prot + "g · C " + f.carb + "g /100g";
    const fav = isFavorite(f);
    return el("div", { class: "item", style: "padding:10px 12px;cursor:pointer", onclick: () => openPortion(f) }, [
      el("button", {
        class: "icon-btn", title: fav ? "Quitar de favoritos" : "Agregar a favoritos",
        style: fav ? "color:var(--warn)" : "",
        onclick: (ev) => { ev.stopPropagation(); toggleFavorite(f); openBrowser(); },
        html: fav ? "⭐" : "☆"
      }),
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", style: "font-size:14px" }, [f.name, f.custom ? el("span", { class: "chip", style: "margin-left:6px;font-size:10px", text: "propio" }) : null]),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip", text: f.kcal + " kcal" }),
          el("span", { class: "text-faint fs-12", text: macroLbl }),
          f.portion ? el("span", { class: "chip accent", text: "🍽️ " + f.portion.label }) : null
        ])
      ]),
      f.custom ? el("button", { class: "icon-btn", title: "Editar", onclick: (ev) => { ev.stopPropagation(); openCustomFoodForm(f); }, html: "✏️" }) : null,
      f.custom ? el("button", { class: "icon-btn", title: "Eliminar de la lista", onclick: (ev) => {
        ev.stopPropagation();
        UI.confirmBox("Eliminar alimento", "¿Eliminar \"" + f.name + "\" de tu lista? (los registros ya guardados en tu historial no se borran)", () => {
          removeCustomFood(f); Audio.play("delete"); toast({ icon: "🗑️", msg: "Alimento eliminado de la lista" }); openBrowser();
        }, "Eliminar");
      }, html: "🗑️" }) : null,
      el("button", { class: "icon-btn", html: "＋", title: "Agregar", onclick: (ev) => { ev.stopPropagation(); openPortion(f); } })
    ]);
  }

  // ---------------- Crear / editar un alimento personalizado ----------------
  // Soporta 2 modos de captura, según lo que sepas del alimento:
  //  · "por pieza/porción": metes el peso de 1 pieza + sus kcal/prot/carb TAL
  //    CUAL (ej. "1 huevo = 50 g, 70 kcal"), y la app calcula solo el
  //    equivalente por 100 g que se guarda internamente.
  //  · "por 100 g": el modo clásico, para ingredientes crudos tipo báscula.
  // En ambos casos el resultado queda guardado igual en tu lista, y podrás
  // agregarlo después eligiendo porciones o gramos como cualquier otro.
  function openCustomFoodForm(existing) {
    // si el alimento ya tiene una porción típica, por comodidad partimos en
    // modo "pieza" con los valores ya convertidos de vuelta a esa porción
    let mode = existing && existing.portion ? "piece" : "per100";
    let initPieceGrams = "", initPieceLabel = "1 pieza", initKcalPiece = "", initProtPiece = "", initCarbPiece = "";
    if (existing && existing.portion) {
      const f = existing.portion.grams / 100;
      initPieceGrams = existing.portion.grams;
      initPieceLabel = existing.portion.label;
      initKcalPiece = Math.round(existing.kcal * f);
      initProtPiece = r1(existing.prot * f);
      initCarbPiece = r1(existing.carb * f);
    }

    const nameI = el("input", { class: "input", value: existing ? existing.name : "", placeholder: "Ej. Torta de mi tía" });
    const catI = el("select", { class: "select" }, N.FOOD_CATS.map((c) => {
      const o = el("option", { value: c, text: c });
      if ((existing ? existing.cat : "Platillos mexicanos") === c) o.setAttribute("selected", "");
      return o;
    }));

    // --- campos modo "por 100 g" ---
    const kcal100I = el("input", { class: "input", type: "number", min: 0, step: 1, value: existing ? existing.kcal : "" });
    const prot100I = el("input", { class: "input", type: "number", min: 0, step: 0.1, value: existing ? existing.prot : "" });
    const carb100I = el("input", { class: "input", type: "number", min: 0, step: 0.1, value: existing ? existing.carb : "" });
    const portionGramsI = el("input", { class: "input", type: "number", min: 0, step: 1, value: existing && existing.portion ? existing.portion.grams : "", placeholder: "Opcional" });
    const portionLabelI = el("input", { class: "input", value: existing && existing.portion ? existing.portion.label : "", placeholder: "Ej. 1 pieza (~200 g)" });

    // --- campos modo "por pieza / porción" ---
    const pieceGramsI = el("input", { class: "input", type: "number", min: 1, step: 1, value: initPieceGrams, placeholder: "Ej. 50" });
    const pieceLabelI = el("input", { class: "input", value: initPieceLabel, placeholder: "Ej. 1 pieza mediana" });
    const kcalPieceI = el("input", { class: "input", type: "number", min: 0, step: 1, value: initKcalPiece, placeholder: "Ej. 70" });
    const protPieceI = el("input", { class: "input", type: "number", min: 0, step: 0.1, value: initProtPiece, placeholder: "Ej. 6" });
    const carbPieceI = el("input", { class: "input", type: "number", min: 0, step: 0.1, value: initCarbPiece, placeholder: "Ej. 0.5" });

    const preview = el("div", { class: "fs-12 text-faint mt-8" });
    function paintPreview() {
      if (mode === "piece") {
        const g = Number(pieceGramsI.value) || 0;
        if (g > 0) {
          const f = 100 / g;
          preview.textContent = "≈ equivalente a " + Math.round((Number(kcalPieceI.value) || 0) * f) + " kcal, P " +
            r1((Number(protPieceI.value) || 0) * f) + "g, C " + r1((Number(carbPieceI.value) || 0) * f) + "g por cada 100 g.";
        } else preview.textContent = "";
      } else {
        preview.textContent = "";
      }
    }
    [pieceGramsI, kcalPieceI, protPieceI, carbPieceI].forEach((i) => i.addEventListener("input", paintPreview));

    const per100Group = el("div", {}, [
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", { text: "Calorías /100 g *" }), kcal100I]),
        el("div", { class: "field" }, [el("label", { text: "Proteínas /100 g (g)" }), prot100I])
      ]),
      el("div", { class: "field" }, [el("label", { text: "Carbohidratos /100 g (g)" }), carb100I]),
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", { text: "Porción típica (gramos, opcional)" }), portionGramsI]),
        el("div", { class: "field" }, [el("label", { text: "Descripción de la porción" }), portionLabelI])
      ])
    ]);
    const pieceGroup = el("div", {}, [
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", { text: "Peso de 1 pieza/porción (g) *" }), pieceGramsI]),
        el("div", { class: "field" }, [el("label", { text: "¿Cómo se llama esa porción?" }), pieceLabelI])
      ]),
      el("div", { class: "insight info", style: "margin:8px 0" }, [
        el("span", { class: "ico", text: "💡" }),
        el("div", { class: "txt", text: "Escribe las calorías/proteínas/carbohidratos de ESA pieza completa (no por 100 g). La app hace la conversión sola." })
      ]),
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", { text: "Calorías de la pieza *" }), kcalPieceI]),
        el("div", { class: "field" }, [el("label", { text: "Proteínas de la pieza (g)" }), protPieceI])
      ]),
      el("div", { class: "field" }, [el("label", { text: "Carbohidratos de la pieza (g)" }), carbPieceI]),
      preview
    ]);

    const fieldsWrap = el("div", {});
    const switchBtn = el("button", { type: "button", class: "btn sm", style: "margin:6px 0 10px" });
    function paintMode() {
      fieldsWrap.innerHTML = "";
      fieldsWrap.appendChild(mode === "piece" ? pieceGroup : per100Group);
      switchBtn.innerHTML = mode === "piece" ? "⚖️ Prefiero capturar por 100 g" : "🍽️ Prefiero capturar por pieza/porción";
      paintPreview();
    }
    switchBtn.addEventListener("click", () => { mode = mode === "piece" ? "per100" : "piece"; paintMode(); });
    paintMode();

    const submitBtn = el("button", { class: "btn primary block mt-8", html: existing ? "Guardar cambios" : "＋ Agregar a mi lista" });
    submitBtn.addEventListener("click", () => {
      if (!nameI.value || !nameI.value.trim()) { Audio.play("error"); toast({ icon: "⚠️", msg: "Ponle un nombre al alimento" }); return; }

      let data;
      if (mode === "piece") {
        const g = Number(pieceGramsI.value) || 0;
        if (g <= 0) { Audio.play("error"); toast({ icon: "⚠️", msg: "Indica cuánto pesa esa pieza/porción" }); return; }
        const f = 100 / g;
        data = {
          name: nameI.value, cat: catI.value,
          kcal: Math.round((Number(kcalPieceI.value) || 0) * f),
          prot: r1((Number(protPieceI.value) || 0) * f),
          carb: r1((Number(carbPieceI.value) || 0) * f),
          portionGrams: g,
          portionLabel: (pieceLabelI.value && pieceLabelI.value.trim()) || (g + " g aprox.")
        };
      } else {
        data = {
          name: nameI.value, cat: catI.value,
          kcal: Number(kcal100I.value) || 0,
          prot: Number(prot100I.value) || 0,
          carb: Number(carb100I.value) || 0,
          portionGrams: Number(portionGramsI.value) || 0,
          portionLabel: portionLabelI.value
        };
      }

      if (existing) {
        updateCustomFood(existing, data);
        toast({ icon: "✏️", title: "Alimento actualizado", msg: existing.name });
      } else {
        const f = addCustomFood(data);
        Audio.play("add");
        toast({ icon: "🍽️", title: "Alimento agregado a tu lista", msg: f.name + " · ahora aparece en el buscador" });
      }
      openBrowser();
    });

    const body = el("div", {}, [
      el("div", { class: "field" }, [el("label", { text: "Nombre del alimento/platillo *" }), nameI]),
      el("div", { class: "field" }, [el("label", { text: "Categoría" }), catI]),
      switchBtn,
      fieldsWrap,
      submitBtn
    ]);
    UI.openModal(existing ? "Editar alimento" : "＋ Agregar alimento a la lista", body);
  }

  function openPortion(food) {
    const hasPortion = !!food.portion;
    // modo "porciones" (platillos: tacos, tortas, caldos, sushi...) vs modo "gramos" (ingredientes crudos)
    let mode = hasPortion ? "portion" : "grams";

    const gramsI = el("input", { class: "input", type: "number", min: 1, step: 1, value: 100 });
    const portionsI = el("input", { class: "input", type: "number", min: 0.5, step: 0.5, value: 1 });
    const portionLbl = hasPortion ? el("div", { class: "fs-12 text-faint mt-8", text: "1 porción ≈ " + food.portion.label }) : null;

    const gramsField = el("div", { class: "field" }, [el("label", { text: "Cantidad (gramos)" }), gramsI]);
    const portionField = hasPortion ? el("div", { class: "field" }, [el("label", { text: "Cantidad (porciones)" }), portionsI, portionLbl]) : null;

    const preview = el("div", { class: "grid cols-3", style: "margin-top:12px" });
    function currentGrams() {
      if (mode === "portion" && hasPortion) return (Number(portionsI.value) || 0) * food.portion.grams;
      return Number(gramsI.value) || 0;
    }
    function paint() {
      const g = currentGrams(); const f = g / 100;
      preview.innerHTML = "";
      preview.appendChild(macroBox("Calorías", Math.round(food.kcal * f), "kcal", "var(--warn)"));
      preview.appendChild(macroBox("Proteínas", r1(food.prot * f), "g", "var(--good)"));
      preview.appendChild(macroBox("Carbos", r1(food.carb * f), "g", "var(--accent)"));
    }
    gramsI.addEventListener("input", paint);
    portionsI.addEventListener("input", paint);

    const fieldsWrap = el("div", {});
    function paintFields() {
      fieldsWrap.innerHTML = "";
      if (mode === "portion" && hasPortion) fieldsWrap.appendChild(portionField);
      else fieldsWrap.appendChild(gramsField);
    }
    paintFields();

    const switchLink = hasPortion ? el("button", {
      class: "btn sm", style: "margin-top:8px",
      html: mode === "portion" ? "⚖️ Usar gramos en vez de porciones" : "🍽️ Usar porciones en vez de gramos",
      onclick: (ev) => {
        ev.preventDefault();
        mode = mode === "portion" ? "grams" : "portion";
        switchLink.innerHTML = mode === "portion" ? "⚖️ Usar gramos en vez de porciones" : "🍽️ Usar porciones en vez de gramos";
        paintFields(); paint();
      }
    }) : null;

    const subInfo = hasPortion
      ? food.kcal + " kcal por 100 g · porción típica: " + food.portion.label
      : food.kcal + " kcal por 100 g";

    const body = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "🍽️" }),
        el("div", { class: "txt", html: "<b>" + food.name + "</b><br><span style='color:var(--txt-faint)'>" + food.cat + " · " + subInfo + "</span>" })
      ]),
      fieldsWrap,
      switchLink,
      preview,
      el("button", { class: "btn primary block", style: "margin-top:16px", html: "＋ Agregar al día", onclick: () => {
        const g = currentGrams();
        if (g <= 0) { Audio.play("error"); toast({ icon: "⚠️", msg: "Indica una cantidad válida" }); return; }
        addEntry(food, g); Audio.play("coin");
        const qtyMsg = mode === "portion" && hasPortion
          ? (Number(portionsI.value) || 0) + " porción(es) · " + Math.round(g) + " g"
          : Math.round(g) + " g";
        toast({ icon: "🍽️", title: "Agregado", msg: food.name + " (" + qtyMsg + ")" });
        UI.closeModal();
        render(document.getElementById("view-nutrition"));
        N.App && N.App.refreshTop();
      } })
    ]);
    UI.openModal("Agregar " + food.name, body);
    paint();
  }

  function macroBox(label, val, unit, color) {
    return el("div", { class: "card", style: "padding:12px;text-align:center" }, [
      el("div", { class: "kpi-val", style: "font-size:22px;color:" + color, text: fmt.num(val) }),
      el("div", { class: "kpi-lbl", text: label + (unit ? " (" + unit + ")" : "") })
    ]);
  }

  // ---------------- Editar metas diarias ----------------
  function openGoals() {
    const g = goals();
    const body = UI.form([
      { name: "kcal", label: "Meta de calorías (kcal)", type: "number", min: 0, value: g.kcal, required: true },
      { type: "row", fields: [
        { name: "prot", label: "Proteínas (g)", type: "number", min: 0, value: g.prot },
        { name: "carb", label: "Carbohidratos (g)", type: "number", min: 0, value: g.carb }
      ]}
    ], (data) => {
      const gg = goals();
      gg.kcal = Math.max(0, Number(data.kcal) || 0);
      gg.prot = Math.max(0, Number(data.prot) || 0);
      gg.carb = Math.max(0, Number(data.carb) || 0);
      Store.commit();
      Audio.play("tap");
      toast({ icon: "🎯", title: "Metas guardadas", msg: gg.kcal + " kcal · P " + gg.prot + "g · C " + gg.carb + "g" });
      UI.closeModal();
      render(document.getElementById("view-nutrition"));
    }, "Guardar metas");
    UI.openModal("🎯 Metas diarias", body);
  }

  // ---------------- Historial: ver/revisar un día específico ----------------
  function openHistory() {
    const days = historyDays();
    const dateI = el("input", { class: "input", type: "date", value: today(), max: today() });
    const goBtn = el("button", { class: "btn primary block", style: "margin-top:8px", html: "🔍 Ver ese día", onclick: () => {
      if (!dateI.value) { Audio.play("error"); toast({ icon: "⚠️", msg: "Elige una fecha" }); return; }
      openDayDetail(dateI.value);
    } });

    const listWrap = el("div", { style: "margin-top:16px" });
    if (!days.length) {
      listWrap.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "📖" }), el("div", { text: "Aún no hay días registrados." })]));
    } else {
      listWrap.appendChild(el("div", { class: "card-title", style: "margin-bottom:8px", text: "Días con registro (" + days.length + ")" }));
      days.slice(0, 60).forEach((dk) => {
        const t = dayTotals(dk);
        const dLbl = DateUtil.parse(dk).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        listWrap.appendChild(el("div", { class: "item", style: "padding:10px 12px;cursor:pointer", onclick: () => openDayDetail(dk) }, [
          el("div", { class: "item-main" }, [
            el("div", { class: "item-title", style: "font-size:14px", text: dLbl + (dk === today() ? " · hoy" : "") }),
            el("div", { class: "item-meta" }, [
              el("span", { class: "chip warn", text: t.kcal + " kcal" }),
              el("span", { class: "text-faint fs-12", text: "P " + r1(t.prot) + "g · C " + r1(t.carb) + "g" })
            ])
          ]),
          el("span", { text: "›", style: "font-size:20px;color:var(--txt-faint)" })
        ]));
      });
    }

    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13", style: "margin-bottom:10px", text: "Elige una fecha para ver exactamente lo que comiste ese día (no mezclado con otros días):" }),
      el("div", { class: "field" }, [el("label", { text: "Fecha" }), dateI]),
      goBtn,
      listWrap
    ]);
    UI.openModal("📖 Historial de alimentación", body);
  }

  // detalle de UN solo día: totales de ese día exclusivamente + lista de alimentos
  function openDayDetail(dateKey) {
    const t = dayTotals(dateKey);
    const g = goals();
    const items = log().filter((x) => x.date === dateKey).slice().reverse();
    const dLbl = DateUtil.parse(dateKey).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const body = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "📅" }),
        el("div", { class: "txt", html: "Totales <b>solo de este día</b> (" + dLbl + "), sin sumar otros días." })
      ]),
      el("div", { class: "grid cols-3 mb-16" }, [
        macroBox("Calorías", t.kcal, "kcal", "var(--warn)"),
        macroBox("Proteínas", r1(t.prot), "g", "var(--good)"),
        macroBox("Carbos", r1(t.carb), "g", "var(--accent)")
      ]),
      el("div", { class: "fs-12 text-faint mb-16", text: pctOf(t.kcal, g.kcal) + "% de tu meta de calorías (" + g.kcal + " kcal) ese día." })
    ]);

    if (!items.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🍽️" }), el("div", { text: "No hay alimentos registrados este día." })]));
    } else {
      items.forEach((e) => {
        body.appendChild(el("div", { class: "item" }, [
          el("div", { class: "item-main" }, [
            el("div", { class: "item-title", text: e.name }),
            el("div", { class: "item-meta" }, [
              el("span", { class: "chip", text: e.grams + " g" }),
              el("span", { class: "chip warn", text: e.kcal + " kcal" }),
              el("span", { class: "text-faint fs-12", text: "P " + e.prot + "g · C " + e.carb + "g" })
            ])
          ]),
          el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => removeEntryFromDay(e, dateKey) })
        ]));
      });
    }
    body.appendChild(el("button", { class: "btn block mt-16", html: "📄 Descargar PDF de este día", onclick: () => { UI.closeModal(); exportPDF("day", dateKey); } }));
    UI.openModal("📖 " + dLbl, body);
  }

  // ---------------- Exportar resumen a PDF ----------------
  function openPdfModal() {
    const dateI = el("input", { class: "input", type: "date", value: today(), max: today() });
    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13", style: "margin-bottom:16px", text: "Elige el periodo del resumen de consumo a descargar en PDF:" }),
      el("button", { class: "btn primary block", style: "margin-bottom:10px", html: "📅 Diario (hoy)", onclick: () => { UI.closeModal(); exportPDF("daily"); } }),
      el("button", { class: "btn block", style: "margin-bottom:10px", html: "🗓️ Semanal (últimos 7 días)", onclick: () => { UI.closeModal(); exportPDF("weekly"); } }),
      el("button", { class: "btn block", style: "margin-bottom:16px", html: "📆 Mensual (este mes)", onclick: () => { UI.closeModal(); exportPDF("monthly"); } }),
      el("div", { class: "card", style: "padding:12px" }, [
        el("div", { class: "fs-12 fw-700 mb-8", text: "🔎 Elegir un día específico (de hace tiempo)" }),
        dateI,
        el("button", { class: "btn primary block mt-8", html: "📄 PDF de ese día", onclick: () => {
          if (!dateI.value) { Audio.play("error"); toast({ icon: "⚠️", msg: "Elige una fecha" }); return; }
          UI.closeModal(); exportPDF("day", dateI.value);
        } })
      ]),
      el("p", { class: "fs-12 text-faint", style: "margin-top:16px", html: "Se abrirá la ventana de impresión: elige <b>\"Guardar como PDF\"</b> como destino." })
    ]);
    UI.openModal("📄 Descargar PDF de alimentación", body);
  }

  function rangeFor(period, dayKey) {
    const to = today();
    let from, label;
    if (period === "day") { from = dayKey || to; return { from: from, to: from, label: "Día específico" }; }
    if (period === "daily") { from = to; label = "Diario"; }
    else if (period === "weekly") { from = DateUtil.addDays(to, -6); label = "Semanal"; }
    else {
      const d = new Date(); from = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; label = "Mensual";
    }
    return { from: from, to: to, label: label };
  }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function pctOf(v, g) { return g > 0 ? Math.round((v / g) * 100) : 0; }

  function exportPDF(period, dayKey) {
    const r = rangeFor(period, dayKey);
    const isSingleDay = r.from === r.to;
    const g = goals();
    const list = log().filter((x) => x.date >= r.from && x.date <= r.to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    // agrupar por día
    const byDay = {};
    list.forEach((x) => { (byDay[x.date] = byDay[x.date] || []).push(x); });
    const dayKeys = Object.keys(byDay).sort();

    const grand = list.reduce((t, x) => { t.kcal += x.kcal; t.prot += x.prot; t.carb += x.carb; return t; }, { kcal: 0, prot: 0, carb: 0 });
    const nDays = dayKeys.length || 1;
    const avg = { kcal: Math.round(grand.kcal / nDays), prot: r1(grand.prot / nDays), carb: r1(grand.carb / nDays) };

    const fromLbl = DateUtil.parse(r.from).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const toLbl = DateUtil.parse(r.to).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

    let rows = "";
    if (!list.length) {
      rows = '<tr><td colspan="5" style="text-align:center;color:#888;padding:24px">Sin alimentos registrados en este periodo.</td></tr>';
    } else {
      dayKeys.forEach((dk) => {
        const items = byDay[dk];
        const dt = items.reduce((t, x) => { t.kcal += x.kcal; t.prot += x.prot; t.carb += x.carb; return t; }, { kcal: 0, prot: 0, carb: 0 });
        const dLbl = DateUtil.parse(dk).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
        rows += "<tr class='dh'><td colspan='5'>" + esc(dLbl) +
          " &nbsp;·&nbsp; <b>" + dt.kcal + " kcal</b> (" + pctOf(dt.kcal, g.kcal) + "% de meta) · P " + r1(dt.prot) + "g · C " + r1(dt.carb) + "g</td></tr>";
        items.forEach((x) => {
          rows += "<tr>" +
            "<td>" + esc(x.name) + "</td>" +
            "<td style='text-align:center'>" + x.grams + " g</td>" +
            "<td style='text-align:center'>" + x.kcal + "</td>" +
            "<td style='text-align:center'>" + r1(x.prot) + "</td>" +
            "<td style='text-align:center'>" + r1(x.carb) + "</td>" +
            "</tr>";
        });
      });
    }

    const html = "<!doctype html><html lang='es'><head><meta charset='utf-8'><title>OCTANAJE · Alimentación " + r.label + "</title>" +
      "<style>" +
      "*{box-sizing:border-box;font-family:'Segoe UI',system-ui,Arial,sans-serif}" +
      "body{margin:0;padding:32px;color:#1a1a2e;background:#fff}" +
      ".hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #6a5cff;padding-bottom:14px;margin-bottom:20px}" +
      ".logo{font-size:22px;font-weight:800;letter-spacing:2px;color:#6a5cff}" +
      ".logo span{color:#00b3c4}" +
      ".sub{color:#666;font-size:13px}" +
      "h1{font-size:20px;margin:0 0 4px}" +
      ".kpis{display:flex;gap:12px;margin:18px 0;flex-wrap:wrap}" +
      ".kpi{flex:1;min-width:110px;border:1px solid #e3e3ee;border-radius:12px;padding:12px 14px}" +
      ".kpi .n{font-size:22px;font-weight:800;color:#6a5cff}" +
      ".kpi .l{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:1px}" +
      ".types{background:#f4f4fb;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:18px}" +
      "table{width:100%;border-collapse:collapse;font-size:12.5px}" +
      "th{background:#6a5cff;color:#fff;text-align:left;padding:8px 10px;font-size:12px}" +
      "th.c{text-align:center}" +
      "td{padding:7px 10px;border-bottom:1px solid #ececf4;vertical-align:top}" +
      "tr.dh td{background:#eceafe;font-size:12px;color:#4a3fd0;border-top:2px solid #d8d3fb}" +
      ".ft{margin-top:24px;color:#999;font-size:11px;text-align:center;border-top:1px solid #eee;padding-top:12px}" +
      "@media print{body{padding:0}}" +
      "</style></head><body>" +
      "<div class='hd'><div><div class='logo'>▲ OCTAN<span>AJE</span></div><div class='sub'>Salud y Disciplina</div></div>" +
      "<div style='text-align:right'><h1>Resumen de alimentación</h1><div class='sub'>" + (isSingleDay ? fromLbl : r.label + " · " + fromLbl + " → " + toLbl) + "</div></div></div>" +
      (isSingleDay
        ? "<div class='kpis'>" +
          "<div class='kpi'><div class='n'>" + grand.kcal + "</div><div class='l'>Kcal de este día</div></div>" +
          "<div class='kpi'><div class='n'>" + r1(grand.prot) + "</div><div class='l'>Proteínas (g)</div></div>" +
          "<div class='kpi'><div class='n'>" + r1(grand.carb) + "</div><div class='l'>Carbohidratos (g)</div></div>" +
          "<div class='kpi'><div class='n'>" + pctOf(grand.kcal, g.kcal) + "%</div><div class='l'>De tu meta diaria</div></div>" +
          "</div>"
        : "<div class='kpis'>" +
          "<div class='kpi'><div class='n'>" + nDays + "</div><div class='l'>Días con registro</div></div>" +
          "<div class='kpi'><div class='n'>" + grand.kcal + "</div><div class='l'>Kcal totales del periodo</div></div>" +
          "<div class='kpi'><div class='n'>" + avg.kcal + "</div><div class='l'>Kcal / día (promedio)</div></div>" +
          "<div class='kpi'><div class='n'>" + r1(grand.prot) + "</div><div class='l'>Proteínas totales (g)</div></div>" +
          "<div class='kpi'><div class='n'>" + r1(grand.carb) + "</div><div class='l'>Carbohidratos totales (g)</div></div>" +
          "</div>"
      ) +
      "<div class='types'><b>Metas diarias:</b> " + g.kcal + " kcal &nbsp;·&nbsp; " + g.prot + " g proteína &nbsp;·&nbsp; " + g.carb + " g carbohidratos" +
      (isSingleDay ? "" : " &nbsp;·&nbsp; <b>Promedio del periodo:</b> P " + avg.prot + "g · C " + avg.carb + "g") + "</div>" +
      "<table><thead><tr><th>Alimento / platillo</th><th class='c'>Cantidad</th><th class='c'>Kcal</th><th class='c'>Prot (g)</th><th class='c'>Carb (g)</th></tr></thead><tbody>" + rows +
      (isSingleDay ? "" :
        "<tr class='dh'><td><b>TOTAL DEL PERIODO (" + nDays + " día" + (nDays === 1 ? "" : "s") + ", NO es un solo día)</b></td><td></td><td style='text-align:center'><b>" + grand.kcal + "</b></td><td style='text-align:center'><b>" + r1(grand.prot) + "</b></td><td style='text-align:center'><b>" + r1(grand.carb) + "</b></td></tr>"
      ) +
      "</tbody></table>" +
      "<div class='ft'>Generado por OCTANAJE · " + new Date().toLocaleString("es-MX") + "</div>" +
      "</body></html>";

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    Audio.play("tap");
    toast({ icon: "📄", title: "Generando PDF…", msg: "Elige \"Guardar como PDF\"." });
    setTimeout(function () {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
      setTimeout(function () { iframe.remove(); }, 1500);
    }, 500);
  }

  // ---------------- Render ----------------
  function render(container) {
    container.innerHTML = "";
    const t = dayTotals(today());
    const g = goals();

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons.node("plate"), "Alimentación"]),
        el("p", { class: "view-desc", text: "Registra lo que comes y controla tus calorías y macros del día." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openGoals, html: "🎯 Metas" }),
        el("button", { class: "btn", onclick: openHistory, html: "📖 Historial" }),
        el("button", { class: "btn", onclick: openPdfModal, html: "📄 PDF" }),
        el("button", { class: "btn primary", onclick: openBrowser, html: "＋ Agregar alimento" })
      ])
    ]));

    // KPIs de hoy
    container.appendChild(el("div", { class: "grid cols-4 mb-16" }, [
      kpi("Calorías hoy", fmt.num(t.kcal), "meta " + fmt.num(g.kcal) + " kcal", "warn"),
      kpi("Proteínas", fmt.num(r1(t.prot)) + " g", "meta " + g.prot + " g", "good"),
      kpi("Carbohidratos", fmt.num(r1(t.carb)) + " g", "meta " + g.carb + " g", "accent"),
      kpi("Alimentos", log().filter((x) => x.date === today()).length + "", "registrados hoy", "accent")
    ]));

    // Medidor radial de anillos + leyenda
    const ringCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Progreso del día vs. metas"]),
        el("button", { class: "btn sm", onclick: openGoals, html: "🎯 Ajustar metas" })
      ])
    ]);
    const cv = el("canvas");
    const legend = el("div", { style: "flex:1;min-width:220px;display:flex;flex-direction:column;gap:10px;justify-content:center" });
    MACROS.forEach((m, i) => {
      const val = m.key === "kcal" ? t.kcal : r1(t[m.key]);
      const goal = g[m.key];
      legend.appendChild(legendRow(i + 1, m, val, goal));
    });
    ringCard.appendChild(el("div", { class: "flex", style: "gap:22px;align-items:center;flex-wrap:wrap" }, [
      el("div", { style: "flex:1;min-width:200px;display:flex;justify-content:center" }, [cv]),
      legend
    ]));
    container.appendChild(ringCard);
    setTimeout(() => {
      Charts.multiRing(cv, MACROS.map((m) => ({
        pct: g[m.key] > 0 ? (t[m.key] / g[m.key]) * 100 : 0,
        color: m.color
      })), { size: 230, centerLabel: fmt.num(t.kcal), centerSub: "kcal hoy" });
    }, 30);

    // Acceso rápido a favoritos (comidas más frecuentes)
    const favs = favoriteFoods();
    if (favs.length) {
      const favCard = el("div", { class: "card mb-16" }, [
        el("div", { class: "card-head" }, [
          el("div", { class: "card-title" }, [el("span", { class: "dot" }), "⭐ Favoritos"]),
          el("button", { class: "btn sm", html: "Ver todos", onclick: () => { browseCat = FAV_CAT; openBrowser(); } })
        ])
      ]);
      const chipsWrap = el("div", { class: "flex gap-8", style: "flex-wrap:wrap" });
      favs.slice(0, 10).forEach((f) => {
        chipsWrap.appendChild(el("button", {
          class: "chip accent", style: "cursor:pointer;padding:8px 14px", onclick: () => openPortion(f),
          html: "⭐ " + f.name + " · " + f.kcal + " kcal"
        }));
      });
      favCard.appendChild(chipsWrap);
      container.appendChild(favCard);
    }

    // Tendencia semanal de calorías
    const trend = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title", style: "font-size:13px" }, [el("span", { class: "dot" }), "Calorías · últimos 7 días"])])
    ]);
    const tcv = el("canvas");
    trend.appendChild(el("div", { class: "chart-box" }, [tcv]));
    container.appendChild(trend);
    setTimeout(() => Charts.bars(tcv, { labels: weekSeries("kcal").labels, series: [{ values: weekSeries("kcal").values, color: "--warn" }] }, { height: 160 }), 30);

    // Consumido hoy
    const listCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Consumido hoy"]),
        el("button", { class: "btn sm", html: "🍽️ Ver alimentos", onclick: openBrowser })
      ])
    ]);
    const todayItems = log().filter((x) => x.date === today()).slice().reverse();
    if (!todayItems.length) {
      listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🍽️" }), el("div", { text: "Aún no registras alimentos hoy." })]));
    } else {
      todayItems.forEach((e) => {
        listCard.appendChild(el("div", { class: "item" }, [
          el("div", { class: "item-main" }, [
            el("div", { class: "item-title", text: e.name }),
            el("div", { class: "item-meta" }, [
              el("span", { class: "chip", text: e.grams + " g" }),
              el("span", { class: "chip warn", text: e.kcal + " kcal" }),
              el("span", { class: "text-faint fs-12", text: "P " + e.prot + "g · C " + e.carb + "g" })
            ])
          ]),
          el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => removeEntry(e) })
        ]));
      });
    }
    container.appendChild(listCard);
  }

  // fila de la leyenda estilo infográfico (01 / macro / valor / %)
  function legendRow(idx, macro, val, goal) {
    const pct = goal > 0 ? Math.round((val / goal) * 100) : 0;
    const cvar = "var(" + macro.color + ")";
    return el("div", { class: "flex items-center gap-12", style: "padding:6px 0" }, [
      el("div", { style: "width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;color:#04122b;background:" + cvar + ";box-shadow:0 0 12px " + cvar }, [
        el("span", { text: "0" + idx })
      ]),
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", style: "font-size:14px", text: macro.label }),
        el("div", { class: "text-faint fs-12", text: fmt.num(val) + " / " + fmt.num(goal) + " " + macro.unit })
      ]),
      el("div", { style: "font-size:20px;font-weight:800;color:" + cvar, text: pct + "%" })
    ]);
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  N.Nutrition = { render, dayTotals, exportPDF };
})();
