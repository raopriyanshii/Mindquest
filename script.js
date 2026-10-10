/* =========================================================
   MindQuest — script.js
   Plain vanilla JS, no dependencies, works offline.

   1.  Content: themes, moods, quests
   2.  Storage (localStorage — only things the player saves)
   3.  App state
   4.  Small helpers (DOM, escaping, toast, confirm dialog)
   5.  Sound (Web Audio, no files)
   6.  Screen router
   7.  Background (forest silhouettes + firefly particles)
   8.  Quest engine
   9.  Reflection engine (rule-based, transparent)
   10. Ending screen
   11. Restore the Light (breathing)
   12. My Reflections dashboard
   13. Event wiring & init
   ========================================================= */
'use strict';

/* =========================================================
   1. CONTENT
   ========================================================= */

/** Broad themes that choices can point toward. Language stays tentative. */
const THEMES = {
  pressure: {
    short: 'Pressure', label: 'Feeling under pressure', phrase: 'feeling under pressure',
    glyph: '✶', color: '#f2a65a',
    insight: 'Several choices leaned toward pushing on and carrying a lot. It might be worth noticing where pressure shows up for you right now — and whether all of it is yours to carry.',
    ending: { title: 'The Ember Keeper', sub: 'You carried a great deal — and kept the flame alive.' },
  },
  rest: {
    short: 'Rest', label: 'Needing rest', phrase: 'needing rest',
    glyph: '☾', color: '#8fb8ff',
    insight: 'Your choices often made room for pausing. Rest, or permission to slow down, may matter to you at the moment.',
    ending: { title: 'The Still Water', sub: 'You made room for stillness, and it made room for you.' },
  },
  connection: {
    short: 'Connection', label: 'Seeking connection', phrase: 'seeking connection',
    glyph: '❦', color: '#ff9db5',
    insight: 'You frequently reached toward others. Being with people — or feeling understood — might be something you value right now.',
    ending: { title: 'The Lantern Bearer', sub: 'You walked toward others, and lit the way together.' },
  },
  uncertainty: {
    short: 'Uncertainty', label: 'Uncertainty', phrase: 'sitting with uncertainty',
    glyph: '≈', color: '#c3b3ef',
    insight: 'Some choices sat with the unknown. Not knowing can feel uncomfortable; it may simply mean you are in the middle of something still unfolding.',
    ending: { title: 'The Mist Walker', sub: 'You kept moving, even when the path was hidden.' },
  },
  confidence: {
    short: 'Confidence', label: 'Open confidence', phrase: 'a quiet confidence',
    glyph: '✦', color: '#f5c96a',
    insight: 'You often trusted your own direction. That steady confidence could be a resource worth recognising in yourself.',
    ending: { title: 'The Steady Flame', sub: 'You trusted your own direction.' },
  },
  reflection: {
    short: 'Reflection', label: 'Taking time to reflect', phrase: 'taking time to reflect',
    glyph: '◎', color: '#3fd1c4',
    insight: 'You tended to step back and look at the bigger picture. Taking a step back and finding clarity may be important to you right now.',
    ending: { title: 'The Quiet Observer', sub: 'You stepped back to see the whole picture.' },
  },
};

const MOODS = [
  { id: 'heavy', label: 'Heavy', glyph: '☁', color: '#8a93c9' },
  { id: 'tense', label: 'Tense', glyph: '✶', color: '#f2a65a' },
  { id: 'okay', label: 'Okay', glyph: '◌', color: '#c3b3ef' },
  { id: 'calm', label: 'Calm', glyph: '☾', color: '#3fd1c4' },
  { id: 'bright', label: 'Bright', glyph: '✦', color: '#f5c96a' },
];

const JOURNAL_PROMPTS = [
  'What emotion visited me today, and what was it trying to tell me?',
  'One small thing that went okay today…',
  'Something I’m carrying that I could set down…',
  'Who or what helped me feel less alone recently?',
];

/**
 * Quests. Each quest has two decision scenes, an optional reflection
 * question and an outro. Options carry theme weights, a response, and
 * (in the second scene) an epilogue line used in the personalised ending.
 */
