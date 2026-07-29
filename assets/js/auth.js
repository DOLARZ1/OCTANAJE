/* =====================================================================
   OCTANAJE · Auth & Biometrics — Seguridad por Huella y PIN de Respaldo
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio } = N;
  const { el, toast } = UI;

  // Comprobar soporte de WebAuthn / Sensor Biométrico
  async function isBiometricSupported() {
    return (
      window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  }

  function bufferFromBase64Url(base64url) {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  }

  // ---------- Registrar Huella + PIN de Respaldo ----------
  async function registerBiometrics() {
    if (!(await isBiometricSupported())) {
      toast({ icon: "⚠️", msg: "Tu dispositivo no soporta lectura biométrica." });
      return false;
    }

    const s = Store.get();
    
    // Pedir crear un PIN de respaldo obligatorio
    const pin = prompt("Crea un PIN de respaldo de 4 o 6 dígitos (por si la huella falla):");
    if (!pin || pin.trim().length < 4) {
      toast({ icon: "⚠️", msg: "Debes asignar un PIN de respaldo válido." });
      return false;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const creationOptions = {
        challenge: challenge,
        rp: { name: "OCTANAJE App", id: window.location.hostname },
        user: {
          id: Uint8Array.from("octanaje_user_id", c => c.charCodeAt(0)),
          name: "Usuario Octanaje",
          displayName: "Piloto Octanaje"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000
      };

      const credential = await navigator.credentials.create({ publicKey: creationOptions });
      if (credential) {
        if (!s.settings) s.settings = {};
        s.settings.bioEnabled = true;
        s.settings.bioRawId = credential.id;
        s.settings.bioPin = pin.trim(); // 👈 Guardamos el PIN de respaldo
        Store.commit(true);
        
        Audio.play("unlock");
        toast({ icon: "☝️", title: "Seguridad Activada", msg: "Huella y PIN de respaldo configurados" });
        return true;
      }
    } catch (err) {
      console.error("Error registrando huella:", err);
      toast({ icon: "❌", msg: "Acción cancelada o fallo biométrico" });
    }
    return false;
  }

  // ---------- Autenticar con Huella ----------
  async function authenticateBiometrics() {
    const s = Store.get();
    const rawId = s.settings ? s.settings.bioRawId : null;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const requestOptions = {
        challenge: challenge,
        timeout: 60000,
        userVerification: "required"
      };

      if (rawId) {
        requestOptions.allowCredentials = [{
          id: bufferFromBase64Url(rawId),
          type: 'public-key'
        }];
      }

      const assertion = await navigator.credentials.get({ publicKey: requestOptions });
      if (assertion) {
        unlockApp();
        return true;
      }
    } catch (err) {
      console.error("Error en huella:", err);
      toast({ icon: "🚫", msg: "Huella no reconocida" });
    }
    return false;
  }

  // ---------- Autenticar con PIN de Respaldo ----------
  function promptBackupPin() {
    const s = Store.get();
    const savedPin = s.settings ? s.settings.bioPin : null;

    const inputPin = prompt("Introduce tu PIN de respaldo:");
    if (inputPin && inputPin.trim() === savedPin) {
      unlockApp();
      toast({ icon: "🔓", msg: "Acceso concedido por PIN" });
    } else {
      toast({ icon: "❌", msg: "PIN incorrecto. Acceso denegado." });
    }
  }

  // ---------- Desbloquear la App ----------
  function unlockApp() {
    const lockScreen = document.getElementById("lock-screen");
    if (lockScreen) {
      lockScreen.classList.add("hide");
      setTimeout(() => lockScreen.remove(), 400);
    }
    Audio.play("unlock");
  }

  // ---------- Pantalla de Bloqueo Segura ----------
  function checkLockOnBoot() {
    const s = Store.get();
    if (!s.settings || !s.settings.bioEnabled) return;

    const lockOverlay = el("div", { id: "lock-screen", style: `
      position: fixed; inset: 0; z-index: 9999;
      background: #060814; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px;
      backdrop-filter: blur(20px);
    ` }, [
      el("div", { style: "text-align:center;" }, [
        el("div", { style: "font-size: 3rem; margin-bottom: 10px;", text: "🔒" }),
        el("h2", { style: "font-family:'Orbitron', sans-serif; color:var(--fg, #fff); margin:0;", text: "OCTANAJE BLOQUEADO" }),
        el("p", { style: "opacity: 0.7; font-size:0.9rem; margin-top:6px;", text: "Confirma tu identidad para acceder" })
      ]),
      el("div", { style: "display:flex; flex-direction:column; gap:12px; align-items:center;" }, [
        el("button", { 
          class: "btn primary", 
          style: "padding: 14px 28px; font-size: 1.1rem; border-radius: 30px; display:flex; align-items:center; gap:10px;",
          onclick: () => authenticateBiometrics() 
        }, [
          el("span", { text: "☝️" }),
          el("span", { text: "Escanear Huella / Face ID" })
        ]),
        // Botón seguro de respaldo: Pide el PIN en vez de desbloquear directo
        el("button", {
          class: "btn ghost sm",
          style: "opacity:0.8; margin-top:6px;",
          text: "🔑 Usar PIN de respaldo",
          onclick: () => promptBackupPin()
        })
      ])
    ]);

    document.body.appendChild(lockOverlay);
    setTimeout(() => authenticateBiometrics(), 500);
  }

  N.Auth = { isBiometricSupported, registerBiometrics, authenticateBiometrics, checkLockOnBoot };
})();
