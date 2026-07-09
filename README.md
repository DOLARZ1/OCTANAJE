# ⬡ NEXUS · Personal OS

Aplicación web **futurista de productividad personal**: hábitos, finanzas con IA, tareas, entrenamientos y metas — con **rachas**, **XP/niveles**, **gráficas en tiempo real**, **sonidos** y **3 temas** (claro, oscuro y gris).

Hecha en **HTML, CSS y JavaScript puro**, sin dependencias ni paso de build. Funciona offline: solo abre `index.html`.

🌐 **App en vivo:** https://dolarz1.github.io/NEXUS/

![tech](https://img.shields.io/badge/stack-Vanilla%20JS-00e5ff) ![deps](https://img.shields.io/badge/dependencias-0-7c5cff)

---

## ✨ Características

### Módulos (pestañas)
- **◎ Panel** — resumen general: KPIs, XP de los últimos 14 días, anillo de nivel, actividad combinada, gasto por categoría y logros.
- **✦ Hábitos** — marcado diario, racha 🔥, récord, heatmap de 35 días y % de cumplimiento a 30 días.
- **◈ Finanzas IA** — registro de ingresos/gastos y un **asistente que analiza tus datos al instante**: tasa de ahorro, categoría dominante, proyección de fin de mes, tendencia mensual, alerta de suscripciones, meta de ahorro y un **score de salud financiera (0–100)**.
- **✓ Tareas** — prioridades, subtareas con progreso, fechas límite y filtros.
- **⚡ Entreno** — sesiones por tipo, minutos, calorías, racha y gráfica de volumen.
- **◉ Metas** — anillos de progreso, hitos y celebración al completar.

### Transversal
- 🎨 **3 temas**: claro ☀️, oscuro 🌙 y gris ◐ (se recuerda tu elección).
- 🔊 **Sonidos** sintetizados con la Web Audio API (con botón de silencio).
- 📊 **Graficado inmediato** con motor propio en Canvas (líneas, barras, dona, anillos, sparklines).
- 🏆 **Gamificación**: XP, niveles con rangos, rachas y 11 logros desbloqueables.
- 💾 **Persistencia local** con `localStorage` (tus datos no salen de tu navegador).

---

## 🚀 Uso

1. Descarga o clona el repositorio.
2. Abre `index.html` en tu navegador.

No requiere servidor ni instalación. Si prefieres servirlo:

```bash
# Python
python3 -m http.server 8080
# luego abre http://localhost:8080
```

---

## 🗂️ Estructura

```
index.html
assets/
  css/styles.css          # temas + diseño futurista
  js/
    store.js              # estado + persistencia (localStorage)
    audio.js              # motor de sonido (Web Audio API)
    charts.js             # motor de gráficas (Canvas)
    ui.js                 # helpers de DOM, toasts, modales, formularios
    gamification.js       # XP, niveles, rachas, logros
    app.js                # orquestador: router de pestañas, temas, boot
    modules/
      dashboard.js
      habits.js
      finance.js          # incluye el motor de análisis financiero
      tasks.js
      workouts.js
      goals.js
test/
  harness.js              # prueba de integración (simula el navegador con Node)
```

---

## 🧪 Pruebas

```bash
node test/harness.js
```

Valida la carga de todos los scripts, el motor de IA financiera, la gamificación, el render de las 6 vistas y la persistencia.

---

Hecho con ⬡ por NEXUS.