const QUESTS = [
  {
    id: 'lantern',
    title: 'The Unfinished Journey',
    place: 'The Lantern Road',
    emblem: '⛰',
    palette: 'dawn',
    teaser: 'a quest about a goal that is taking longer than you hoped.',
    scenes: [
      {
        text: [
          'For many seasons you have carried a small brass lantern up the Lantern Road, toward the Observatory at the mountain’s peak. Everyone says the view from the top changes you.',
          'Tonight the road feels longer than ever. Your legs ache. The peak is hidden in cloud, and you can’t remember the last time it looked any closer.',
        ],
        prompt: 'The wind picks up. What do you do?',
        options: [
          {
            id: 'push', label: 'Keep climbing through the night — you’re closer than you feel.',
            themes: { pressure: 2, confidence: 1 },
            response: [
              'You tighten your scarf and climb. The lantern swings, throwing gold across the stones. Each step is heavy, but there’s a fierce warmth in refusing to stop.',
              'By midnight you’ve covered real ground — and you notice how tightly your shoulders have been clenched the whole way.',
            ],
          },
          {
            id: 'camp', label: 'Make camp by the stream and let tonight be for rest.',
            themes: { rest: 2 },
            response: [
              'You set the lantern on a flat rock and listen to the water. For the first time in weeks, you aren’t measuring anything.',
              'When you wake, the cloud has thinned. The mountain hasn’t moved — but you feel more able to meet it.',
            ],
          },
          {
            id: 'call', label: 'Call down to the travellers on the switchbacks below.',
            themes: { connection: 2 },
            response: [
              'Your voice echoes, and after a moment three small lights answer from below. A traveller named Oren calls back: “We thought we were the only ones still walking.”',
              'They join you at the next bend. The road is the same length — it just feels less lonely.',
            ],
          },
          {
            id: 'map', label: 'Sit on a boulder and unfold the map — how far have you actually come?',
            themes: { reflection: 2 },
            response: [
              'You trace the path with your finger. The village where you started is so far down it isn’t even on this fold of the map.',
              'You hadn’t noticed. You had only ever been looking at the distance left.',
            ],
          },
        ],
      },
      {
        text: [
          'Further on, you find a milestone half-buried in moss. Whatever number was carved on it has worn away. There’s no way to know how far the Observatory still is.',
        ],
        prompt: 'How do you meet the unreadable stone?',
        options: [
          {
            id: 'mark', label: 'Carve your own mark into it: “I was here, and I kept going.”',
            themes: { confidence: 2, reflection: 1 },
            response: ['The stone takes your mark. It isn’t a measure of distance — it’s a record of effort, and it belongs to you.'],
            epilogue: 'On the Lantern Road, you left your own mark where the measurements had worn away.',
          },
          {
            id: 'worry', label: 'Search the moss for clues, worrying about the missing number.',
            themes: { uncertainty: 2, pressure: 1 },
            response: [
              'You scrape at the moss until your fingers are cold. The number doesn’t return.',
              'Not knowing sits in your chest like a stone of its own. Still — you’re here, and the lantern is still lit.',
            ],
            epilogue: 'On the Lantern Road, you carried the weight of not knowing how far was left — and kept the lantern lit anyway.',
          },
          {
            id: 'view', label: 'Leave the stone be. Turn around and take in the view you’ve earned.',
            themes: { rest: 1, reflection: 1 },
            response: [
              'Behind you the valley spreads out in silver and blue. Rivers you crossed months ago glint like thread.',
              'The destination can wait a few minutes. This, too, is part of the journey.',
            ],
            epilogue: 'On the Lantern Road, you paused to see how far you had already come.',
          },
        ],
      },
    ],
    reflect: 'Is there a goal in your life that feels slow right now? What’s one small step you’ve already taken toward it?',
    outro: [
      'The cloud lifts from the peak for a single moment. You don’t reach the Observatory today — but you understand the road a little better.',
      'A trail of fireflies leads downhill, into a forest gone strangely quiet.',
    ],
  },
  {
    id: 'forest',
    title: 'The Silent Forest',
    place: 'The Whispering Pines',
    emblem: '❦',
    palette: 'forest',
    teaser: 'a quest about someone who suddenly feels far away.',
    scenes: [
      {
        text: [
          'The Silent Forest is usually full of song. Today, even the birds are hushed.',
          'On a fallen log sits Wren, a wandering lantern-maker you’ve shared many campfires with. Wren was always the brightest voice in any clearing — but now they stare at the ground and barely look up as you approach.',
        ],
        prompt: 'Wren says nothing. How do you respond?',
        options: [
          {
            id: 'sit', label: 'Sit beside Wren without saying a word.',
            themes: { connection: 1, reflection: 1 },
            response: [
              'You lower yourself onto the log. Minutes pass. A beetle crosses the bark between you.',
              'Slowly, Wren’s shoulders drop. They haven’t spoken — but they haven’t moved away, either.',
            ],
          },
          {
            id: 'ask', label: 'Gently ask: “You seem quiet today. Are you okay?”',
            themes: { connection: 2, confidence: 1 },
            response: [
              'Wren looks up, surprised to be asked so plainly. Something flickers across their face — maybe relief.',
              '“Not really,” they admit. “But thank you for noticing.”',
            ],
          },
          {
            id: 'space', label: 'Give Wren space, and leave a glowing moonflower beside them.',
            themes: { rest: 1, uncertainty: 1 },
            response: [
              'You set the moonflower on the log and step back to the edge of the clearing. You’re not sure it was the right thing — but it felt kind.',
              'After a while, Wren picks up the flower and turns it slowly in their hands.',
            ],
          },
          {
            id: 'blame', label: 'Wonder whether you did something to upset them.',
            themes: { uncertainty: 2, pressure: 1 },
            response: [
              'Your mind races through your last few meetings. Did you say something? Forget something?',
              'You realise you’ve built a whole story — and you don’t yet know if any of it is true. Wren glances up, as if they can hear you thinking.',
            ],
          },
        ],
      },
      {
        text: [
          'At last, Wren speaks, very softly.',
          '“I’m tired of being the bright one,” they say. “Everyone expects my lanterns to be the warmest. Lately I just… don’t have it in me.”',
        ],
        prompt: 'What do you offer Wren?',
        options: [
          {
            id: 'share', label: 'Share a time you felt the same way.',
            themes: { connection: 2 },
            response: [
              'You tell Wren about a season when you, too, had nothing left to give. Wren laughs — a small, cracked, real laugh.',
              '“I thought it was only me,” they say.',
            ],
            epilogue: 'In the Silent Forest, you let Wren know they were not the only one.',
          },
          {
            id: 'permission', label: 'Tell Wren it’s okay to rest from being bright.',
            themes: { rest: 2 },
            response: [
              '“Your lanterns don’t have to burn every night,” you say. “Even the moon has dark phases.”',
              'Wren closes their eyes. For the first time today, their face softens.',
            ],
            epilogue: 'In the Silent Forest, you gave Wren permission to rest — and perhaps heard it yourself.',
          },
          {
            id: 'walk', label: 'Offer to walk together, no talking required.',
            themes: { connection: 1, reflection: 1 },
            response: [
              '“I’m heading that way,” you say, holding out a hand. “Come along if you like. We don’t have to talk.”',
              'Wren takes it. You walk in comfortable quiet as the birds, one by one, begin to sing again.',
            ],
            epilogue: 'In the Silent Forest, you walked beside Wren in a quiet that didn’t need fixing.',
          },
        ],
      },
    ],
    reflect: 'When someone seems distant, what story do you tend to tell yourself about why?',
    outro: [
      'The forest’s song returns behind you. Wren waves from the ridge, their lantern faintly glowing again.',
      'Ahead, the trees thin out. You smell salt — and hear the tide rising fast.',
    ],
  },
  {
    id: 'tide',
    title: 'The Drowned Island',
    place: 'The Isle of Tides',
    emblem: '⚓',
    palette: 'tide',
    teaser: 'a quest about choosing what matters when everything feels urgent.',
    scenes: [
      {
        text: [
          'You reach the Isle of Tides just as the sea begins to rise. Within the hour, the low paths will be underwater.',
          'Three places call to you at once: the lighthouse, whose keeper is away and whose light the ships depend on; the old library, where your own unfinished journals are kept; and the hilltop, from which the whole island can be seen.',
        ],
        prompt: 'The water is at your ankles. Where do you go first?',
        options: [
          {
            id: 'lighthouse', label: 'Run to the lighthouse — others are relying on its light.',
            themes: { pressure: 2, connection: 1 },
            response: [
              'You sprint up the spiral stairs, lungs burning, and turn the great lamp toward the sea. Far out, a small boat changes course toward safety.',
              'You did something that mattered. You also notice you never stopped to ask what you needed.',
            ],
          },
          {
            id: 'library', label: 'Save your journals — your own work matters too.',
            themes: { confidence: 2 },
            response: [
              'You wade into the library and lift your journals from the lowest shelf, pages still dry. Years of thinking, rescued.',
              'It feels steadying to protect something that is yours. Somewhere, you hope, someone else has the lighthouse.',
            ],
          },
          {
            id: 'hilltop', label: 'Climb the hilltop to see everything before deciding.',
            themes: { reflection: 2, uncertainty: 1 },
            response: [
              'From the hilltop the island lays itself out like a map. The lighthouse is already lit — the keeper made it back. The library is flooding, but slowly.',
              'Seeing the whole picture doesn’t make the choice for you. But it makes it clearer.',
            ],
          },
          {
            id: 'still', label: 'Stand still, breathe, and let the tide show you what can wait.',
            themes: { rest: 2, reflection: 1 },
            response: [
              'You stop. You breathe. The water swirls around your ankles — and, strangely, rises no further.',
              'Not everything that feels urgent is urgent. Some things can wait for you to be ready.',
            ],
          },
        ],
      },
      {
        text: [
          'As the tide finally turns, a little rowing boat drifts up to the shore. It’s sturdy — but there’s room in it for only one more thing before you sail home.',
        ],
        prompt: 'What do you bring with you?',
        options: [
          {
            id: 'keepsake', label: 'A keepsake belonging to a friend, to return to them.',
            themes: { connection: 2 },
            response: ['You tuck the keepsake into your coat. Bringing it home means a visit, a conversation — a reason to reconnect.'],
            epilogue: 'On the Isle of Tides, you chose to carry something back to someone you care about.',
          },
          {
            id: 'unfinished', label: 'Something of your own that’s still unfinished.',
            themes: { confidence: 1, pressure: 1 },
            response: ['You place it carefully in the bow. It isn’t done yet — but you’re not ready to let it go, and that’s allowed.'],
            epilogue: 'On the Isle of Tides, you carried your unfinished work home, still believing in it.',
          },
          {
            id: 'empty', label: 'Nothing. You leave the space in the boat empty.',
            themes: { rest: 1, uncertainty: 1 },
            response: ['The empty seat looks strange at first. Then it looks like room — room for whatever comes next.'],
            epilogue: 'On the Isle of Tides, you left space open for whatever comes next.',
          },
        ],
      },
    ],
    reflect: 'What’s competing for your attention lately? Which one is the loudest — and which one matters most to you?',
    outro: [
      'You row away as the sun sets gold across the water. Behind you, the tide covers the low paths — and you’re at peace with what you left behind.',
      'Your journey is complete. Let’s see what your choices might be telling you.',
    ],
  },
];

