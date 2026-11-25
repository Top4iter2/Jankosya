/* ============================================================
   КИНО-ПРИГЛАШЕНИЕ · Vanilla JS
   1. Интро → контент
   2. 3D-наклон билета (touchmove + DeviceOrientation)
   3. Чипы бонусов
   4. Кнопка «Подумаю...» уворачивается
   5. Салют из сердечек и золотого конфетти (Canvas)
   ============================================================ */

"use strict";

const $ = (sel) => document.querySelector(sel);

/* ============ 1. ИНТРО ============ */
const intro = $("#intro");
const content = $("#content");
const openBtn = $("#openBtn");

openBtn.addEventListener("click", () => {
  intro.style.transition = "opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)";
  intro.style.opacity = "0";
  intro.style.transform = "scale(1.06)";
  intro.style.pointerEvents = "none";

  setTimeout(() => {
    intro.remove();
    content.hidden = false;
    // Перезапуск анимаций появления для контента
    content.querySelectorAll(".section").forEach((s, i) => {
      s.style.opacity = "0";
      s.style.transform = "translateY(30px)";
      s.style.transition = `opacity 0.9s ${0.12 * i}s cubic-bezier(0.22,1,0.36,1), transform 0.9s ${0.12 * i}s cubic-bezier(0.22,1,0.36,1)`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          s.style.opacity = "1";
          s.style.transform = "translateY(0)";
        });
      });
    });
    // Запрос разрешения на гироскоп для iOS 13+ (нужен жест пользователя)
    requestGyroPermission();
  }, 700);
});

/* ============ 2. 3D-НАКЛОН БИЛЕТА ============ */
const ticket = $("#ticket");
const MAX_TILT = 14;

