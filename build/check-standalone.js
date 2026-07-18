/* Extrae el <script> embebido de octanaje.html y valida su sintaxis como un todo */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const html = fs.readFileSync(path.resolve(__dirname, "..", "octanaje.html"), "utf8");

// tomar el último bloque <script> ... </script> (el de la app)
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!matches.length) { console.error("No se encontró bloque <script> embebido"); process.exit(1); }
const js = matches[matches.length - 1][1];
fs.writeFileSync(path.resolve(__dirname, "combined.js"), js);
console.log("Bloque JS embebido: " + js.split("\n").length + " líneas");
try {
  new vm.Script(js, { filename: "octanaje.html <script>" });
  console.log("✔ Sintaxis del bloque combinado: OK");
} catch (e) {
  console.error("✗ ERROR DE SINTAXIS en el bloque combinado:");
  console.error("   " + e.message);
  process.exit(2);
}

// Verifica que TODOS los módulos de assets/js/modules/ estén incluidos en
// el bundle embebido — evita que un módulo nuevo se quede fuera de
// octanaje.html si se olvida agregarlo a la lista jsFiles de
// make-standalone.js (pasó exactamente eso con fasting.js).
const modulesDir = path.resolve(__dirname, "..", "assets", "js", "modules");
const moduleFiles = fs.readdirSync(modulesDir).filter((f) => f.endsWith(".js"));
let missing = [];
moduleFiles.forEach((f) => {
  const src = fs.readFileSync(path.join(modulesDir, f), "utf8");
  // buscamos una línea característica y única del archivo (la primera línea con "N.XXX =")
  const exportMatch = src.match(/N\.(\w+)\s*=/);
  if (exportMatch && !js.includes("N." + exportMatch[1] + " =")) missing.push(f + " (N." + exportMatch[1] + ")");
});
if (missing.length) {
  console.error("✗ Módulo(s) faltantes en el bundle embebido de octanaje.html: " + missing.join(", "));
  console.error("   Revisa la lista 'jsFiles' en build/make-standalone.js");
  process.exit(3);
}
console.log("✔ Todos los módulos de assets/js/modules/ (" + moduleFiles.length + ") están incluidos en el bundle");
