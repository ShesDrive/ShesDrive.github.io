/* ═══════════════════════════════════════════
   She's Drive — script.js
   ═══════════════════════════════════════════ */
'use strict';

/* ─── DATA ──────────────────────────────────── */
const TARIFFS = [
  { id:'econom',   icon:'🚗', name:'Эконом',
    cars:'Hyundai Solaris / Kia Rio',        price:'140 ₽/км',
    desc:'Бюджетная поездка',               ppm:140, extra:0 },
  { id:'comfort',  icon:'🚙', name:'Обычный',
    cars:'Toyota Camry / Skoda Octavia',     price:'180 ₽/км',
    desc:'Комфорт на каждый день',          ppm:180, extra:0 },
  { id:'premium',  icon:'🚘', name:'Премиум',
    cars:'Mercedes E-Class / BMW 5',         price:'280 ₽/км',
    desc:'Для особых случаев',              ppm:280, extra:0 },
  { id:'child',    icon:'👶', name:'С детским креслом',
    cars:'Kia Carnival / VW Multivan',       price:'180+50 ₽',
    desc:'Безопасность малыша',             ppm:180, extra:50 },
  { id:'pet',      icon:'🐾', name:'С животным',
    cars:'Skoda Kodiaq / Renault Duster',   price:'180+50 ₽',
    desc:'Питомец едет с вами',             ppm:180, extra:50 },
];

const DRIVERS   = ['Анна','Мария','Екатерина','Дарья','Светлана'];
const RESPONSES = [
  'Уже еду, немного подождите!',
  'Всё хорошо, скоро буду!',
  'Навигатор проложил маршрут, еду!',
  'Буду с вами через несколько минут! 💜',
  'Ок, поняла вас! 👍',
  'Конечно, без проблем! 🌸',
  'Хорошо, постараюсь побыстрее!',
  'Слышу вас! Совсем скоро',
];
const STAR_TXT  = ['','Плохо','Так себе','Нормально','Хорошо','Отлично! ⭐'];

/* ─── STATE ─────────────────────────────────── */
let map          = null;
let originMk     = null;
let destMk       = null;
let routeLine    = null;
let userPos      = null;   // [lat,lng]
let destPos      = null;   // [lat,lng]
let curTariff    = null;
let curDriver    = null;
let curArrival   = null;
let curRating    = 0;
let autoRespTmr  = null;
let mapObserver  = null;

/* ─── BOOT ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderTariffs();
  initScrollObserver();
  initHeroAnim();
  initHeader();
  initMap();
  initModals();
  initChat();
  initReview();
});

/* ════════════════════════════════════════════
   HEADER
════════════════════════════════════════════ */
function initHeader() {
  const hdr    = document.getElementById('header');
  const burger = document.getElementById('burgerBtn');
  const nav    = document.getElementById('mainNav');

  window.addEventListener('scroll', () => {
    hdr.classList.toggle('scrolled', window.scrollY > 36);
  }, { passive:true });

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('.header__nav-link').forEach(l =>
    l.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded','false');
    })
  );

  document.addEventListener('click', e => {
    if (!hdr.contains(e.target)) {
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded','false');
    }
  });
}

/* ════════════════════════════════════════════
   HERO — GSAP
════════════════════════════════════════════ */
function initHeroAnim() {
  if (typeof gsap === 'undefined') return;

  const els = ['.hero__badge','.hero__title','.hero__sub','.hero__cta','.hero__deco'];
  gsap.set(els, { opacity:0, y:38 });

  const tl = gsap.timeline({ delay:.15 });
  tl.to('.hero__badge', { opacity:1, y:0, duration:.7, ease:'power3.out' })
    .to('.hero__title', { opacity:1, y:0, duration:.9, ease:'power3.out' }, '-=.4')
    .to('.hero__sub',   { opacity:1, y:0, duration:.7, ease:'power3.out' }, '-=.5')
    .to('.hero__cta',   { opacity:1, y:0, duration:.6, ease:'back.out(1.8)' }, '-=.35')
    .to('.hero__deco',  { opacity:.35, y:0, duration:.5, ease:'power2.out' }, '-=.25');
}

