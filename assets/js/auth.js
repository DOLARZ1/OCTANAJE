/* =====================================================================
   OCTANAJE · Auth & Biometrics — Sistema de Autenticación por Huella y PIN
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

  // ---------- Registrar Huella en el Dispositivo ----------
  async function registerBiometrics() {
    if (!(await isBiometricSupported())) {
      toast({ icon: "⚠️", msg: "Tu dispositivo o navegador no soporta lectura de huella." });
      return false;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const creationOptions = {
        challenge: challenge,
        rp: { name: "OCTANAJE App", id: window.location.hostname },
        user: {
          id: Uint8Array.from("octanaje_user_" + Date.now(), c => c.charCodeAt(0)),
          name: "Usuario Octanaje",
          displayName: "Piloto Octanaje"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000
      };

      const credential = await navigator.credentials.create({ publicKey: creationOptions });
      if (credential) {
        const s = Store.get();
        if (!s.settings) s.settings = {};
        s.settings.bioEnabled = true;
        s.settings.bioCredId = credential.id;
        Store.commit(true);
        
        Audio.play("unlock");
        toast({ icon: "☝️", title: "Huella activada", msg: "Acceso biométrico configurado con éxito" });
        return true;
      }
    } catch (err) {
      console.error("Error registrando huella:", err);
      toast({ icon: "❌", msg: "Acción cancelada o fallo en sensor biométrico" });
    }
    return false;
  }

  // ---------- Iniciar Sesión / Desbloquear con Huella ----------
  async function authenticateBiometrics() {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const requestOptions = {
        challenge: challenge,
        timeout: 60000,
        userVerification: "required"
      };

      const assertion = await navigator.credentials.get({ publicKey: requestOptions });
      if (assertion) {
        unlockApp();
        return true;
      }
    } catch (err) {
      console.error("Error autenticando huella:", err);
      toast({ icon: "🚫", msg: "Huella no reconocida" });
    }
    return false;
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

  // ---------- Pantalla de Bloqueo Futurista (Lock Screen) ----------
  function checkLockOnBoot() {
    const s = Store.get();
    if (!s.settings || !s.settings.bioEnabled) return; // Si no está activado, continuar normal

    // Construir overlay de pantalla de bloqueo
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
      el("button", { 
        class: "btn primary", 
        style: "padding: 14px 28px; font-size: 1.1rem; border-radius: 30px; display:flex; align-items:center; gap:10px;",
        onclick: () => authenticateBiometrics() 
      }, [
        el("span", { text: "☝️" }),
        el("span", { text: "Escanear Huella / Face ID" })
      ])
    ]);

    document.body.appendChild(lockOverlay);
    
    // Solicitar la huella automáticamente al cargar
    setTimeout(() => authenticateBiometrics(), 500);
  }

  N.Auth = { isBiometricSupported, registerBiometrics, authenticateBiometrics, checkLockOnBoot };
})();