/* =========================================================
   2. STORAGE — only data the player explicitly saves
   ========================================================= */
const STORE_KEY = 'mindquest.v1';

const Store = {
  empty() {
    return { journeys: [], journal: [], moods: [] };
  },
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return this.empty();
      const d = JSON.parse(raw);
      const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && x.id) : []);
      return { journeys: list(d.journeys), journal: list(d.journal), moods: list(d.moods) };
    } catch (err) {
      console.warn('MindQuest: could not read saved data, starting fresh.', err);
      return this.empty();
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      toast('Couldn’t save — browser storage is unavailable.');
      return false;
    }
  },
  clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
  },
};

/* =========================================================
   3. APP STATE
   ========================================================= */
const state = {
  screen: 'home',
  journey: null,        // the journey in progress / just finished (memory only)
  data: Store.load(),   // saved journeys, journal, moods
  selectedMood: null,
  editingEntryId: null,
};

function persist() {
  return Store.save(state.data);
}

function newJourney() {
  return {
    questIndex: 0,
    scene: 0,
    step: 'scene',      // scene → response → (scene → response) → reflect → complete
    choices: [],
    answers: {},
    lastOption: null,
    finished: false,
    result: null,
    feedback: null,
    savedId: null,
  };
}

/* =========================================================
   4. HELPERS
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const paras = (lines) => lines.map((l) => `<p>${esc(l)}</p>`).join('');

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function emptyState(glyph, text, actionHTML = '') {
  return `<div class="empty"><span class="empty-glyph" aria-hidden="true">${glyph}</span><p>${text}</p>${actionHTML}</div>`;
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
}

/** Accessible confirm dialog. Resolves true/false. */
function confirmDialog({ title, message, confirmLabel = 'Confirm' }) {
  const modal = $('#modal');
  const okBtn = $('#modalOk');
  const cancelBtn = $('#modalCancel');
  const previousFocus = document.activeElement;

  $('#modalTitle').textContent = title;
  $('#modalMsg').textContent = message;
  okBtn.textContent = confirmLabel;
  modal.hidden = false;
  cancelBtn.focus();

  return new Promise((resolve) => {
    function close(result) {
      modal.hidden = true;
      modal.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey, true);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve(result);
    }
    function onClick(e) {
      const t = e.target.closest('[data-modal]');
      if (t) close(t.dataset.modal === 'ok');
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      if (e.key === 'Tab') { // keep focus inside the two buttons
        e.preventDefault();
        (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
      }
    }
    modal.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey, true);
  });
}

/* =========================================================
   5. SOUND — tiny synthesized chimes, off by default
   ========================================================= */
const Sound = {
  on: false,
  ctx: null,

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  tone(freq, duration = 0.6, volume = 0.04) {
    if (!this.on) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  },

  chime() {
    this.tone(528, 0.7, 0.035);
    setTimeout(() => this.tone(792, 0.9, 0.02), 90);
  },

  toggle() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      toast('Sound isn’t supported in this browser.');
      return;
    }
    this.on = !this.on;
    const btn = $('#soundToggle');
    btn.setAttribute('aria-pressed', String(this.on));
    btn.title = this.on ? 'Sound on' : 'Sound off';
    if (this.on) this.chime();
    toast(this.on ? 'Sound on' : 'Sound off');
  },
};

/* =========================================================
   6. SCREEN ROUTER
   ========================================================= */
const SCREEN_RENDERERS = {
  quest: () => renderQuest(),
  ending: () => renderEnding(),
  reflections: () => renderDashboard(),
  breathe: () => Breath.renderIdleIfNeeded(),
};

