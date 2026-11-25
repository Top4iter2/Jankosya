/* =========================================================
   0. UTILS
   ========================================================= */
document.documentElement.classList.add("js");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* =========================================================
   1. INTRO → MAIN TRANSITION
   ========================================================= */
const intro = $("#intro");
const main = $("#main");
const openBtn = $("#openBtn");

openBtn.addEventListener("click", () => {
  intro.classList.add("fade-out");
  requestOrientationPermission();

  setTimeout(() => {
    intro.style.display = "none";
    main.classList.add("active");
    window.scrollTo(0, 0);
    initRevealObserver();
  }, 700);
});

/* =========================================================
   2. TICKET 3D TILT (touch + mouse + device orientation)
   ========================================================= */
const ticket = $("#ticket");

// Target vs current values (eased in rAF loop)
const target = { rx: 0, ry: 0, mx: 50, my: 50 };
const current = { rx: 0, ry: 0, mx: 50, my: 50 };

let touchActive = false;
let orientationActive = false;
let orientationBase = null;

// Infinite easing loop → smooth, buttery motion
(function loop() {
  current.rx += (target.rx - current.rx) * 0.12;
  current.ry += (target.ry - current.ry) * 0.12;
  current.mx += (target.mx - current.mx) * 0.12;
  current.my += (target.my - current.my) * 0.12;

  ticket.style.transform = `rotateX(${current.rx.toFixed(2)}deg) rotateY(${current.ry.toFixed(2)}deg)`;
  ticket.style.setProperty("--mx", current.mx.toFixed(2) + "%");
  ticket.style.setProperty("--my", current.my.toFixed(2) + "%");

  requestAnimationFrame(loop);
})();

/* -------- Touch -------- */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

ticket.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  },
  { passive: true }
);

ticket.addEventListener(
  "touchmove",
  (e) => {
    if (!touchActive || e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartX);
    const dy = Math.abs(t.clientY - touchStartY);

    // If user is clearly scrolling vertically — don't tilt
    if (dy > dx && dy > 30) return;

    const rect = ticket.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    target.rx = -((t.clientY - cy) / rect.height) * 20; // ±10deg
    target.ry = ((t.clientX - cx) / rect.width) * 20;

    target.mx = ((t.clientX - rect.left) / rect.width) * 100;
    target.my = ((t.clientY - rect.top) / rect.height) * 100;
  },
  { passive: true }
);

ticket.addEventListener(
  "touchend",
  () => {
    touchActive = false;
    // Gently return to rest if no orientation is driving
    if (!orientationActive) {
      target.rx = 0;
      target.ry = 0;
      target.mx = 50;
      target.my = 50;
    }
  },
  { passive: true }
);

/* -------- Mouse -------- */
ticket.addEventListener("mousemove", (e) => {
  const rect = ticket.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  target.rx = -((e.clientY - cy) / rect.height) * 18;
  target.ry = ((e.clientX - cx) / rect.width) * 18;
  target.mx = ((e.clientX - rect.left) / rect.width) * 100;
  target.my = ((e.clientY - rect.top) / rect.height) * 100;
  touchActive = true;
});

ticket.addEventListener("mouseleave", () => {
  touchActive = false;
  if (!orientationActive) {
    target.rx = 0;
    target.ry = 0;
    target.mx = 50;
    target.my = 50;
  }
});

/* -------- Device Orientation -------- */
function handleOrientation(e) {
  if (touchActive) return;
  if (e.gamma === null || e.beta === null) return;

  orientationActive = true;

  if (!orientationBase) {
    orientationBase = { beta: e.beta, gamma: e.gamma };
  }

  const dBeta = e.beta - orientationBase.beta;
  const dGamma = e.gamma - orientationBase.gamma;

  // Clamp to reasonable range
  const rx = Math.max(-15, Math.min(15, -dBeta * 0.4));
  const ry = Math.max(-15, Math.min(15, dGamma * 0.6));

  target.rx = rx;
  target.ry = ry;
  target.mx = 50 + ry * 3;
  target.my = 50 + rx * 3;
}

function requestOrientationPermission() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        }
      })
      .catch(() => {
        /* Silently fall back to touch tilt */
      });
  } else if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", handleOrientation);
  }
}

/* =========================================================
   3. BONUS CHIPS
   ========================================================= */
$$(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("active");
    if (navigator.vibrate) navigator.vibrate(20);
  });
});

/* =========================================================
   4. FINAL: YES / NO
   ========================================================= */
const yesBtn = $("#yesBtn");
const noBtn = $("#noBtn");
const finalSection = $("#finalSection");
const confirmedSection = $("#confirmedSection");
const msgBtn = $("#msgBtn");

