/* =====================================================================
   OCTANAJE · Store — estado global + persistencia en localStorage
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
      settings: { theme: "dark", sound: true, notifications: false, currency: "MXN", locale: "es-MX" },
      notifyMeta: { lastReminder: "" },   // "YYYY-MM-DD" del último recordatorio enviado
      reminders: [],           // recordatorios personalizados: {id,title,message,time,days,sound,enabled,lastFired}
      activity: {},            // { "YYYY-MM-DD": true }  días con alguna acción
      xpLog: {},               // { "YYYY-MM-DD": xpGanado }
      achievements: [],        // ids de logros desbloqueados
      habits: [],              // {id,name,icon,color,history:{date:true},created}
      finance: {
        transactions: [],      // {id,type:'income'|'expense',amount,category,note,date}
        budget: 0,             // presupuesto mensual objetivo de gasto
        savingGoal: 0,         // meta de ahorro mensual
        savings: [],           // alcancía: {id,amount(+/-),date,note}
        savingsTarget: 0       // meta de la alcancía (progreso, reinicio manual)
      },
      tasks: [],               // {id,title,priority,due,done,subtasks:[{t,done}],created}
      workouts: [],            // {id,name,type,duration,calories,volume,date}
      goals: [],               // {id,title,target,current,unit,deadline,milestones:[{t,done}],created}
      focus: {                 // modo Foco / Pomodoro
        work: 25, break: 5, longBreak: 15, longEvery: 4,
        sessionsCompleted: 0,  // total histórico de sesiones de trabajo
        focusLog: {},          // { "YYYY-MM-DD": minutos enfocados }
        sessionsLog: {}        // { "YYYY-MM-DD": nº de sesiones de trabajo }
      },
      nutrition: { log: [] },  // registro de alimentos: {id,name,cat,grams,kcal,prot,carb,date}
      health: {                // biometría: perfil actual + historial de revisiones
        profile: { name: "", sex: "F", age: null, weight: null, height: null, activity: "moderate", lastCheck: "" },
        history: [],           // {id,date,weight,height,age,imc,geb,get}
        weights: []            // registro rápido de báscula: {id,date,weight,note}
      },
      sleep: { log: [] },      // registro de sueño: {id,date,period,start,end,hours,notes,xpEarned}
      fasting: {               // ayuno intermitente: plan elegido, horario y cumplimiento
        enabled: false,        // interruptor general: si está apagado, no se pide marcar cumplimiento
        plan: "16:8",          // "16:8" | "18:6" | "20:4" | "omad" | "5:2" | "custom"
        customFastH: 16,       // horas de ayuno (solo si plan === "custom")
        eatStart: "13:00",     // hora en que se abre la ventana de alimentación
        reminders: true,       // si ya se crearon recordatorios en el calendario del sistema
        log: {}                // { "YYYY-MM-DD": { done:true/false, plan:"16:8", note:"" } }
      }
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

    // ---------- exportar / importar ----------
    serialize() {
      return JSON.stringify(Object.assign({ _app: "OCTANAJE", _version: 1, _exportedAt: new Date().toISOString() }, state), null, 2);
    },
    import(obj) {
      if (!obj || typeof obj !== "object") throw new Error("Formato no válido");
      // aceptar el objeto de estado directamente o uno con metadatos
      const src = obj.profile || obj.habits || obj.finance ? obj : obj;
      state = deepMerge(defaultState(), src);
      // limpiar metadatos de exportación si vinieron
      delete state._app; delete state._version; delete state._exportedAt;
      save(); notify();
      return true;
    },

    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  };

  window.NEXUS = window.NEXUS || {};
  window.NEXUS.Store = Store;
})();