/* ════════════════════════════════════════════
   SCROLL OBSERVER
════════════════════════════════════════════ */
function initScrollObserver() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      // Stagger siblings in the same parent
      const siblings = [...entry.target.parentElement.querySelectorAll('.anim-el:not(.in-view)')];
      const idx = siblings.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('in-view'), Math.max(0, idx) * 80);
      io.unobserve(entry.target);
    });
  }, { threshold:.08, rootMargin:'0px 0px -30px 0px' });

  document.querySelectorAll('.anim-el').forEach(el => io.observe(el));
}

/* ════════════════════════════════════════════
   TARIFF CARDS
════════════════════════════════════════════ */
function renderTariffs() {
  const grid = document.getElementById('tariffsGrid');
  grid.innerHTML = TARIFFS.map(t => `
    <div class="tariff-card anim-el">
      <div class="tariff-card__icon">${t.icon}</div>
      <h3 class="tariff-card__name">${t.name}</h3>
      <p class="tariff-card__cars">${t.cars}</p>
      <div class="tariff-card__price">${t.price}</div>
      <p class="tariff-card__desc">${t.desc}</p>
      <button class="btn-primary t-order-btn" data-id="${t.id}">Оформить</button>
    </div>
  `).join('');

  grid.querySelectorAll('.t-order-btn').forEach(btn =>
    btn.addEventListener('click', () => openOrderModal(btn.dataset.id))
  );
}

/* ════════════════════════════════════════════
   LEAFLET MAP
════════════════════════════════════════════ */
function initMap() {
  // 1. ЗАМЕНЯЕМ создание карты, добавляя minZoom и maxZoom
  map = L.map('leaflet-map', { 
    zoomControl: true,
    minZoom: 10,  // Пользователь не сможет сильно отдалить карту и увидеть границы
    maxZoom: 18   // Максимальное приближение
  }).setView([55.7558, 37.6176], 12);

  // 2. ЗАМЕНЯЕМ стандартный tileLayer на CartoDB Positron (карта без границ стран)
  L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // 3. ДОБАВЛЯЕМ ограничение области перемещения (чтобы нельзя было утащить карту в другую страну)
  var southWest = L.latLng(55.50, 37.30),
      northEast = L.latLng(56.00, 37.90),
      bounds = L.latLngBounds(southWest, northEast);

  map.setMaxBounds(bounds);
  map.on('drag', function() {
      map.panInsideBounds(bounds, { animate: false });
  });

  // --- ДАЛЬШЕ ОСТАЕТСЯ ВАШ СУЩЕСТВУЮЩИЙ КОД БЕЗ ИЗМЕНЕНИЙ ---
  
  // Force size recalc when section scrolls into view
  const mapSection = document.getElementById('map');
  mapObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { map.invalidateSize(); mapObserver.disconnect(); }
  }, { threshold:.1 });
  mapObserver.observe(mapSection);

  requestGeolocation();

  map.on('click', e => setDest(e.latlng.lat, e.latlng.lng));

  document.getElementById('geocodeBtn').addEventListener('click', geocode);
  document.getElementById('destInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') geocode();
  });
}

/* ════════════════════════════════════════════
   MODAL SYSTEM
════════════════════════════════════════════ */
function initModals() {
  // [data-close] buttons
  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  );

  // Click backdrop to close
  document.querySelectorAll('.modal-overlay').forEach(ov =>
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id) })
  );

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const a = document.querySelector('.modal-overlay.active');
    if (a) closeModal(a.id);
  });

  // Confirm order → open waiting
  document.getElementById('confirmOrderBtn').addEventListener('click', () => {
    closeModal('modalOrder');
    setTimeout(() => { openModal('modalWaiting'); startRide(); }, 320);
  });

  // Trip done → open review
  document.getElementById('tripDoneBtn').addEventListener('click', () => {
    closeModal('modalWaiting');
    setTimeout(() => {
      openModal('modalReview');
      document.getElementById('reviewDriverName').textContent = curDriver || 'Водитель';
    }, 320);
  });
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  setTimeout(() => {
    if (!document.querySelector('.modal-overlay.active'))
      document.body.style.overflow = '';
  }, 300);
}