function showScreen(name) {
  if (!$(`.screen[data-screen="${name}"]`)) name = 'home';

  // Leaving the garden pauses the session rather than losing it.
  if (state.screen === 'breathe' && name !== 'breathe') Breath.pause();

  state.screen = name;
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === name));
  $$('.nav-link').forEach((b) => {
    if (b.dataset.nav === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  $('#journeyProgress').hidden = name !== 'quest';
  if (SCREEN_RENDERERS[name]) SCREEN_RENDERERS[name]();

  window.scrollTo({ top: 0, behavior: 'auto' });
  focusScreenHeading(name);
}

function focusScreenHeading(name) {
  const heading = $(`.screen[data-screen="${name}"] [tabindex="-1"]`);
  if (heading) heading.focus({ preventScroll: true });
}

/* =========================================================
   7. BACKGROUND — forest silhouettes + fireflies
   ========================================================= */
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function buildTreeline(container, seed, minH, maxH) {
  const rnd = seededRandom(seed);
  const W = 1200, H = 300;
  let d = `M0 ${H} L0 ${H - 30} L${W} ${H - 30} L${W} ${H} Z`; // ground strip
  let x = -20;
  while (x < W + 20) {
    const w = 24 + rnd() * 40;
    const h = minH + rnd() * (maxH - minH);
    const base = H - 20;
    // layered pine: three stacked triangles
    for (let tier = 0; tier < 3; tier++) {
      const tw = w * (1 - tier * 0.22);
      const top = base - h * (0.55 + tier * 0.22);
      const bottom = base - h * tier * 0.28;
      d += ` M${(x - tw / 2).toFixed(1)} ${bottom.toFixed(1)} L${x.toFixed(1)} ${top.toFixed(1)} L${(x + tw / 2).toFixed(1)} ${bottom.toFixed(1)} Z`;
    }
    x += w * (0.55 + rnd() * 0.4);
  }
  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}"/></svg>`;
}

const Particles = (() => {
  const canvas = $('#particles');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, flies = [], raf = null;

  function spawn() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(0.05 + Math.random() * 0.25),
      phase: Math.random() * Math.PI * 2,
      rgb: Math.random() < 0.7 ? '245,201,106' : '63,209,196',
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(80, (w * h) / 16000));
    flies = Array.from({ length: prefersReducedMotion.matches ? Math.min(count, 30) : count }, spawn);
    draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const moving = !prefersReducedMotion.matches;
    for (const p of flies) {
      if (moving) {
        p.x += p.vx + Math.sin(t / 2000 + p.phase) * 0.12;
        p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
      }
      const alpha = moving ? 0.25 + 0.6 * Math.sin(t / 900 + p.phase) ** 2 : 0.5;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.rgb},${(alpha * 0.18).toFixed(3)})`;
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.rgb},${alpha.toFixed(3)})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(t) {
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    stop();
    if (!prefersReducedMotion.matches) raf = requestAnimationFrame(loop);
    else draw(0);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  return { resize, start, stop };
})();

/* =========================================================
   8. QUEST ENGINE
   ========================================================= */
const STEPS_PER_QUEST = 6; // scene, response, scene, response, reflect, complete

function startJourney() {
  state.journey = newJourney();
  Sound.chime();
  showScreen('quest');
}

function currentQuest() {
  return QUESTS[state.journey.questIndex];
}

function stepNumber(j) {
  if (j.step === 'scene') return j.scene * 2;
  if (j.step === 'response') return j.scene * 2 + 1;
  if (j.step === 'reflect') return 4;
  return 5; // complete
}

function updateJourneyProgress() {
  const j = state.journey;
  if (!j) return;
  const done = j.questIndex * STEPS_PER_QUEST + stepNumber(j) + 1;
  const pct = Math.round((done / (QUESTS.length * STEPS_PER_QUEST)) * 100);
  $('#journeyProgressFill').style.width = pct + '%';
  $('.journey-progress-track').setAttribute('aria-valuenow', String(pct));
  $('#journeyProgressLabel').textContent = `Quest ${j.questIndex + 1} of ${QUESTS.length} · ${currentQuest().title}`;
}

function renderQuest() {
  const j = state.journey;
  const view = $('#questView');
  if (!j || j.finished) {
    view.removeAttribute('data-palette');
    view.innerHTML = `<div class="quest-inner">${emptyState('✦',
      j && j.finished ? 'You’ve finished this journey.' : 'No journey in progress yet.',
      j && j.finished
        ? '<button class="btn btn-primary" data-nav="ending">See your reflection</button>'
        : '<button class="btn btn-primary" data-action="start-journey">Begin your journey</button>')}</div>`;
    $('#journeyProgress').hidden = true;
    return;
  }

  const q = currentQuest();
  view.dataset.palette = q.palette;

  const header = `
    <div class="scene-art" aria-hidden="true"><span class="emblem">${q.emblem}</span></div>
    <div class="quest-inner">
      <div class="quest-head">
        <span class="chip">Quest ${j.questIndex + 1} of ${QUESTS.length}</span>
        <span class="quest-place">${esc(q.place)}</span>
      </div>
      <h2 class="quest-title" tabindex="-1">${esc(q.title)}</h2>`;

  view.innerHTML = `${header}<div class="step-in">${questStepHTML(j, q)}</div></div>`;
  updateJourneyProgress();

  // Focus the most useful element for keyboard users.
  const focusTarget = j.step === 'reflect' ? $('#reflectInput') : $('.quest-title', view);
  if (focusTarget && state.screen === 'quest') focusTarget.focus({ preventScroll: true });
}

function questStepHTML(j, q) {
  switch (j.step) {
    case 'scene': {
      const scene = q.scenes[j.scene];
      const options = scene.options.map((o, i) => `
        <button class="choice" data-choice="${o.id}">
          <span class="key" aria-hidden="true">${i + 1}</span><span>${esc(o.label)}</span>
        </button>`).join('');
      return `
        <div class="narrative">${paras(scene.text)}</div>
        <p class="prompt" id="choicePrompt">${esc(scene.prompt)}</p>
        <div class="choices" role="group" aria-labelledby="choicePrompt">${options}</div>
        <p class="hint">Tip: press 1–${scene.options.length} to choose. There’s no wrong answer.</p>`;
    }
    case 'response': {
      const o = j.lastOption;
      return `
        <div class="you-chose">You chose: <em>${esc(o.label)}</em></div>
        <div class="narrative">${paras(o.response)}</div>
        <div class="actions"><button class="btn btn-primary" data-action="quest-continue">Continue →</button></div>`;
    }
    case 'reflect':
      return `
        <p class="eyebrow">A moment for you · optional</p>
        <label class="reflect-q" for="reflectInput">${esc(q.reflect)}</label>
        <textarea id="reflectInput" rows="4" maxlength="1500" placeholder="Write as much or as little as you like…">${esc(j.answers[q.id] || '')}</textarea>
        <p class="fine">Stays on this device. It’s only stored if you choose to save your journey at the end.</p>
        <div class="actions">
          <button class="btn btn-ghost" data-action="reflect-skip">Skip</button>
          <button class="btn btn-primary" data-action="reflect-keep">Keep my answer</button>
        </div>`;
    case 'complete': {
      const next = QUESTS[j.questIndex + 1];
      return `
        <span class="complete-badge">✦ Quest complete</span>
        <div class="narrative">${paras(q.outro)}</div>
        ${next ? `<p class="next-up">Next: <strong>${esc(next.title)}</strong> — ${esc(next.teaser)}</p>` : ''}
        <div class="actions">
          <button class="btn btn-primary" data-action="quest-next">${next ? `Enter ${esc(next.place)} →` : 'Reveal your reflection ✦'}</button>
        </div>`;
    }
    default:
      return '';
  }
}

function chooseOption(optionId) {
  const j = state.journey;
  if (!j || j.step !== 'scene') return;
  const q = currentQuest();
  const option = q.scenes[j.scene].options.find((o) => o.id === optionId);
  if (!option) return;

  j.choices.push({
    questId: q.id,
    questTitle: q.title,
    scene: j.scene,
    optionId: option.id,
    label: option.label,
    themes: option.themes,
    epilogue: option.epilogue || null,
  });
  j.lastOption = option;
  j.step = 'response';
  Sound.chime();
  renderQuest();
}

function continueQuest() {
  const j = state.journey;
  if (!j || j.step !== 'response') return;
  if (j.scene < currentQuest().scenes.length - 1) {
    j.scene += 1;
    j.step = 'scene';
  } else {
    j.step = 'reflect';
  }
  renderQuest();
}

function finishReflection(keep) {
  const j = state.journey;
  if (!j || j.step !== 'reflect') return;
  const q = currentQuest();
  const text = ($('#reflectInput')?.value || '').trim();
  if (keep && text) j.answers[q.id] = text;
  else delete j.answers[q.id];
  j.step = 'complete';
  renderQuest();
}

function nextQuest() {
  const j = state.journey;
  if (!j || j.step !== 'complete') return;
  if (j.questIndex < QUESTS.length - 1) {
    j.questIndex += 1;
    j.scene = 0;
    j.step = 'scene';
    j.lastOption = null;
    Sound.chime();
    renderQuest();
    window.scrollTo({ top: 0, behavior: 'auto' });
  } else {
    j.finished = true;
    j.result = Reflection.summarize(j.choices);
    showScreen('ending');
  }
}

/* =========================================================
   9. REFLECTION ENGINE — transparent rules, no AI, no diagnosis
   Each choice adds its theme weights. The highest-scoring themes
   shape the summary. Ties keep the THEMES order.
   ========================================================= */
const Reflection = {
  score(choices) {
    const scores = Object.fromEntries(Object.keys(THEMES).map((k) => [k, 0]));
    choices.forEach((c) => {
      Object.entries(c.themes).forEach(([theme, weight]) => {
        if (theme in scores) scores[theme] += weight;
      });
    });
    return scores;
  },

  rank(scores) {
    return Object.keys(THEMES)
      .filter((k) => scores[k] > 0)
      .sort((a, b) => scores[b] - scores[a]);
  },

  summarize(choices) {
    const scores = this.score(choices);
    const ranked = this.rank(scores);
    const top = ranked.slice(0, 2);
    const lead = THEMES[top[0]] || THEMES.reflection;

    const opening = top.length > 1
      ? `Your choices today suggest that ${THEMES[top[0]].phrase} and ${THEMES[top[1]].phrase} may be close to the surface for you right now.`
      : `Your choices today suggest that ${lead.phrase} may be close to the surface for you right now.`;

    const epilogue = choices.filter((c) => c.epilogue).map((c) => c.epilogue);
    epilogue.push(`Wherever the road goes next, you’ll carry the light you found along the way.`);

    return {
      scores,
      top,
      title: lead.ending.title,
      subtitle: lead.ending.sub,
      opening,
      insights: top.map((k) => ({ key: k, ...THEMES[k] })),
      epilogue,
    };
  },
};

/** Shared theme bar chart (ending + dashboard). */
function themeBarsHTML(scores) {
  const max = Math.max(1, ...Object.values(scores));
  return `<ul class="bars" aria-label="Theme scores">` +
    Object.entries(THEMES).map(([key, t]) => {
      const value = scores[key] || 0;
      return `
        <li class="bar-row" style="--c:${t.color}">
          <span class="bar-label">${t.short}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${Math.round((value / max) * 100)}%"></span></span>
          <span class="bar-val">${value}</span>
        </li>`;
    }).join('') + `</ul>`;
}

function themeTagsHTML(themes) {
  return Object.keys(themes)
    .map((k) => `<span class="tag" style="--c:${THEMES[k].color}">${THEMES[k].short} +${themes[k]}</span>`)
    .join('');
}

/* =========================================================
   10. ENDING SCREEN
   ========================================================= */
function renderEnding() {
  const view = $('#endingView');
  const j = state.journey;

  if (!j || !j.finished || !j.result) {
    view.innerHTML = `<div class="page-head"><h2 tabindex="-1">Your reflection</h2></div>` +
      emptyState('☾', 'Finish a journey to receive a personal reflection.',
        '<button class="btn btn-primary" data-action="start-journey">Begin your journey</button>');
    return;
  }

  const r = j.result;
  const answers = QUESTS.filter((q) => j.answers[q.id]);

  view.innerHTML = `
    <header class="ending-hero">
      <span class="ending-sigil" aria-hidden="true">✦</span>
      <p class="eyebrow">Your journey’s end</p>
      <h2 tabindex="-1">${esc(r.title)}</h2>
      <p class="ending-sub">${esc(r.subtitle)}</p>
    </header>
    <div class="epilogue">${paras(r.epilogue)}</div>

    <div class="ending-grid">
      <section class="panel" aria-labelledby="yrTitle">
        <h3 id="yrTitle">Your reflection</h3>
        <p class="lead">${esc(r.opening)}</p>
        ${r.insights.map((i) => `
          <div class="insight" style="--c:${i.color}">
            <span class="dot" aria-hidden="true"></span>
            <div><h4>${esc(i.label)}</h4><p>${esc(i.insight)}</p></div>
          </div>`).join('')}

        <div class="feedback">
          <p class="feedback-q" id="fbQ">Does this reflection fit you?</p>
          <div class="feedback-btns" role="group" aria-labelledby="fbQ">
            <button class="btn btn-small btn-ghost" data-action="feedback" data-value="accurate" aria-pressed="${j.feedback === 'accurate'}">This feels accurate</button>
            <button class="btn btn-small btn-ghost" data-action="feedback" data-value="inaccurate" aria-pressed="${j.feedback === 'inaccurate'}">This doesn’t feel accurate</button>
          </div>
          <p class="feedback-msg" id="feedbackMsg" aria-live="polite">${feedbackMessage(j.feedback)}</p>
        </div>

        <p class="disclaimer">This reflection is generated from your gameplay choices using simple, visible rules. Choices are not clinical assessments: MindQuest does not diagnose anxiety, depression or any other condition, and game choices cannot reliably identify mental illness. You are the expert on your own experience.</p>
      </section>

      <div style="display:grid;gap:16px">
        <section class="panel" aria-labelledby="tsTitle">
          <h3 id="tsTitle">Theme scores</h3>
          ${themeBarsHTML(r.scores)}
          <details class="how-generated">
            <summary>How was this generated?</summary>
            <p class="fine">Each choice adds points to one or two themes. The two highest themes shape your reflection.</p>
            <ul>${j.choices.map((c) => `<li><strong>${esc(c.questTitle)}:</strong> ${esc(c.label)}<br>${themeTagsHTML(c.themes)}</li>`).join('')}</ul>
          </details>
        </section>

        ${answers.length ? `
        <section class="panel" aria-labelledby="wdTitle">
          <h3 id="wdTitle">Your words along the way</h3>
          <ul class="words-list">${answers.map((q) => `<li><span class="q">${esc(q.reflect)}</span><span class="a">${esc(j.answers[q.id])}</span></li>`).join('')}</ul>
        </section>` : ''}
      </div>
    </div>

    <div class="ending-actions">
      <button class="btn btn-primary" data-action="save-journey" ${j.savedId ? 'disabled' : ''}>${j.savedId ? 'Saved to My Reflections ✓' : 'Save to My Reflections'}</button>
      <button class="btn btn-ghost" data-nav="breathe">Restore the Light ☾</button>
      <button class="btn btn-ghost" data-nav="reflections">My reflections</button>
      <button class="btn btn-ghost" data-action="start-journey">Play again</button>
    </div>`;
}

function feedbackMessage(value) {
  if (value === 'accurate') return 'Thank you. Noticing what resonates is a small act of self-understanding.';
  if (value === 'inaccurate') return 'Thank you — you know yourself best. You could note what feels truer in your journal.';
  return '';
}

function setFeedback(value) {
  const j = state.journey;
  if (!j || !j.finished) return;
  j.feedback = value;
  $$('[data-action="feedback"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  $('#feedbackMsg').textContent = feedbackMessage(value);

  // Keep a saved copy in sync.
  const saved = j.savedId && state.data.journeys.find((x) => x.id === j.savedId);
  if (saved) { saved.feedback = value; persist(); }
}

function saveJourney() {
  const j = state.journey;
  if (!j || !j.finished || !j.result) return;
  if (j.savedId) { toast('This journey is already saved.'); return; }

  const record = {
    id: uid(),
    date: new Date().toISOString(),
    title: j.result.title,
    top: j.result.top,
    scores: j.result.scores,
    choices: j.choices.map((c) => ({ quest: c.questTitle, label: c.label })),
    answers: QUESTS.filter((q) => j.answers[q.id]).map((q) => ({ question: q.reflect, text: j.answers[q.id] })),
    feedback: j.feedback,
  };
  state.data.journeys.unshift(record);
  if (!persist()) { state.data.journeys.shift(); return; }

  j.savedId = record.id;
  toast('Journey saved to My Reflections.');
  $$('[data-action="save-journey"]').forEach((b) => { b.disabled = true; b.textContent = 'Saved to My Reflections ✓'; });
  if (state.screen === 'reflections') renderDashboard();
}

/* =========================================================
   11. RESTORE THE LIGHT — guided breathing
   Comfortable rhythm: 4s in, 6s out, no breath holding.
   Driven by requestAnimationFrame so pause/resume is exact.
   ========================================================= */
const Breath = {
  INHALE: 4,
  EXHALE: 6,
  minutes: 5,
  elapsed: 0,
  status: 'idle',      // idle | running | paused | done
  raf: null,
  lastTime: 0,
  lastPhase: null,
  flowersBuilt: false,

  get cycle() { return this.INHALE + this.EXHALE; },
  get total() { return this.minutes * 60; },
  get totalCycles() { return Math.round(this.total / this.cycle); },

  buildFlowers() {
    if (this.flowersBuilt) return;
    const colors = ['#f5c96a', '#3fd1c4', '#b3a2ff', '#ff9db5', '#8fb8ff'];
    const rnd = seededRandom(42);
    const count = 16;
    const html = Array.from({ length: count }, (_, i) => {
      const x = 5 + rnd() * 90;
      const y = 4 + rnd() * 22;
      const s = 10 + rnd() * 14;
      const at = (i + 1) / (count + 1);
      return `<span class="flower" data-at="${at.toFixed(3)}" style="--x:${x}%;--y:${y}%;--s:${s}px;--fc:${colors[i % colors.length]}"></span>`;
    });
    $('#gardenFlowers').innerHTML = html.join('');
    this.flowersBuilt = true;
  },

  setMinutes(min) {
    if (this.status === 'running' || this.status === 'paused') return;
    this.minutes = [1, 3, 5].includes(min) ? min : 5;
    this.reset();
  },

  reset() {
    this.stopLoop();
    this.status = 'idle';
    this.elapsed = 0;
    this.lastPhase = null;
    $('#breathDone').hidden = true;
    $('#breathCue').textContent = 'Press start when you’re ready.';
    this.render();
    this.updateControls();
  },

  renderIdleIfNeeded() {
    this.buildFlowers();
    this.render();
    this.updateControls();
  },

  start() {
    if (this.status === 'running') return;
    if (this.status === 'done') this.reset();
    this.status = 'running';
    this.lastTime = performance.now();
    this.updateControls();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  },

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.stopLoop();
    $('#breathCue').textContent = 'Paused — resume whenever you like.';
    this.updateControls();
  },

  togglePause() {
    if (this.status === 'running') this.pause();
    else if (this.status === 'paused') this.start();
  },

  exit() {
    this.reset();
    showScreen('home');
  },

  stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  },

  tick(now) {
    if (this.status !== 'running') return;
    // Cap dt so a hidden tab doesn't fast-forward the session.
    const dt = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.elapsed = Math.min(this.elapsed + dt, this.total);
    this.render();
    if (this.elapsed >= this.total) { this.complete(); return; }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  },

  complete() {
    this.stopLoop();
    this.status = 'done';
    this.elapsed = this.total;
    this.render();
    $('#breathCue').textContent = 'The light is restored.';
    $('#breathDone').hidden = false;
    this.updateControls();
    Sound.chime();
  },

  /** Paint orb size, garden brightness, progress and counters from `elapsed`. */
  render() {
    const garden = $('#garden');
    const progress = this.total ? this.elapsed / this.total : 0;
    let level = 0.3;

    if (this.status === 'running' || this.status === 'paused') {
      const t = this.elapsed % this.cycle;
      const inhaling = t < this.INHALE;
      const p = inhaling ? t / this.INHALE : (t - this.INHALE) / this.EXHALE;
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
      level = inhaling ? eased : 1 - eased;

      if (this.status === 'running') {
        const phase = inhaling ? 'in' : 'out';
        if (phase !== this.lastPhase) {
          this.lastPhase = phase;
          $('#breathCue').textContent = inhaling ? 'Breathe in, gently…' : 'And slowly breathe out…';
          Sound.tone(inhaling ? 392 : 294, inhaling ? 1.6 : 2.2, 0.025);
        }
      }
    } else if (this.status === 'done') {
      level = 0.75;
    }

    garden.style.setProperty('--breath', level.toFixed(3));
    garden.style.setProperty('--light', progress.toFixed(3));
    $$('.flower', garden).forEach((f) => f.classList.toggle('bloom', progress >= Number(f.dataset.at)));

    const pct = Math.round(progress * 100);
    $('#breathBar').style.width = pct + '%';
    $('#breathMeter').setAttribute('aria-valuenow', String(pct));

    const left = Math.max(0, Math.ceil(this.total - this.elapsed));
    $('#breathTime').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`;
    const breaths = Math.min(this.totalCycles, Math.floor(this.elapsed / this.cycle) + (this.status === 'idle' ? 0 : 1));
    $('#breathCycle').textContent = `Breath ${this.status === 'done' ? this.totalCycles : breaths} of ${this.totalCycles}`;
  },

  updateControls() {
    const startBtn = $('#breathStart');
    const pauseBtn = $('#breathPause');
    const active = this.status === 'running' || this.status === 'paused';
    startBtn.hidden = active || this.status === 'done';
    pauseBtn.hidden = !active;
    pauseBtn.textContent = this.status === 'paused' ? 'Resume' : 'Pause';
    $('#breathDuration').disabled = active;
  },
};

