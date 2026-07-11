/* =====================================================================
   NEXUS · App — orquestador principal
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, Audio, UI, Gami } = N;
  const { $, $$ } = UI;

  const VIEWS = {
    dashboard: N.Dashboard,
    habits: N.Habits,
    finance: N.Finance,
    tasks: N.Tasks,
    workouts: N.Workouts,
    goals: N.Goals,
    focus: N.Focus,
    nutrition: N.Nutrition
  };
  let current = "dashboard";

  // ---------- Temas ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    Store.get().settings.theme = theme;
    Store.commit(true);
  }

  // ---------- Barra superior ----------
  function refreshTop() {
    const s = Store.get();
    const lp = Gami.levelProgress();
    $("#level-badge").textContent = lp.level;
    $("#rank-name").textContent = Gami.rankName(lp.level);
    $("#xp-text").textContent = `${UI.fmt.num(lp.into)} / ${UI.fmt.num(lp.span)} XP`;
    $("#xp-fill").style.width = lp.pct + "%";
    const streak = Gami.globalStreak();
    $("#streak-days").textContent = streak;
    const medal = Gami.medalForStreak(streak);
    const badge = $("#medal-badge");
    if (badge) {
      badge.className = "medal-badge medal-" + medal.cls;
      badge.innerHTML = Gami.medalBadgeSvg(medal);
      badge.title = medal.name + " · racha " + streak + " día" + (streak === 1 ? "" : "s");
    }
  }

  // ---------- Router ----------
  function switchView(name, silent) {
    if (!VIEWS[name]) return;
    current = name;
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.view === name));
    $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === "view-" + name));
    if (!silent) Audio.play("tab");
    renderCurrent();
  }

  function renderCurrent() {
    const container = document.getElementById("view-" + current);
    if (container && VIEWS[current]) VIEWS[current].render(container);
    refreshTop();
  }

  // ---------- Eventos ----------
  function bind() {
    // gesto inicial desbloquea audio
    document.body.addEventListener("pointerdown", () => Audio.unlock(), { once: true });

    $("#tabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (tab) switchView(tab.dataset.view);
    });

    const setBtn = $("#settings-btn");
    if (setBtn) setBtn.addEventListener("click", () => { Audio.play("tap"); if (N.Settings) N.Settings.open(); });

    $("#modal-close").addEventListener("click", UI.closeModal);
    $("#modal-overlay").addEventListener("click", (e) => { if (e.target.id === "modal-overlay") UI.closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") UI.closeModal(); });

    // redibujar gráficas al cambiar tamaño
    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderCurrent, 250); });
  }

  // ---------- Init ----------
  function init() {
    const s = Store.get();
    applyTheme(s.settings.theme || "dark");
    bind();
    Gami.checkAchievements();
    if (N.Notify) N.Notify.init();
    switchView("dashboard", true);

    // mostrar la app cuanto antes y ocultar el arranque
    $("#app").hidden = false;
    setTimeout(() => {
      const boot = $("#boot-screen");
      if (boot) {
        boot.classList.add("hide");
        setTimeout(() => boot.remove(), 350);
      }
    }, 450);
  }

  // ---------- Service Worker (PWA) ----------
  // Solo en http/https (no en file://). Habilita instalación y uso offline.
  function registerSW() {
    try {
      if (typeof location !== "undefined" && /^https?:$/.test(location.protocol) &&
          typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      }
    } catch (e) {}
  }

  N.App = { refreshTop, switchView, renderCurrent, applyTheme };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  registerSW();
})();
