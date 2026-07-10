/* Genera un único archivo nexus.html con CSS y JS incrustados */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

const css = fs.readFileSync(path.join(root, "assets/css/styles.css"), "utf8");
const jsFiles = [
  "assets/js/store.js", "assets/js/audio.js", "assets/js/charts.js", "assets/js/ui.js",
  "assets/js/icons.js",
  "assets/js/gamification.js", "assets/js/modules/dashboard.js", "assets/js/modules/habits.js",
  "assets/js/modules/finance.js", "assets/js/modules/tasks.js", "assets/js/modules/workouts.js",
  "assets/js/modules/goals.js", "assets/js/modules/focus.js", "assets/js/notifications.js",
  "assets/js/calexport.js", "assets/js/settings.js", "assets/js/app.js"
];
const js = jsFiles.map((f) => "/* ===== " + f + " ===== */\n" + fs.readFileSync(path.join(root, f), "utf8")).join("\n\n");

let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
// IMPORTANTE: se usan funciones de reemplazo para que las secuencias como
// "$$" o "$&" dentro del CSS/JS NO se interpreten como patrones especiales
// de String.replace (ese bug convertía "$$" en "$" y rompía el script).
// quitar el <link> de CSS e inyectar <style>
html = html.replace(/<link rel="stylesheet" href="assets\/css\/styles.css" \/>/, () => "<style>\n" + css + "\n</style>");
// quitar todos los <script src=...>
html = html.replace(/\s*<script src="assets\/js\/[^"]+"><\/script>/g, "");
// inyectar un único <script> con todo el JS
html = html.replace(/<\/body>/, () => "  <script>\n" + js + "\n  </script>\n</body>");

fs.writeFileSync(path.join(root, "nexus.html"), html, "utf8");
console.log("nexus.html generado: " + fs.statSync(path.join(root, "nexus.html")).size + " bytes, " + html.split("\n").length + " líneas");