const NO_MESSAGES = [
  "Подумаю...",
  "Ошибка, такой опции нет 😌",
  "Точно-точно подумаешь?",
  "Ну пожалуйста 🥺",
  "Ладно, соглашайся уже!",
];
let noCount = 0;

noBtn.addEventListener("click", () => {
  noCount++;
  const idx = Math.min(noCount, NO_MESSAGES.length - 1);
  noBtn.textContent = NO_MESSAGES[idx];

  const x = (Math.random() - 0.5) * 160;
  const y = (Math.random() - 0.5) * 80;
  const rot = (Math.random() - 0.5) * 20;
  noBtn.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;

  if (navigator.vibrate) navigator.vibrate(15);
});

yesBtn.addEventListener("click", () => {
  finalSection.classList.add("hidden");
  confirmedSection.classList.remove("hidden");

  // Sweet haptic
  if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);

  // Triple confetti burst
  burstConfetti();
  setTimeout(burstConfetti, 450);
  setTimeout(burstConfetti, 900);

  setTimeout(() => {
    confirmedSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 350);
});

/* Pre-filled message link */
const prefillText = encodeURIComponent(
  "Привет! ❤️ Я принимаю твоё VIP-приглашение в кино 🍿✨ Уже не могу дождаться 🥰"
);
msgBtn.href = `https://wa.me/?text=${prefillText}`;

/* =========================================================
   5. CONFETTI (hearts + gold sparkles, vanilla Canvas)
   ========================================================= */
const canvas = $("#confetti");
const ctx = canvas.getContext("2d");

let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const particles = [];
const PALETTE = [
  "#E8C382",
  "#D4A661",
  "#F5E5C8",
  "#D96B8E",
  "#F2A7BE",
  "#B8893E",
  "#FFD9A0",
  "#8B1538",
];

function spawnParticle() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const isHeart = Math.random() < 0.6;

  particles.push({
    x: W / 2 + (Math.random() - 0.5) * 140,
    y: H * 0.44 + (Math.random() - 0.5) * 80,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 4,
    size: 7 + Math.random() * 11,
    color: PALETTE[(Math.random() * PALETTE.length) | 0],
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.4,
    life: 1,
    decay: 0.0055 + Math.random() * 0.006,
    isHeart,
    gravity: 0.24 + Math.random() * 0.2,
    swayOffset: Math.random() * Math.PI * 2,
    swayAmp: 0.4 + Math.random() * 1.6,
    swaySpeed: 0.025 + Math.random() * 0.04,
  });
}

let animationRunning = false;
let swayTime = 0;

function burstConfetti() {
  for (let i = 0; i < 90; i++) spawnParticle();
  if (!animationRunning) {
    animationRunning = true;
    animateConfetti();
  }
}

function drawHeart(s) {
  const scale = s / 16;
  ctx.beginPath();
  ctx.moveTo(0, -3 * scale);
  ctx.bezierCurveTo(-3 * scale, -6 * scale, -8 * scale, -6 * scale, -8 * scale, 0);
  ctx.bezierCurveTo(-8 * scale, 4 * scale, 0, 10 * scale, 0, 12 * scale);
  ctx.bezierCurveTo(0, 10 * scale, 8 * scale, 4 * scale, 8 * scale, 0);
  ctx.bezierCurveTo(8 * scale, -6 * scale, 3 * scale, -6 * scale, 0, -3 * scale);
  ctx.fill();
}

function drawDiamond(s) {
  ctx.beginPath();
  ctx.moveTo(0, -s / 2);
  ctx.lineTo(s / 3, 0);
  ctx.lineTo(0, s / 2);
  ctx.lineTo(-s / 3, 0);
  ctx.closePath();
  ctx.fill();
}

function animateConfetti() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  ctx.clearRect(0, 0, W, H);
  swayTime += 1;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.vy += p.gravity;
    p.vx *= 0.985;
    p.x += p.vx + Math.sin(swayTime * p.swaySpeed + p.swayOffset) * p.swayAmp;
    p.y += p.vy;
    p.rotation += p.vr;
    p.life -= p.decay;

    if (p.life <= 0 || p.y > H + 60 || p.x < -60 || p.x > W + 60) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    ctx.fillStyle = p.color;
    if (p.isHeart) drawHeart(p.size);
    else drawDiamond(p.size);
    ctx.restore();
  }

  if (particles.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    animationRunning = false;
    ctx.clearRect(0, 0, W, H);
  }
}

/* =========================================================
   6. SCROLL REVEAL (subtle fade-in for sections)
   ========================================================= */
function initRevealObserver() {
  if (!("IntersectionObserver" in window)) {
    $$(".reveal").forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  $$(".reveal").forEach((el) => observer.observe(el));
}

