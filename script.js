(() => {
  const PASSWORD = "0202";
  const AUTH_KEY = "valentine_auth_v1";

  let didInit = false;
  let fireworksIntervalId = null;

  function isAuthed() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setUnlocked(value) {
    document.documentElement.classList.toggle("unlocked", value);
  }

  function ensureGate() {
    let overlay = document.querySelector("[data-gate]");

    // yes.html 등에서 게이트 마크업이 없다면 주입
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "gate";
      overlay.setAttribute("data-gate", "");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "gateTitle");

      overlay.innerHTML = `
        <div class="gate-card" data-gate-card>
          <h2 class="gate-title" id="gateTitle">비밀번호 입력</h2>
          <p class="gate-sub">공유받은 사람만 들어올 수 있어요.</p>
          <form class="gate-form" data-gate-form autocomplete="off">
            <label class="sr-only" for="gatePassword">Password</label>
            <input
              id="gatePassword"
              class="gate-input"
              data-gate-input
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="4"
              placeholder="****"
              aria-describedby="gateError"
            />
            <button class="btn btn-yes gate-btn" type="submit">입장</button>
          </form>
          <p class="gate-error" id="gateError" data-gate-error aria-live="polite"></p>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const form = overlay.querySelector("[data-gate-form]");
    const input = overlay.querySelector("[data-gate-input]");
    const error = overlay.querySelector("[data-gate-error]");
    const card = overlay.querySelector("[data-gate-card]");

    return { overlay, form, input, error, card };
  }

  function initAfterAuth() {
    if (didInit) return;
    didInit = true;

    initIndexInteractions();
    initFireworks();
  }

  function unlock() {
    try {
      sessionStorage.setItem(AUTH_KEY, "1");
    } catch { /* ignore */ }

    setUnlocked(true);
    initAfterAuth();
  }

  function lock() {
    setUnlocked(false);
  }

  const gate = ensureGate();

  gate.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const value = (gate.input.value || "").trim();

    if (value === PASSWORD) {
      gate.error.textContent = "";
      gate.input.value = "";
      unlock();
      return;
    }

    gate.error.textContent = "틀렸어요";
    gate.input.value = "";

    gate.card.classList.remove("shake");
    void gate.card.offsetWidth;
    gate.card.classList.add("shake");

    gate.input.focus({ preventScroll: true });
  });

  gate.input.addEventListener("input", () => {
    gate.error.textContent = "";
    gate.card.classList.remove("shake");
  });

  if (isAuthed()) unlock();
  else lock();

  document.addEventListener("DOMContentLoaded", () => {
    if (!isAuthed()) gate.input.focus({ preventScroll: true });
  });

  /* 홈: No 버튼 도망 + 점점 빨라짐 */
  function initIndexInteractions() {
    const yesBtn = document.getElementById("yesBtn");
    const noBtn = document.getElementById("noBtn");

    if (!yesBtn || !noBtn) return;

    yesBtn.addEventListener("click", () => {
      window.location.href = "yes.html";
    });

    let pinnedToViewport = false;
    let escapeCount = 0;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    window.addEventListener("mousemove", (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });

    window.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) {
        pointer.x = e.touches[0].clientX;
        pointer.y = e.touches[0].clientY;
      }
    }, { passive: true });

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function pinElementToViewport(el) {
      const rect = el.getBoundingClientRect();
      el.style.position = "fixed";
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.margin = "0";
      el.style.zIndex = "9999";
      el.style.touchAction = "none";
    }

    function setEscapeSpeed(el) {
      const base = 140;
      const min = 35;
      const dur = clamp(base - escapeCount * 8, min, base);
      el.style.transition = `left ${dur}ms ease, top ${dur}ms ease, transform ${dur}ms ease`;
      return dur;
    }

    function pickRandomSpot(el, avoidX, avoidY) {
      const padding = 20; // ← 모바일 가장자리 안전 여백(기존 16)

      const rect = el.getBoundingClientRect();
      const w = rect.width || el.offsetWidth || 120;
      const h = rect.height || el.offsetHeight || 48;

      const maxX = Math.max(padding, window.innerWidth - w - padding);
      const maxY = Math.max(padding, window.innerHeight - h - padding);

      const avoidRadius = clamp(120 + escapeCount * 8, 120, 360);
      const attempts = 25;

      for (let i = 0; i < attempts; i++) {
        const x = Math.floor(Math.random() * (maxX - padding + 1)) + padding;
        const y = Math.floor(Math.random() * (maxY - padding + 1)) + padding;

        const dx = x + w / 2 - avoidX;
        const dy = y + h / 2 - avoidY;
        const dist = Math.hypot(dx, dy);

        if (dist >= avoidRadius) return { x, y };
      }

      return {
        x: Math.floor(Math.random() * (maxX - padding + 1)) + padding,
        y: Math.floor(Math.random() * (maxY - padding + 1)) + padding
      };
    }

    function moveTo(el, x, y) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      el.style.transform = "scale(1.08)";
      setTimeout(() => { el.style.transform = "scale(1)"; }, 80);
    }

    function runAway() {
      escapeCount++;

      if (!pinnedToViewport) {
        pinElementToViewport(noBtn);
        pinnedToViewport = true;
      }

      const dur = setEscapeSpeed(noBtn);
      const hops = clamp(1 + Math.floor(escapeCount / 3), 1, 6);

      for (let i = 0; i < hops; i++) {
        setTimeout(() => {
          const { x, y } = pickRandomSpot(noBtn, pointer.x, pointer.y);
          moveTo(noBtn, x, y);
        }, i * Math.floor(dur * 0.75));
      }
    }

    noBtn.addEventListener("mouseenter", runAway);
    noBtn.addEventListener("click", (e) => {
      e.preventDefault();
      runAway();
    });

    noBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      runAway();
    }, { passive: false });

    window.addEventListener("resize", () => {
      if (pinnedToViewport) runAway();
    });
  }

  /* yes.html: 폭죽 */
  function initFireworks() {
    const stage = document.querySelector("[data-fireworks]");
    if (!stage) return;

    const EMOJIS = ["🎆", "🎇"];
    let running = true;

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function spawnFirework() {
      if (!running) return;

      const el = document.createElement("span");
      el.className = "firework";
      el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

      const x = rand(8, 92);
      const y = rand(55, 92);

      const size = Math.floor(rand(34, 72));
      const dur = Math.floor(rand(1400, 2600));
      const rot = `${Math.floor(rand(-25, 25))}deg`;
      const lift = `${Math.floor(rand(120, 240))}px`;

      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.style.setProperty("--size", `${size}px`);
      el.style.setProperty("--dur", `${dur}ms`);
      el.style.setProperty("--rot", rot);
      el.style.setProperty("--lift", lift);

      stage.appendChild(el);
      setTimeout(() => el.remove(), dur + 80);
    }

    for (let i = 0; i < 18; i++) setTimeout(spawnFirework, i * 70);

    fireworksIntervalId = window.setInterval(() => {
      const burst = Math.floor(rand(1, 4));
      for (let i = 0; i < burst; i++) spawnFirework();
    }, 260);

    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
    });

    window.addEventListener("beforeunload", () => {
      if (fireworksIntervalId) clearInterval(fireworksIntervalId);
    });
  }
})();