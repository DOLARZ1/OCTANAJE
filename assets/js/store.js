/* =====================================================================
   OCTANAJE · Store — estado global + persistencia en localStorage y Nube
   (Con Seguro Anti-Sobrescritura y Defensa de Modo Offline)
   ===================================================================== */
(function () {
  "use strict";

  const KEY = "nexus.state.v1";
  let cloudSyncReady = false; 

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
      _lastModified: Date.now(), // ⏱️ SELLO DE TIEMPO (Nuevo)
      profile: { xp: 0, level: 1, createdAt: DateUtil.todayKey(), avatar: "", nickname: "", streak: 0 },
      settings: { theme: "dark", sound: true, notifications: false, currency: "MXN", locale: "es-MX" },
      notifyMeta: { lastReminder: "" },
      reminders: [],
      activity: {},
      xpLog: {},
      achievements: [],
      habits: [],
      finance: { transactions: [], budget: 0, savingGoal: 0, savings: [], savingsTarget: 0 },
      tasks: [],
      workouts: [],
      goals: [],
      focus: { work: 25, break: 5, longBreak: 15, longEvery: 4, sessionsCompleted: 0, focusLog: {}, sessionsLog: {} },
      nutrition: { log: [] },
      health: { profile: { name: "", sex: "F", age: null, weight: null, height: null, activity: "moderate", lastCheck: "" }, history: [], weights: [] },
      sleep: { log: [] },
      fasting: { enabled: false, plan: "16:8", customFastH: 16, eatStart: "13:00", reminders: true, lastEatNotif: "", lastFastNotif: "", log: {} }
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
      try { 
        // 1. Actualizamos la hora de modificación siempre que haya un cambio
        state._lastModified = Date.now();
        
        // 2. Guardado local ultra rápido (Offline-First)
        localStorage.setItem(KEY, JSON.stringify(state)); 
        
        // 3. Sincronización con Firebase (SOLO si no estamos bloqueados)
        if (typeof window.saveToFirebase === "function" && cloudSyncReady) {
          window.saveToFirebase(state);
        }
      }
      catch (e) { console.error("Error al guardar", e); }
    }, 120);
  }

  function notify() { subscribers.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  // ---------- API pública ----------
  const Store = {
    DateUtil,
    get() { return state; },
    subscribe(fn) { subscribers.push(fn); return () => { const i = subscribers.indexOf(fn); if (i >= 0) subscribers.splice(i, 1); }; },

    commit(silent) { save(); if (!silent) notify(); },

    markActive() {
      state.activity[DateUtil.todayKey()] = true;
    },

    reset() {
      state = defaultState();
      save(); notify();
    },

    // --- FUNCIÓN BLINDADA: Recibir datos de la nube con lógica Offline ---
    setCloudState(cloudState) {
      if (cloudState) {
        const localTime = state._lastModified || 0;
        const cloudTime = cloudState._lastModified || 0;

        if (localTime > cloudTime) {
          // 🛡️ DETECTAMOS QUE USASTE LA APP OFFLINE
          // Tu celular tiene datos más recientes. Bloqueamos la descarga y subimos tus datos a la nube.
          console.warn("Datos locales más recientes detectados. Actualizando Firebase para evitar pérdida...");
          if (typeof window.saveToFirebase === "function") {
            window.saveToFirebase(state);
          }
        } else {
          // La nube es más nueva o igual, descargamos normal.
          state = deepMerge(defaultState(), cloudState);
          localStorage.setItem(KEY, JSON.stringify(state)); 
        }
      }
      cloudSyncReady = true; 
      notify(); 
    },

    unlockCloudSync() {
        cloudSyncReady = true;
    },

    serialize() {
      return JSON.stringify(Object.assign({ _app: "OCTANAJE", _version: 1, _exportedAt: new Date().toISOString() }, state), null, 2);
    },
    import(obj) {
      if (!obj || typeof obj !== "object") throw new Error("Formato no válido");
      const src = obj.profile || obj.habits || obj.finance ? obj : obj;
      state = deepMerge(defaultState(), src);
      delete state._app; delete state._version; delete state._exportedAt;
      save(); notify();
      return true;
    },

    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  };

  window.NEXUS = window.NEXUS || {};
  window.NEXUS.Store = Store;
})();
