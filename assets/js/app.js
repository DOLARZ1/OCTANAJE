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
    goals: N.Goals
  };
  let current = "dashboard";

  // ---------- Temas ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    Store.get().settings.theme = theme;
    Store.commit(true);
    $$(".th-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.themeSet === theme));
  }

  // ---------- Barra superior ----------
  function refreshTop() {
    const s = Store.get();
    const lp = Gami.levelProgress();
    $("#level-badge").textContent = lp.level;
    $("#rank-name").textContent = Gami.rankName(lp.level);
    $("#xp-text").textContent = `${UI.fmt.num(lp.into)} / ${UI.fmt.num(lp.span)} XP`;
    $("#xp-fill").style.width = lp.pct + "%";
    $("#streak-days").textContent = Gami.globalStreak();
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

    $$(".th-btn").forEach((b) => b.addEventListener("click", () => { applyTheme(b.dataset.themeSet); Audio.play("tap"); }));

    const soundBtn = $("#sound-toggle");
    soundBtn.addEventListener("click", () => {
      const on = Audio.toggle();
      soundBtn.textContent = on ? "🔊" : "🔇";
      UI.toast({ icon: on ? "🔊" : "🔇", msg: on ? "Sonidos activados" : "Sonidos silenciados" });
    });

    $("#modal-close").addEventListener("click", UI.closeModal);
    $("#modal-overlay").addEventListener("click", (e) => { if (e.target.id === "modal-overlay") UI.closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") UI.closeModal(); });

    $("#reset-data").addEventListener("click", () => {
      UI.confirmBox("Reiniciar datos", "Se borrarán TODOS tus datos (hábitos, finanzas, tareas, entrenamientos, metas y XP). Esta acción no se puede deshacer.", () => {
        Store.reset();
        Audio.play("delete");
        UI.toast({ icon: "♻️", msg: "Datos reiniciados" });
        renderCurrent();
      }, "Borrar todo");
    });

    // redibujar gráficas al cambiar tamaño
    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderCurrent, 250); });
  }

  // ---------- Init ----------
  function init() {
    const s = Store.get();
    applyTheme(s.settings.theme || "dark");
    $("#sound-toggle").textContent = Audio.isEnabled() ? "🔊" : "🔇";
    bind();
    Gami.checkAchievements();
    switchView("dashboard", true);

    // ocultar boot
    setTimeout(() => {
      $("#boot-screen").classList.add("hide");
      $("#app").hidden = false;
      setTimeout(() => $("#boot-screen").remove(), 700);
    }, 1400);
  }

  N.App = { refreshTop, switchView, renderCurrent };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
