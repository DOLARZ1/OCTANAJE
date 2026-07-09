/* =====================================================================
   NEXUS · Store — estado global + persistencia en localStorage
   ===================================================================== */
(function () {
  "use strict";

  const KEY = "nexus.state.v1";

  // ---------- utilidades de fecha ----------
  const DateUtil = {
    todayKey() { return this.key(new Date()); },
    key(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    parse(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); },
    addDays(key, n) { const d = this.parse(key); d.setDate(d.getDate() + n); return this.key(d); },
    diffDays(a, b) { return Math.round((this.parse(a) - this.parse(b)) / 86400000); },
    isYesterday(key) { return key === this.addDays(this.todayKey(), -1); },
    lastNDays(n) {
      const out = [];
      for (let i = n - 1; i >= 0; i--) out.push(this.addDays(this.todayKey(), -i));
      return out;
    },
    monthKey(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; },
    label(key) {
      const d = this.parse(key);
      return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
    },
    weekday(key) {
      return this.parse(key).toLocaleDateString("es", { weekday: "short" });
    }
  };

  // ---------- estado por defecto ----------
  function defaultState() {
    return {
      profile: { xp: 0, level: 1, createdAt: DateUtil.todayKey() },
      settings: { theme: "dark", sound: true },
      activity: {},            // { "YYYY-MM-DD": true }  días con alguna acción
      xpLog: {},               // { "YYYY-MM-DD": xpGanado }
      achievements: [],        // ids de logros desbloqueados
      habits: [],              // {id,name,icon,color,history:{date:true},created}
      finance: {
        transactions: [],      // {id,type:'income'|'expense',amount,category,note,date}
        budget: 0,             // presupuesto mensual objetivo de gasto
        savingGoal: 0          // meta de ahorro mensual
      },
      tasks: [],               // {id,title,priority,due,done,subtasks:[{t,done}],created}
      workouts: [],            // {id,name,type,duration,calories,volume,date}
      goals: []                // {id,title,target,current,unit,deadline,milestones:[{t,done}],created}
    };
  }

  // ---------- carga / guardado ----------
  let state = load();
  const subscribers = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return deepMerge(defaultState(), parsed);
    } catch (e) {
      console.warn("No se pudo cargar el estado, usando por defecto", e);
      return defaultState();
    }
  }

  function deepMerge(base, override) {
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (base && typeof base === "object") {
      const out = { ...base };
      for (const k in override) {
        out[k] = (k in base) ? deepMerge(base[k], override[k]) : override[k];
      }
      return out;
    }
    return override === undefined ? base : override;
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.error("Error al guardar", e); }
    }, 120);
  }

  function notify() { subscribers.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  // ---------- API pública ----------
  const Store = {
    DateUtil,
    get() { return state; },
    subscribe(fn) { subscribers.push(fn); return () => { const i = subscribers.indexOf(fn); if (i >= 0) subscribers.splice(i, 1); }; },

    // guardar + notificar (usar tras mutar el estado)
    commit(silent) { save(); if (!silent) notify(); },

    // registra actividad del día (para racha global)
    markActive() {
      state.activity[DateUtil.todayKey()] = true;
    },

    reset() {
      state = defaultState();
      save(); notify();
    },

    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  };

  window.NEXUS = window.NEXUS || {};
  window.NEXUS.Store = Store;
})();
