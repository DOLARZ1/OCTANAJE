/* =====================================================================
   NEXUS · Módulo Tareas
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const PRIO = { high: { label: "Alta", chip: "bad", xp: 15 }, medium: { label: "Media", chip: "warn", xp: 10 }, low: { label: "Baja", chip: "accent", xp: 6 } };

  function tasks() { return Store.get().tasks; }
  let filter = "active";

  function completeTask(t) {
    t.done = !t.done;
    if (t.done) {
      t.doneAt = DateUtil.todayKey();
      Audio.play("complete");
      Gami.award(PRIO[t.priority].xp, "Tarea completada");
    } else {
      Audio.play("tap");
      Gami.remove(PRIO[t.priority].xp);
      Store.commit();
    }
    render(document.getElementById("view-tasks"));
    N.App && N.App.refreshTop();
  }

  function toggleSub(t, sub) {
    sub.done = !sub.done;
    Audio.play(sub.done ? "coin" : "tap");
    // completar automáticamente si todas las subtareas están hechas
    if (t.subtasks.length && t.subtasks.every((s) => s.done) && !t.done) { completeTask(t); return; }
    Store.commit();
    render(document.getElementById("view-tasks"));
  }

  function addOrEdit(existing) {
    const body = UI.form([
      { name: "title", label: "Tarea", value: existing ? existing.title : "", placeholder: "Terminar informe mensual", required: true },
      { type: "row", fields: [
        { name: "priority", label: "Prioridad", type: "select", value: existing ? existing.priority : "medium", options: [
          { value: "high", label: "🔴 Alta" }, { value: "medium", label: "🟡 Media" }, { value: "low", label: "🔵 Baja" }
        ]},
        { name: "due", label: "Fecha límite", type: "date", value: existing ? existing.due || "" : "" }
      ]},
      { name: "subtasks", label: "Subtareas (una por línea)", type: "textarea", value: existing ? existing.subtasks.map((s) => s.t).join("\n") : "", placeholder: "Investigar\nRedactar\nRevisar" }
    ], (data) => {
      const subs = (data.subtasks || "").split("\n").map((s) => s.trim()).filter(Boolean).map((t) => ({ t, done: false }));
      if (existing) {
        existing.title = data.title; existing.priority = data.priority; existing.due = data.due;
        // preservar estado de subtareas existentes por texto
        existing.subtasks = subs.map((ns) => { const prev = existing.subtasks.find((os) => os.t === ns.t); return prev || ns; });
        toast({ icon: "✏️", msg: "Tarea actualizada" });
      } else {
        tasks().push({ id: Store.uid(), title: data.title, priority: data.priority, due: data.due, done: false, subtasks: subs, created: DateUtil.todayKey() });
        Audio.play("add");
        toast({ icon: "✓", title: "Nueva tarea", msg: data.title });
      }
      Store.commit();
      UI.closeModal();
      render(document.getElementById("view-tasks"));
    }, existing ? "Guardar" : "Crear tarea");
    UI.openModal(existing ? "Editar tarea" : "Nueva tarea", body);
  }

  function remove(t) {
    const arr = tasks(); arr.splice(arr.indexOf(t), 1);
    Store.commit(); Audio.play("delete");
    render(document.getElementById("view-tasks"));
    N.App && N.App.refreshTop();
  }

  // ---------- stats ----------
  function stats() {
    const arr = tasks();
    const done = arr.filter((t) => t.done).length;
    const pending = arr.length - done;
    const overdue = arr.filter((t) => !t.done && t.due && t.due < DateUtil.todayKey()).length;
    return { total: arr.length, done, pending, overdue, pct: arr.length ? Math.round((done / arr.length) * 100) : 0 };
  }
  function completed7() {
    const days = DateUtil.lastNDays(7);
    return { labels: days.map((d) => DateUtil.weekday(d)), values: days.map((d) => tasks().filter((t) => t.done && t.doneAt === d).length) };
  }

  function dueLabel(t) {
    if (!t.due) return null;
    const diff = DateUtil.diffDays(t.due, DateUtil.todayKey());
    if (diff < 0) return { text: "Vencida", cls: "bad" };
    if (diff === 0) return { text: "Hoy", cls: "warn" };
    if (diff === 1) return { text: "Mañana", cls: "warn" };
    return { text: DateUtil.label(t.due), cls: "" };
  }

  function render(container) {
    container.innerHTML = "";
    const st = stats();

    const head = el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [el("span", { class: "ico", text: "✓" }), "Tareas"]),
        el("p", { class: "view-desc", text: "Organiza tu día por prioridad y completa con subtareas." })
      ]),
      el("button", { class: "btn primary", onclick: () => addOrEdit(null), html: "＋ Nueva tarea" })
    ]);
    container.appendChild(head);

    container.appendChild(el("div", { class: "grid cols-4 mb-16" }, [
      kpi("Pendientes", st.pending + "", "por hacer", "accent"),
      kpi("Completadas", st.done + "", "en total", "good"),
      kpi("Vencidas", st.overdue + "", "atrasadas", st.overdue ? "bad" : ""),
      kpi("Progreso", fmt.pct(st.pct), "completado", st.pct >= 70 ? "good" : "warn")
    ]));

    // gráfica
    const chartCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Tareas completadas · últimos 7 días"])])
    ]);
    const cv = el("canvas");
    chartCard.appendChild(el("div", { class: "chart-box" }, [cv]));
    container.appendChild(chartCard);
    setTimeout(() => Charts.line(cv, completed7(), { height: 160, color: "--good" }), 30);

    // filtros
    const seg = el("div", { class: "seg mb-16" });
    [["active", "Activas"], ["all", "Todas"], ["done", "Hechas"]].forEach(([k, lb]) => {
      seg.appendChild(el("button", { class: filter === k ? "on" : "", text: lb, onclick: () => { filter = k; Audio.play("tab"); render(container); } }));
    });
    container.appendChild(seg);

    // lista
    let arr = tasks().slice();
    if (filter === "active") arr = arr.filter((t) => !t.done);
    if (filter === "done") arr = arr.filter((t) => t.done);
    const order = { high: 0, medium: 1, low: 2 };
    arr.sort((a, b) => (a.done - b.done) || (order[a.priority] - order[b.priority]) || ((a.due || "9999") .localeCompare(b.due || "9999")));

    const listCard = el("div", { class: "card" });
    if (!arr.length) {
      listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "✓" }), el("div", { text: filter === "done" ? "Aún no completas tareas." : "Sin tareas. ¡Añade una!" })]));
    } else {
      arr.forEach((t) => listCard.appendChild(taskItem(t)));
    }
    container.appendChild(listCard);
  }

  function taskItem(t) {
    const p = PRIO[t.priority];
    const due = dueLabel(t);
    const subDone = t.subtasks.filter((s) => s.done).length;

    const item = el("div", { class: "item" + (t.done ? " done" : ""), style: "flex-direction:column;align-items:stretch" });
    const topRow = el("div", { class: "flex items-center gap-12" }, [
      el("button", { class: "check" + (t.done ? " on" : ""), html: t.done ? "✓" : "", onclick: () => completeTask(t) }),
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: t.title }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip " + p.chip, text: p.label }),
          due ? el("span", { class: "chip " + due.cls, text: "📅 " + due.text }) : null,
          t.subtasks.length ? el("span", { class: "text-faint fs-12", text: `${subDone}/${t.subtasks.length} subtareas` }) : null
        ])
      ]),
      el("div", { class: "flex gap-8" }, [
        el("button", { class: "icon-btn", html: "✏️", title: "Editar", onclick: () => addOrEdit(t) }),
        el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => remove(t) })
      ])
    ]);
    item.appendChild(topRow);

    if (t.subtasks.length) {
      const subWrap = el("div", { style: "margin:10px 0 2px 42px;display:flex;flex-direction:column;gap:6px" });
      t.subtasks.forEach((s) => {
        subWrap.appendChild(el("div", { class: "flex items-center gap-8", style: "cursor:pointer", onclick: () => toggleSub(t, s) }, [
          el("span", { style: "font-size:14px;color:" + (s.done ? "var(--good)" : "var(--txt-faint)"), text: s.done ? "☑" : "☐" }),
          el("span", { class: "fs-13", style: s.done ? "text-decoration:line-through;color:var(--txt-faint)" : "", text: s.t })
        ]));
      });
      item.appendChild(subWrap);
      const pct = Math.round((subDone / t.subtasks.length) * 100);
      item.appendChild(el("div", { class: "progress", style: "margin-left:42px;width:calc(100% - 42px)" }, [el("span", { style: `width:${pct}%` })]));
    }
    return item;
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  N.Tasks = { render, stats, completed7 };
})();