/* =========================================================
   12. MY REFLECTIONS DASHBOARD
   ========================================================= */
function renderDashboard() {
  renderJourneySummary();
  renderThemeBoard();
  renderMoods();
  renderJournal();
}

function renderJourneySummary() {
  const box = $('#dashJourney');
  const journeys = state.data.journeys;
  const j = state.journey;
  let html = '';

  if (j && j.finished && !j.savedId) {
    html += `
      <div class="unsaved">
        <p>You finished a journey as <strong>${esc(j.result.title)}</strong> but haven’t saved it.</p>
        <div class="row-actions">
          <button class="btn btn-small btn-primary" data-action="save-journey">Save it</button>
          <button class="btn btn-small btn-ghost" data-nav="ending">View reflection</button>
        </div>
      </div>`;
  }

  if (!journeys.length) {
    box.innerHTML = html + emptyState('⛰', 'No saved journeys yet. Complete the three quests and choose “Save to My Reflections”.',
      '<button class="btn btn-small btn-primary" data-action="start-journey">Begin your journey</button>');
    return;
  }

  const [latest, ...older] = journeys;
  html += `
    <div class="journey-latest">
      <p class="meta">Most recent · ${formatDate(latest.date)}</p>
      <h4>${esc(latest.title)}</h4>
      ${(latest.top || []).filter((k) => THEMES[k]).map((k) => `<span class="pill" style="--c:${THEMES[k].color}">${THEMES[k].label}</span>`).join('')}
      ${latest.feedback ? `<p class="meta" style="margin-top:8px">You marked this as ${latest.feedback === 'accurate' ? '“feels accurate”' : '“doesn’t feel accurate”'}.</p>` : ''}
      <ul class="words-list" style="margin-top:8px">
        ${(latest.choices || []).map((c) => `<li><span class="q">${esc(c.quest)}</span><span class="a">${esc(c.label)}</span></li>`).join('')}
      </ul>
      <div class="row-actions"><button class="mini-btn danger" data-action="delete-journey" data-id="${esc(latest.id)}">Delete</button></div>
    </div>`;

  if (older.length) {
    html += `<p class="meta">Earlier journeys</p><ul class="entry-list">` + older.map((x) => `
      <li class="entry">
        <div class="entry-head">
          <span><strong>${esc(x.title)}</strong><br><span class="meta">${formatDate(x.date)}</span></span>
          <button class="mini-btn danger" data-action="delete-journey" data-id="${esc(x.id)}">Delete</button>
        </div>
      </li>`).join('') + `</ul>`;
  }
  box.innerHTML = html;
}

