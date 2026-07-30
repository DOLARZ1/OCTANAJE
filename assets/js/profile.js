/* =====================================================================
   OCTANAJE · Profile — foto de perfil (desde el celular) + nickname
   Se muestran junto al logo en la cabecera. La foto se redimensiona a
   un cuadrado pequeño antes de guardarla (localStorage tiene límite de
   espacio, y una foto de cámara sin comprimir podría ser varios MB).
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio } = N;
  const { el, toast } = UI;

  const MAX_SIZE = 240;      // px — suficiente para un avatar circular nítido
  const MAX_NICK = 18;       // caracteres máximos del nickname

  function profile() {
    const p = Store.get().profile;
    if (p.avatar == null) p.avatar = "";
    if (p.nickname == null) p.nickname = "";
    return p;
  }

  // ---------- redimensiona la imagen elegida a un cuadrado pequeño ----------
  function fileToResizedDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error("Elige un archivo de imagen (jpg, png…)")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
        img.onload = () => {
          try {
            // recorte central cuadrado (evita deformar fotos rectangulares)
            const side = Math.min(img.width, img.height);
            const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
            const canvas = document.createElement("canvas");
            canvas.width = MAX_SIZE; canvas.height = MAX_SIZE;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_SIZE, MAX_SIZE);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          } catch (e) { reject(e); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- refresca el avatar/nickname mostrados en la cabecera ----------
  function refresh() {
    const p = profile();
    const img = document.getElementById("user-avatar-img");
    const ph = document.getElementById("user-avatar-placeholder");
    const nameEl = document.getElementById("user-badge-name");
    if (!img || !ph || !nameEl) return; // entorno sin esta UI (p.ej. pruebas)
    if (p.avatar) { img.src = p.avatar; img.hidden = false; ph.hidden = true; }
    else { img.hidden = true; ph.hidden = false; }
    nameEl.textContent = p.nickname || "Perfil";
  }

  // ---------- editor: foto + nickname ----------
  function openEditor() {
    const p = profile();
    let pendingAvatar = p.avatar || "";

    const pic = el("div", { class: "avatar-editor-pic" }, [
      pendingAvatar ? el("img", { src: pendingAvatar, alt: "" }) : el("span", { text: "👤" })
    ]);

    const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none" });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToResizedDataURL(file);
        pendingAvatar = dataUrl;
        pic.innerHTML = "";
        pic.appendChild(el("img", { src: dataUrl, alt: "" }));
        Audio.play("tap");
      } catch (e) {
        Audio.play("error");
        toast({ icon: "⚠️", title: "No se pudo usar esa imagen", msg: String(e.message || e) });
      }
    });

    const nickI = el("input", {
      class: "input", type: "text", maxlength: MAX_NICK, placeholder: "Ej. Alex, El Tigre, Fit90…", value: p.nickname || "",
      style: "font-family:'Bruno Ace','Orbitron',sans-serif;letter-spacing:.6px;text-transform:uppercase"
    });

    const body = el("div", { class: "avatar-editor" }, [
      pic,
      el("div", { class: "row" }, [
        el("button", { type: "button", class: "btn primary", html: "📷 Elegir foto", onclick: () => fileInput.click() }),
        pendingAvatar ? el("button", { type: "button", class: "btn ghost", html: "🗑️ Quitar foto", onclick: () => {
          pendingAvatar = ""; pic.innerHTML = ""; pic.appendChild(el("span", { text: "👤" }));
        } }) : null
      ]),
      fileInput,
      el("div", { class: "field", style: "width:100%;margin-top:6px" }, [
        el("label", { text: "Nickname (se muestra debajo de tu foto)" }),
        nickI
      ]),
      el("button", { class: "btn primary block mt-8", html: "💾 Guardar", onclick: () => {
        p.avatar = pendingAvatar;
        p.nickname = (nickI.value || "").trim().slice(0, MAX_NICK);
        Store.commit();
        refresh();
        Audio.play("levelup");
        toast({ icon: "✅", title: "Perfil actualizado", msg: p.nickname ? "Hola, " + p.nickname + " 👋" : "Guardado" });
        UI.closeModal();
      } })
    ]);
    UI.openModal("👤 Tu foto y nickname", body);
  }

  function bind() {
    const btn = document.getElementById("user-badge");
    if (btn) btn.addEventListener("click", () => { Audio.play("tap"); openEditor(); });
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  N.Profile = { refresh, openEditor };
})();