/* ════════════════════════════════════════════
   MODAL 1 — ORDER
════════════════════════════════════════════ */
function openOrderModal(tariffId) {
  curTariff  = TARIFFS.find(t => t.id === tariffId);
  if (!curTariff) return;
  curDriver  = pick(DRIVERS);
  curArrival = rnd(3, 12);
  const tripMin = rnd(10, 40);
  const dist    = calcDist();
  const cost    = curTariff.ppm * dist + curTariff.extra;

  set('modalCarIcon',    curTariff.icon);
  set('modalTariffBadge', curTariff.name + ' · ' + curTariff.cars);
  set('modalDriverName', curDriver);
  set('modalArrival',    curArrival + ' мин');
  set('modalDuration',   '~' + tripMin + ' мин');
  set('modalCost',       cost + ' ₽');

  openModal('modalOrder');
}

/* ════════════════════════════════════════════
   MODAL 2 — WAITING + CHAT
════════════════════════════════════════════ */
function startRide() {
  clearChat();
  set('waitingInfo', 'Водитель ' + curDriver + ' едет к вам');
  showToast('Заказ принят! Водитель ' + curDriver + ' в пути 🌸', '✅');

  setTimeout(() => addMsg('Еду к вам, буду через ' + curArrival + ' минут', 'driver'), 1500);
}

function initChat() {
  const send = () => {
    const inp = document.getElementById('chatInput');
    const txt = inp.value.trim();
    if (!txt) return;
    addMsg(txt, 'user');
    inp.value = '';
    if (autoRespTmr) clearTimeout(autoRespTmr);
    autoRespTmr = setTimeout(() =>
      addMsg(pick(RESPONSES), 'driver'), 3000 + Math.random() * 2200
    );
  };

  document.getElementById('chatSendBtn').addEventListener('click', send);
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') send();
  });
}

function addMsg(text, who) {
  const c = document.getElementById('chatMsgs');
  const d = document.createElement('div');
  d.className = 'chat-msg ' + (who === 'user' ? 'user' : 'driver');
  d.innerHTML = who === 'driver'
    ? `<span class="chat-av">👩‍✈️</span><div class="chat-bubble">${esc(text)}</div>`
    : `<div class="chat-bubble">${esc(text)}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function clearChat() { document.getElementById('chatMsgs').innerHTML = '' }

/* ════════════════════════════════════════════
   MODAL 3 — REVIEW
════════════════════════════════════════════ */
function initReview() {
  const stars = [...document.querySelectorAll('#starRating .star')];
  const lbl   = document.getElementById('starLabel');

  stars.forEach(s => {
    const v = parseInt(s.dataset.v);
    s.addEventListener('mouseenter', () => {
      stars.forEach((x, i) => x.classList.toggle('hov', i < v));
      lbl.textContent = STAR_TXT[v];
    });
    s.addEventListener('mouseleave', () => {
      stars.forEach(x => x.classList.remove('hov'));
      lbl.textContent = curRating ? STAR_TXT[curRating] : 'Выберите оценку';
    });
    s.addEventListener('click', () => {
      curRating = v;
      stars.forEach((x, i) => { x.classList.toggle('sel', i < v); x.classList.remove('hov'); });
      lbl.textContent = STAR_TXT[v];
    });
  });

  document.querySelectorAll('#reviewTags .tag').forEach(t =>
    t.addEventListener('click', () => t.classList.toggle('on'))
  );

  document.getElementById('submitReviewBtn').addEventListener('click', () => {
    if (!curRating) { showToast('Пожалуйста, поставьте оценку водителю ⭐', '⭐'); return; }
    closeModal('modalReview');
    resetReview();
    showToast('Спасибо за отзыв! 💜', '💜');
    setTimeout(() => showToast('До свидания! Хорошего дня 🌸', '🌸'), 900);
  });
}

function resetReview() {
  curRating = 0;
  document.querySelectorAll('#starRating .star').forEach(s =>
    s.classList.remove('sel','hov')
  );
  document.getElementById('starLabel').textContent  = 'Выберите оценку';
  document.getElementById('reviewComment').value    = '';
  document.querySelectorAll('#reviewTags .tag').forEach(t => t.classList.remove('on'));
}

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
function showToast(msg, icon = '💜') {
  const wrap  = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast__icon">${icon}</span><span>${msg}</span>`;
  wrap.appendChild(toast);

  // Double rAF to trigger transition
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ─── UTILS ─────────────────────────────────── */
const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const esc  = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