function renderThemeBoard() {
  const box = $('#dashThemes');
  const journeys = state.data.journeys;
  if (!journeys.length) {
    box.innerHTML = emptyState('◎', 'Your themes will glow here once you save a journey.');
    return;
  }
  const totals = Object.fromEntries(Object.keys(THEMES).map((k) => [k, 0]));
  journeys.forEach((j) => Object.keys(totals).forEach((k) => { totals[k] += Number(j.scores?.[k]) || 0; }));
  const max = Math.max(1, ...Object.values(totals));
  const topKey = Reflection.rank(totals)[0];

  box.innerHTML = `<div class="theme-cards">` + Object.entries(THEMES).map(([k, t]) => `
    <div class="theme-card ${k === topKey ? 'is-top' : ''}" style="--c:${t.color}">
      <div class="theme-card-head">
        <span class="theme-name"><span class="theme-glyph" aria-hidden="true">${t.glyph}</span>${t.label}</span>
        <span class="theme-count" aria-label="${totals[k]} points">${totals[k]}</span>
      </div>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.round((totals[k] / max) * 100)}%"></span></span>
    </div>`).join('') + `</div>
    <p class="fine">Across ${journeys.length} saved journey${journeys.length === 1 ? '' : 's'}. Patterns in a game are prompts for curiosity, not conclusions.</p>`;
}