function setTilt(rx, ry, mx, my) {
  ticket.style.transform =
    `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  ticket.style.setProperty("--mx", `${mx.toFixed(1)}%`);
  ticket.style.setProperty("--my", `${my.toFixed(1)}%`);
  ticket.style.setProperty("--shine", "0.75");
}

function resetTilt() {
  ticket.style.transform = "rotateX(0deg) rotateY(0deg)";
  ticket.style.setProperty("--shine", "0.35");
}

// — На пальце: touchmove по билету —
ticket.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = ticket.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  const px = Math.min(Math.max(x / rect.width, 0), 1);
  const py = Math.min(Math.max(y / rect.height, 0), 1);
  setTilt((py - 0.5) * -2 * MAX_TILT, (px - 0.5) * 2 * MAX_TILT, px * 100, py * 100);
}, { passive: false });

ticket.addEventListener("touchend", resetTilt);

// — Мышью (для десктопа) —
ticket.addEventListener("mousemove", (e) => {
  const rect = ticket.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;
  setTilt((py - 0.5) * -2 * MAX_TILT, (px - 0.5) * 2 * MAX_TILT, px * 100, py * 100);
});
ticket.addEventListener("mouseleave", resetTilt);

// — Гироскоп: DeviceOrientation —
function requestGyroPermission() {
  if (typeof DeviceOrientationEvent === "undefined") return;
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    // iOS 13+: спрашиваем разрешение (мы внутри обработчика жеста)
    DeviceOrientationEvent.requestPermission()
      .then((res) => { if (res === "granted") startGyro(); })
      .catch(() => {});
  } else {
    startGyro();
  }
}

let gyroActive = false;
function startGyro() {
  if (gyroActive) return;
  gyroActive = true;
  let targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;

  window.addEventListener("deviceorientation", (e) => {
    if (e.beta === null || e.gamma === null) return;
    // beta: наклон вперёд/назад (-180..180), gamma: влево/вправо (-90..90)
    targetRX = Math.max(-MAX_TILT, Math.min(MAX_TILT, (e.beta - 45) * 0.35));
    targetRY = Math.max(-MAX_TILT, Math.min(MAX_TILT, e.gamma * 0.5));
    const mx = 50 + targetRY * 3;
    const my = 50 - targetRX * 3;
    ticket.style.setProperty("--mx", `${Math.max(0, Math.min(100, mx))}%`);
    ticket.style.setProperty("--my", `${Math.max(0, Math.min(100, my))}%`);
    ticket.style.setProperty("--shine", "0.7");
  });

  // Плавная интерполяция (lerp), чтобы наклон не дёргался
  (function animateGyro() {
    curRX += (targetRX - curRX) * 0.08;
    curRY += (targetRY - curRY) * 0.08;
    if (!ticket.matches(":hover") && !touchingTicket) {
      ticket.style.transform =
        `rotateX(${curRX.toFixed(2)}deg) rotateY(${curRY.toFixed(2)}deg)`;
    }
    requestAnimationFrame(animateGyro);
  })();
}

let touchingTicket = false;
ticket.addEventListener("touchstart", () => { touchingTicket = true; });
ticket.addEventListener("touchend", () => { touchingTicket = false; });

/* ============ 3. ЧИПЫ БОНУСОВ ============ */
const chips = $("#chips");
chips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  chip.classList.toggle("is-selected");
  if (navigator.vibrate) navigator.vibrate(12); // мягкая тактильная отдача
});

function getSelectedBonuses() {
  return [...chips.querySelectorAll(".chip.is-selected")].map((c) => c.textContent.trim());
}

/* ============ 4. КНОПКА «ПОДУМАЮ...» ============ */
const maybeBtn = $("#maybeBtn");
const finalBtns = $("#finalBtns");
let dodgeCount = 0;
const dodgeTexts = ["Подумаю...", "Точно подумаешь? 😏", "А может всё-таки «Да»?", "Ошибка, такой опции нет 😌"];

function dodge() {
  dodgeCount++;
  const zone = finalBtns.getBoundingClientRect();
  const btnW = maybeBtn.offsetWidth;
  const btnH = maybeBtn.offsetHeight;
  const pad = 6;

  const maxX = Math.max(0, zone.width - btnW - pad * 2);
  const maxY = Math.max(0, zone.height - btnH - pad * 2);
  const x = pad + Math.random() * maxX;
  const y = pad + Math.random() * maxY;

  maybeBtn.style.position = "absolute";
  maybeBtn.style.left = `${x}px`;
  maybeBtn.style.top = `${y}px`;
  maybeBtn.textContent = dodgeTexts[Math.min(dodgeCount, dodgeTexts.length - 1)];

  if (dodgeCount >= 3) {
    // Не даём «поймать» кнопку — она убегает от любого приближения
    maybeBtn.style.opacity = "0.75";
  }
}

// Уворачивается при попытке нажать (на пальце и курсоре)
maybeBtn.addEventListener("touchstart", (e) => { e.preventDefault(); dodge(); }, { passive: false });
maybeBtn.addEventListener("mouseenter", dodge);
maybeBtn.addEventListener("click", (e) => { e.preventDefault(); dodge(); });

/* ============ 5. САЛЮТ ИЗ СЕРДЕЧЕК + ПОДТВЕРЖДЕНИЕ ============ */
const yesBtn = $("#yesBtn");
const overlay = $("#overlay");
const confettiCanvas = $("#confetti");
const bonusSummary = $("#bonusSummary");
const tgLink = $("#tgLink");

let confettiRAF = null;

function drawHeart(ctx, size, color) {
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(0, 0, -s * 0.5, 0, -s * 0.5, s * 0.3);
  ctx.bezierCurveTo(-s * 0.5, s * 0.62, 0, s * 0.85, 0, s * 1.1);
  ctx.bezierCurveTo(0, s * 0.85, s * 0.5, s * 0.62, s * 0.5, s * 0.3);
  ctx.bezierCurveTo(s * 0.5, 0, 0, 0, 0, s * 0.3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function launchConfetti() {
  const ctx = confettiCanvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = (confettiCanvas.width = window.innerWidth * dpr);
  const H = (confettiCanvas.height = window.innerHeight * dpr);
  ctx.scale(dpr, dpr);
  const w = window.innerWidth, h = window.innerHeight;

  const COLORS = ["#f6c86b", "#ff4d7e", "#a06bff", "#ffd9e4", "#ffe9b8", "#ff85a2"];
  const HEART_COLORS = ["#ff4d7e", "#ff85a2", "#ff2d63", "#f6c86b"];

  const particles = [];
  const spawn = (cx, cy, count, type) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === "heart" ? 7 + Math.random() * 6 : 4 + Math.random() * 9;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === "heart" ? 4 : 2),
        size: type === "heart" ? 8 + Math.random() * 10 : 5 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        type,
        color: type === "heart"
          ? HEART_COLORS[(Math.random() * HEART_COLORS.length) | 0]
          : COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        decay: 0.004 + Math.random() * 0.006,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  };

  // Три волны залпов: сердца + золотое конфетти
  spawn(w / 2, h * 0.55, 60, "heart");
  spawn(w / 2, h * 0.55, 90, "confetti");
  setTimeout(() => { spawn(w * 0.25, h * 0.4, 40, "heart"); spawn(w * 0.75, h * 0.4, 60, "confetti"); }, 450);
  setTimeout(() => { spawn(w / 2, h * 0.3, 40, "heart"); spawn(w / 2, h * 0.3, 60, "confetti"); }, 900);

  if (navigator.vibrate) navigator.vibrate([30, 60, 30]);

  function tick() {
    ctx.clearRect(0, 0, w, h);
    let alive = false;

    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;

      p.vy += p.type === "heart" ? 0.09 : 0.14;      // гравитация
      p.vx *= 0.99;
      p.vy *= 0.995;
      p.wobble += 0.08;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.type === "heart") {
        drawHeart(ctx, p.size, p.color);
      } else {
        // золотая фольга — переливающийся прямоугольник
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.globalAlpha = Math.max(0, p.life) * 0.5;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size * 0.4, p.size / 2);
      }
      ctx.restore();
    }

    if (alive) {
      confettiRAF = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, w, h);
      confettiRAF = null;
    }
  }

  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  tick();
}

yesBtn.addEventListener("click", () => {
  const bonuses = getSelectedBonuses();
  if (bonuses.length) {
    bonusSummary.hidden = false;
    bonusSummary.innerHTML = `Ваш бонус-пакет: <b>${bonuses.join(" · ")}</b>`;
  }
  // Предзаполненный текст в ссылке Telegram
  const msg = encodeURIComponent(
    `Да, я согласна! 💛 Жду наш поход в кино${bonuses.length ? ` — беру с собой: ${bonuses.join(", ")}` : ""}! Спасибо за такое красивое приглашение ✨`
  );
  tgLink.href = `https://t.me/share/url?url=&text=${msg}`;

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  launchConfetti();
  if (navigator.vibrate) navigator.vibrate([40, 80, 40, 80, 120]);
});

// Обновляем размер канваса при повороте экрана
window.addEventListener("resize", () => {
  if (overlay.hidden) return;
  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  launchConfetti();
});