function renderMoods() {
  $('#moodOptions').innerHTML = MOODS.map((m) => `
    <button class="mood-btn" data-mood="${m.id}" style="--c:${m.color}" aria-pressed="${state.selectedMood === m.id}">
      <span class="mood-glyph" aria-hidden="true">${m.glyph}</span>${m.label}
    </button>`).join('');
  $('#moodLog').disabled = !state.selectedMood;

  const recent = state.data.moods.slice(0, 10);
  $('#moodHistory').innerHTML = recent.length
    ? `<p class="meta" style="margin:14px 0 0">Recent check-ins</p><div class="mood-history">` + recent.map((entry) => {
        const m = MOODS.find((x) => x.id === entry.mood) || MOODS[2];
        const d = new Date(entry.date);
        return `<div class="mood-dot" style="--c:${m.color}" title="${esc(m.label)} · ${esc(formatDate(entry.date))}">
          <span aria-hidden="true">${m.glyph}</span><span>${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
          <span class="sr-only">${esc(m.label)}</span></div>`;
      }).join('') + `</div>`
    : `<p class="fine">No check-ins yet.</p>`;
}

function selectMood(id) {
  state.selectedMood = state.selectedMood === id ? null : id;
  renderMoods();
  const btn = $(`[data-mood="${id}"]`);
  if (btn) btn.focus();
}

function logMood() {
  if (!state.selectedMood) return;
  state.data.moods.unshift({ id: uid(), date: new Date().toISOString(), mood: state.selectedMood });
  if (!persist()) { state.data.moods.shift(); return; }
  state.selectedMood = null;
  renderMoods();
  toast('Mood logged. Thank you for checking in.');
}

function renderJournal() {
  $('#promptChips').innerHTML = JOURNAL_PROMPTS
    .map((p, i) => `<button class="prompt-chip" data-prompt="${i}">${esc(p)}</button>`).join('');

  const list = $('#journalList');
  const entries = state.data.journal;
  if (!entries.length) {
    list.innerHTML = `<li>${emptyState('✎', 'Your journal is empty. Write a line — even one word counts.')}</li>`;
  } else {
    list.innerHTML = entries.map((e) => `
      <li class="entry ${state.editingEntryId === e.id ? 'is-editing' : ''}">
        <div class="entry-head">
          <span class="meta">${formatDate(e.date)}${e.updated ? ' · edited' : ''}</span>
          <span class="entry-actions">
            <button class="mini-btn" data-action="journal-edit" data-id="${esc(e.id)}">Edit</button>
            <button class="mini-btn danger" data-action="journal-delete" data-id="${esc(e.id)}">Delete</button>
          </span>
        </div>
        <p class="entry-text">${esc(e.text)}</p>
      </li>`).join('');
  }

  const editing = Boolean(state.editingEntryId);
  $('#journalSave').textContent = editing ? 'Update entry' : 'Save entry';
  $('#journalCancel').hidden = !editing;
}

function usePrompt(index) {
  const prompt = JOURNAL_PROMPTS[index];
  const ta = $('#journalText');
  if (!prompt) return;
  ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${prompt}\n` : `${prompt}\n`;
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

function saveJournalEntry() {
  const ta = $('#journalText');
  const text = ta.value.trim();
  if (!text) { toast('Write something first — even a single word.'); ta.focus(); return; }

  if (state.editingEntryId) {
    const entry = state.data.journal.find((e) => e.id === state.editingEntryId);
    if (entry) {
      const before = { ...entry };
      entry.text = text;
      entry.updated = new Date().toISOString();
      if (!persist()) { Object.assign(entry, before); return; }
      toast('Entry updated.');
    }
    state.editingEntryId = null;
  } else {
    state.data.journal.unshift({ id: uid(), date: new Date().toISOString(), text });
    if (!persist()) { state.data.journal.shift(); return; }
    toast('Entry saved privately on this device.');
  }
  ta.value = '';
  renderJournal();
}

function editJournalEntry(id) {
  const entry = state.data.journal.find((e) => e.id === id);
  if (!entry) return;
  state.editingEntryId = id;
  const ta = $('#journalText');
  ta.value = entry.text;
  renderJournal();
  ta.focus();
}

function cancelJournalEdit() {
  state.editingEntryId = null;
  $('#journalText').value = '';
  renderJournal();
}

async function deleteJournalEntry(id) {
  const ok = await confirmDialog({ title: 'Delete this entry?', message: 'This journal entry will be permanently removed from this device.', confirmLabel: 'Delete' });
  if (!ok) return;
  state.data.journal = state.data.journal.filter((e) => e.id !== id);
  if (state.editingEntryId === id) { state.editingEntryId = null; $('#journalText').value = ''; }
  persist();
  renderJournal();
  toast('Entry deleted.');
}

async function deleteJourney(id) {
  const ok = await confirmDialog({ title: 'Delete this journey?', message: 'The saved journey and its reflection answers will be removed from this device.', confirmLabel: 'Delete' });
  if (!ok) return;
  state.data.journeys = state.data.journeys.filter((j) => j.id !== id);
  if (state.journey && state.journey.savedId === id) state.journey.savedId = null;
  persist();
  renderDashboard();
  toast('Journey deleted.');
}

async function clearAllData() {
  const ok = await confirmDialog({
    title: 'Clear all data?',
    message: 'Every saved journey, mood check-in and journal entry will be erased from this browser. This can’t be undone.',
    confirmLabel: 'Clear everything',
  });
  if (!ok) return;
  Store.clear();
  state.data = Store.empty();
  state.selectedMood = null;
  state.editingEntryId = null;
  $('#journalText').value = '';
  if (state.journey) state.journey.savedId = null;
  renderDashboard();
  toast('All data cleared.');
}

async function resetGame() {
  const ok = await confirmDialog({
    title: 'Restart MindQuest?',
    message: 'Your current journey and breathing session will reset. Saved reflections stay safe.',
    confirmLabel: 'Restart',
  });
  if (!ok) return;
  state.journey = null;
  Breath.reset();
  showScreen('home');
  toast('Fresh start. Welcome back.');
}

/* =========================================================
   13. EVENT WIRING & INIT
   ========================================================= */
const ACTIONS = {
  'start-journey': startJourney,
  'toggle-sound': () => Sound.toggle(),
  'reset-game': resetGame,
  'quest-continue': continueQuest,
  'reflect-skip': () => finishReflection(false),
  'reflect-keep': () => finishReflection(true),
  'quest-next': nextQuest,
  'feedback': (el) => setFeedback(el.dataset.value),
  'save-journey': saveJourney,
  'breath-start': () => Breath.start(),
  'breath-pause': () => Breath.togglePause(),
  'breath-exit': () => Breath.exit(),
  'breath-again': () => { Breath.reset(); Breath.start(); },
  'log-mood': logMood,
  'journal-save': saveJournalEntry,
  'journal-cancel': cancelJournalEdit,
  'journal-edit': (el) => editJournalEntry(el.dataset.id),
  'journal-delete': (el) => deleteJournalEntry(el.dataset.id),
  'delete-journey': (el) => deleteJourney(el.dataset.id),
  'clear-data': clearAllData,
};

function onDocumentClick(e) {
  const target = e.target.closest('[data-nav], [data-action], [data-choice], [data-mood], [data-prompt]');
  if (!target || target.disabled) return;

  if (target.dataset.nav) { showScreen(target.dataset.nav); return; }
  if (target.dataset.choice) { chooseOption(target.dataset.choice); return; }
  if (target.dataset.mood) { selectMood(target.dataset.mood); return; }
  if (target.dataset.prompt !== undefined) { usePrompt(Number(target.dataset.prompt)); return; }

  const handler = ACTIONS[target.dataset.action];
  if (handler) handler(target);
  else console.warn('MindQuest: no handler for action', target.dataset.action);
}

function onKeyDown(e) {
  if (!$('#modal').hidden) return;
  const typing = e.target.matches('textarea, input[type="text"]');

  // Number keys pick a choice during quests.
  if (state.screen === 'quest' && !typing && state.journey?.step === 'scene' && /^[1-9]$/.test(e.key)) {
    const btn = $$('#questView .choice')[Number(e.key) - 1];
    if (btn) { e.preventDefault(); btn.click(); }
  }

  // Ctrl/Cmd + Enter saves a journal entry.
  if (e.target.id === 'journalText' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveJournalEntry();
  }
}

function init() {
  buildTreeline($('#treesFar'), 7, 120, 230);
  buildTreeline($('#treesNear'), 19, 80, 170);

  Particles.resize();
  Particles.start();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(Particles.resize, 150);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? Particles.stop() : Particles.start()));
  prefersReducedMotion.addEventListener?.('change', () => { Particles.resize(); Particles.start(); });

  Breath.buildFlowers();
  Breath.reset();

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
  $('#breathDuration').addEventListener('change', (e) => {
    if (e.target.name === 'breathLen') Breath.setMinutes(Number(e.target.value));
  });

  // Respect a deep link like index.html#reflections
  const hash = location.hash.replace('#', '');
  if (hash && hash !== 'main' && ['how', 'reflections', 'breathe', 'about'].includes(hash)) showScreen(hash);
}

init();
