let VERBS = [];
let verbsLoaded = false;

// état global
let gameMode = null;
let difficultyLevel = 1;
let totalQuestions = 0;
let currentIndex = 0;
let score = 0;
let mistakes = [];
let learningQueue = [];
let currentVerb = null;
let currentQuestion = null;
let translationVisible = false;

// streak
let combo = 0;
let maxCombo = 0;

// duel
let duelPlayer = 1;
let duelScores = { 1: 0, 2: 0 };

// examen timer
let examTimer = null;
let examTimeLeft = 0;

// identité & suivi de séance
let studentIdentity = { firstName: "", classLabel: "" };
let sessionResults = [];
// DOM refs
const home = document.getElementById("home");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const result = document.getElementById("result");

const gameTitle = document.getElementById("game-title");
const questionCtr = document.getElementById("question-counter");
const timerEl = document.getElementById("timer");
const duelInfo = document.getElementById("duel-info");
const duelPlayersEl = document.getElementById("duel-players");
const player1Card = document.getElementById("player1-card");
const player2Card = document.getElementById("player2-card");
const player1ScoreEl = document.getElementById("player1-score");
const player2ScoreEl = document.getElementById("player2-score");

const wordEl = document.getElementById("word");
const translationEl = document.getElementById("translation");
const toggleTransBtn = document.getElementById("toggle-translation");
const stepLabel = document.getElementById("step-label");
const btnGroup = document.getElementById("btn-group");
const puzzleArea = document.getElementById("puzzle-area");
const feedbackEl = document.getElementById("feedback");
const nextBtn = document.getElementById("next");
const scoreText = document.getElementById("score-text");
const badgeRow = document.getElementById("badge-row");
const mistakeList = document.getElementById("mistake-list");
const summaryEl = document.getElementById("summary");
const audioVerbBtn = document.getElementById("audio-verb-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// QR section
const qrSectionEl = document.getElementById("qr-section");
const qrBoxEl = document.getElementById("qrBox");
const downloadQrBtn = document.getElementById("download-qr-btn");

// Modals
const identityModal = document.getElementById("identity-modal");
const identityFirstNameInput = document.getElementById("student-firstname");
const identityClassInput = document.getElementById("student-class");

const sessionModal = document.getElementById("session-modal");
const sessionContinueBtn = document.getElementById("session-continue-btn");
const sessionQrBtn = document.getElementById("session-qr-btn");
// =====================
// THEME HANDLING
// =====================

(function initTheme() {
  const stored = localStorage.getItem("ivt-theme");
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
  } else {
    applyTheme("dark");
  }

  // identité éventuelle en cache
  const storedIdentity = localStorage.getItem("ivt-student");
  if (storedIdentity) {
    try {
      const obj = JSON.parse(storedIdentity);
      if (obj && obj.firstName && obj.classLabel) {
        studentIdentity = obj;
      }
    } catch (e) {
      console.warn("Cannot parse stored identity", e);
    }
  }
})();

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.contains("theme-dark");
  applyTheme(isDark ? "light" : "dark");
});

function applyTheme(theme) {
  document.body.classList.remove("theme-dark", "theme-light");
  document.body.classList.add(`theme-${theme}`);
  themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("ivt-theme", theme);
}

// =====================
// AUDIO : prononciation
// =====================

audioVerbBtn.addEventListener("click", () => {
  if (!currentVerb) return;
  speakText(currentVerb.inf);
});

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("La synthèse vocale n'est pas supportée sur ce navigateur.");
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
// =====================
// NAVIGATION
// =====================

function goToMenu() {
  home.classList.add("hidden");
  result.classList.add("hidden");
  game.classList.add("hidden");
  menu.classList.remove("hidden");

  ensureIdentity();
}

function backHome() {
  stopExamTimer();
  menu.classList.add("hidden");
  game.classList.add("hidden");
  result.classList.add("hidden");
  home.classList.remove("hidden");
  clearModeSelection();
}

// =====================
// DIFFICULTÉ
// =====================

function setDifficulty(n, el) {
  difficultyLevel = n;
  clearDifficultySelection();
  if (el) el.classList.add("selected");
}

function clearDifficultySelection() {
  document
    .querySelectorAll(".difficulty-buttons button")
    .forEach(b => b.classList.remove("selected"));
}

// =====================
// MODES DE JEU
// =====================

function selectMode(mode, el) {
  gameMode = mode;
  clearModeSelection();
  if (el) el.classList.add("selected");
}

function clearModeSelection() {
  document
    .querySelectorAll(".mode-card")
    .forEach(c => c.classList.remove("selected"));
}

// =====================
// NOMBRE DE QUESTIONS
// =====================

function clearQuestionSelection() {
  document
    .querySelectorAll(".question-buttons button")
    .forEach(b => b.classList.remove("selected"));
}

function selectQuestionCount(n, el) {
  if (!gameMode) {
    alert("Choisis un mode d'abord.");
    return;
  }
  totalQuestions = n;
  clearQuestionSelection();
  if (el) el.classList.add("selected");
  startGame();
}
// =====================
// CHARGEMENT DES VERBES
// =====================

async function loadVerbs() {
  try {
    const res = await fetch("verbs.json");
    VERBS = await res.json();
    verbsLoaded = Array.isArray(VERBS) && VERBS.length > 0;
  } catch (e) {
    console.error(e);
    wordEl.textContent = "Erreur de chargement des verbes.";
  }
}

// =====================
// DÉMARRAGE DU JEU
// =====================

async function startGame() {
  if (!verbsLoaded) {
    await loadVerbs();
  }

  score = 0;
  mistakes = [];
  learningQueue = [];
  currentIndex = 0;
  translationVisible = false;
  combo = 0;
  maxCombo = 0;

  duelPlayer = 1;
  duelScores = { 1: 0, 2: 0 };
  duelInfo.textContent = "";
  duelPlayersEl.classList.add("hidden");
  player1Card.classList.remove("duel-active");
  player2Card.classList.remove("duel-active");
  player1ScoreEl.textContent = "0";
  player2ScoreEl.textContent = "0";

  menu.classList.add("hidden");
  result.classList.add("hidden");
  game.classList.remove("hidden");

  gameTitle.textContent =
    gameMode === "classic" ? "Mode classique" :
    gameMode === "qcm" ? "Mode QCM" :
    gameMode === "learning" ? "Mode apprentissage" :
    gameMode === "exam" ? "Mode examen" :
    gameMode === "puzzle" ? "Mode puzzle" :
    gameMode === "duel" ? "Mode duel" :
    "Mode flashcards";

  if (gameMode === "exam") {
    examTimeLeft = totalQuestions * 20;
    startExamTimer();
    toggleTransBtn.style.display = "none";
  } else {
    stopExamTimer();
    timerEl.textContent = "";
    toggleTransBtn.style.display = "inline-block";
  }

  if (gameMode === "duel") {
    duelInfo.textContent = "Joueur 1 commence.";
    duelPlayersEl.classList.remove("hidden");
    updateDuelVisual();
  }

  nextQuestion();
}
// =====================
// OUTILS D’AFFICHAGE QUESTION
// =====================

toggleTransBtn.addEventListener("click", () => {
  translationVisible = !translationVisible;
  updateTranslationDisplay();
});

function updateTranslationDisplay() {
  if (translationVisible && currentVerb) {
    translationEl.textContent = currentVerb.fr || "";
    toggleTransBtn.textContent = "Masquer la traduction";
  } else {
    translationEl.textContent = "";
    toggleTransBtn.textContent = "📘 Voir la traduction";
  }
}

function resetUIForQuestion() {
  btnGroup.innerHTML = "";
  puzzleArea.innerHTML = "";
  feedbackEl.innerHTML = "";
  nextBtn.style.display = "none";
  stepLabel.textContent = "";
  updateTranslationDisplay();
}

// =====================
// QUESTION SUIVANTE
// =====================

function nextQuestion() {
  resetUIForQuestion();

  if (
    gameMode !== "learning" &&
    gameMode !== "puzzle" &&
    gameMode !== "duel" &&
    gameMode !== "flashcards" &&
    currentIndex >= totalQuestions
  ) {
    endGame();
    return;
  }

  if (
    (gameMode === "duel" ||
      gameMode === "puzzle" ||
      gameMode === "flashcards") &&
    currentIndex >= totalQuestions
  ) {
    endGame();
    return;
  }

  currentIndex++;
  questionCtr.textContent = `Question ${currentIndex} / ${totalQuestions}`;

  let v;
  if (gameMode === "learning" && learningQueue.length > 0) {
    v = learningQueue.shift();
  } else {
    v = VERBS[Math.floor(Math.random() * VERBS.length)];
  }

  currentVerb = v;
  wordEl.textContent = v.inf;

  if (gameMode === "classic" || gameMode === "exam" || gameMode === "duel") {
    loadClassicQuestion();
  } else if (gameMode === "qcm") {
    loadQcmQuestion();
  } else if (gameMode === "learning") {
    loadLearningQuestion();
  } else if (gameMode === "puzzle") {
    loadPuzzleQuestion(); // ← version corrigée iPad
  } else if (gameMode === "flashcards") {
    loadFlashcardQuestion();
  }
}
// =====================
// UTILITAIRES
// =====================

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function reverseString(s) {
  return s.split("").reverse().join("");
}

function pickDifferent(list, correct) {
  const filtered = list.filter(w => w && w !== correct);
  if (filtered.length === 0) return correct;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function generateFakePast(v) {
  const base = v.inf;
  const variants = [
    base + "ed",
    base + "d",
    v.past.replace(/a/g, "e"),
    v.past.replace(/e/g, "a"),
    v.past + "ed",
    v.part,
    base + "t",
    base.substring(0, base.length - 1) + "ed",
    reverseString(v.past)
  ];
  return pickDifferent(variants, v.past);
}

function generateFakePart(v) {
  const base = v.inf;
  const variants = [
    base + "ed",
    base + "en",
    v.part.replace(/e/g, "a"),
    v.part.replace(/a/g, "e"),
    v.past + "en",
    "un" + v.part,
    v.part + "ed",
    reverseString(v.part)
  ];
  return pickDifferent(variants, v.part);
}

function mutateForm(form) {
  if (!form || form.length < 2) return form;
  const idx = Math.floor(Math.random() * (form.length - 1));
  const chars = form.split("");
  const action = Math.floor(Math.random() * 3);

  if (action === 0) {
    const tmp = chars[idx];
    chars[idx] = chars[idx + 1];
    chars[idx + 1] = tmp;
  } else if (action === 1) {
    chars.splice(idx, 0, chars[idx]);
  } else {
    const vowels = "aeiouy";
    if (vowels.includes(chars[idx].toLowerCase())) {
      chars[idx] = vowels[Math.floor(Math.random() * vowels.length)];
    } else {
      chars[idx] = String.fromCharCode(chars[idx].charCodeAt(0) + 1);
    }
  }

  const candidate = chars.join("");
  if (candidate === form) return form + "ed";
  return candidate;
}

function findSimilarVerbs(v, count) {
  const base = v.inf.toLowerCase();
  const pref2 = base.slice(0, 2);
  const suff2 = base.slice(-2);

  let sims = VERBS.filter(x => {
    if (x.inf === v.inf) return false;
    const inf = x.inf.toLowerCase();
    return inf.startsWith(pref2) || inf.endsWith(suff2);
  });

  if (sims.length < count) {
    const extras = VERBS.filter(x => x.inf !== v.inf && !sims.includes(x));
    sims = sims.concat(shuffle(extras).slice(0, count - sims.length));
  }

  return shuffle(sims).slice(0, count);
}

// =====================
// GÉNÉRATION DES OPTIONS (DIFFICULTÉ)
// =====================

function generateOptions(v) {
  if (difficultyLevel === 1) {
    return shuffle([
      { past: v.past, part: v.part, correct: true },
      { past: generateFakePast(v), part: generateFakePart(v), correct: false },
      { past: generateFakePast(v), part: generateFakePart(v), correct: false }
    ]);
  }

  if (difficultyLevel === 2) {
    const similar = findSimilarVerbs(v, 2);
    const opts = [{ past: v.past, part: v.part, correct: true }];

    similar.forEach(sv => {
      opts.push({ past: sv.past, part: sv.part, correct: false });
    });

    while (opts.length < 3) {
      const r = VERBS[Math.floor(Math.random() * VERBS.length)];
      if (r.inf !== v.inf) {
        opts.push({ past: r.past, part: r.part, correct: false });
      }
    }
    return shuffle(opts.slice(0, 3));
  }

  return shuffle([
    { past: v.past, part: v.part, correct: true },
    { past: mutateForm(v.past), part: mutateForm(v.part), correct: false },
    { past: mutateForm(v.past), part: mutateForm(v.part), correct: false }
  ]);
}
// =====================
// CLASSIC / EXAM / DUEL
// =====================

function loadClassicQuestion() {
  const v = currentVerb;
  const options = generateOptions(v);
  currentQuestion = { verb: v, options };

  stepLabel.textContent = "Choisis la bonne combinaison (past + past participle).";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `<span class="form-past">${opt.past}</span> / <span class="form-part">${opt.part}</span>`;
    btn.onclick = () => checkClassic(opt);
    btnGroup.appendChild(btn);
  });
}

function updateDuelVisual() {
  player1Card.classList.toggle("duel-active", duelPlayer === 1);
  player2Card.classList.toggle("duel-active", duelPlayer === 2);
  player1ScoreEl.textContent = String(duelScores[1]);
  player2ScoreEl.textContent = String(duelScores[2]);
}

function registerResult(correct, verb, withLearning = true, isDuel = false) {
  if (correct) {
    score++;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  } else {
    combo = 0;
    if (withLearning) {
      mistakes.push(verb);
      learningQueue.push(verb);
    }
  }

  if (isDuel) {
    if (correct) duelScores[duelPlayer]++;
    updateDuelVisual();
  }
}

function checkClassic(opt) {
  const v = currentQuestion.verb;
  const correct = opt.correct;

  if (gameMode === "duel") {
    registerResult(correct, v, true, true);
    feedbackEl.innerHTML = correct
      ? `<span style="color:#22c55e;">✔ Joueur ${duelPlayer} correct !</span>`
      : `❌ Joueur ${duelPlayer} s'est trompé.<br>Bonne réponse : <span class="form-past">${v.past}</span> / <span class="form-part">${v.part}</span>`;

    duelPlayer = duelPlayer === 1 ? 2 : 1;
    duelInfo.textContent =
      `Score - Joueur 1 : ${duelScores[1]} | Joueur 2 : ${duelScores[2]} — Au tour du joueur ${duelPlayer}.`;
    updateDuelVisual();
  } else {
    registerResult(correct, v, true, false);
    feedbackEl.innerHTML = correct
      ? `<span style="color:#22c55e;">✔ Correct</span>`
      : `❌ Faux<br>Bonne réponse : <span class="form-past">${v.past}</span> / <span class="form-part">${v.part}</span>`;
  }

  nextBtn.style.display = "inline-block";
}

// =====================
// QCM MODE
// =====================

function loadQcmQuestion() {
  const v = currentVerb;
  currentQuestion = {
    verb: v,
    step: "past",
    chosenPast: null,
    pastCorrect: false
  };

  stepLabel.textContent = "Étape 1 : choisis le prétérit.";
  btnGroup.innerHTML = "";

  const pasts = shuffle([
    v.past,
    generateFakePast(v),
    generateFakePast(v)
  ]);

  pasts.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `<span class="form-past">${p}</span>`;
    btn.onclick = () => checkQcmPast(p);
    btnGroup.appendChild(btn);
  });
}

function checkQcmPast(p) {
  const q = currentQuestion;
  q.chosenPast = p;
  q.pastCorrect = (p === q.verb.past);

  stepLabel.textContent = "Étape 2 : choisis le participe passé.";
  btnGroup.innerHTML = "";

  const parts = shuffle([
    q.verb.part,
    generateFakePart(q.verb),
    generateFakePart(q.verb)
  ]);

  parts.forEach(pp => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `<span class="form-part">${pp}</span>`;
    btn.onclick = () => checkQcmPart(pp);
    btnGroup.appendChild(btn);
  });
}

function checkQcmPart(pp) {
  const q = currentQuestion;
  const correct = q.pastCorrect && (pp === q.verb.part);

  registerResult(correct, q.verb, true, false);

  feedbackEl.innerHTML = correct
    ? `<span style="color:#22c55e;">✔ Correct</span>`
    : `❌ Faux<br>Bonne réponse : <span class="form-past">${q.verb.past}</span> / <span class="form-part">${q.verb.part}</span>`;

  nextBtn.style.display = "inline-block";
}

// =====================
// LEARNING MODE
// =====================

function loadLearningQuestion() {
  const v = currentVerb;
  const options = generateOptions(v);
  currentQuestion = { verb: v, options };

  stepLabel.textContent = "Mode apprentissage : revois ce verbe.";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `<span class="form-past">${opt.past}</span> / <span class="form-part">${opt.part}</span>`;
    btn.onclick = () => checkLearning(opt);
    btnGroup.appendChild(btn);
  });
}

function checkLearning(opt) {
  const v = currentQuestion.verb;
  registerResult(opt.correct, v, true, false);

  feedbackEl.innerHTML = opt.correct
    ? `<span style="color:#22c55e;">✔ Correct</span>`
    : `❌ Faux<br>Bonne réponse : <span class="form-past">${v.past}</span> / <span class="form-part">${v.part}</span>`;

  nextBtn.style.display = "inline-block";
}
// =====================
// PUZZLE MODE (clic → clic, iPad OK)
// =====================

function loadPuzzleQuestion() {
  const v = currentVerb;
  stepLabel.textContent = "Clique sur une forme puis sur la bonne case.";

  puzzleArea.innerHTML = "";
  feedbackEl.innerHTML = "";

  let selectedValue = null;

  const forms = shuffle([v.inf, v.past, v.part]);

  const zone = document.createElement("div");
  zone.className = "puzzle-zone";

  const rows = [
    { label: "Infinitif", key: "inf" },
    { label: "Prétérit", key: "past" },
    { label: "Participe", key: "part" }
  ];

  rows.forEach(r => {
    const row = document.createElement("div");
    row.className = "puzzle-row";

    const lab = document.createElement("div");
    lab.className = "slot-label";
    lab.textContent = r.label;

    const slot = document.createElement("div");
    slot.className = "drop-slot";
    slot.dataset.target = r.key;

    slot.onclick = () => {
      if (!selectedValue) return;
      slot.textContent = selectedValue;
      slot.dataset.value = selectedValue;

      selectedValue = null;
      document
        .querySelectorAll(".drag-item")
        .forEach(i => i.classList.remove("selected"));
    };

    row.appendChild(lab);
    row.appendChild(slot);
    zone.appendChild(row);
  });

  const bank = document.createElement("div");
  bank.className = "drag-bank";

  forms.forEach(f => {
    const item = document.createElement("div");
    item.className = "drag-item";
    item.textContent = f;

    item.onclick = () => {
      selectedValue = f;
      document
        .querySelectorAll(".drag-item")
        .forEach(i => i.classList.remove("selected"));
      item.classList.add("selected");
    };

    bank.appendChild(item);
  });

  puzzleArea.appendChild(zone);
  puzzleArea.appendChild(bank);

  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.style.marginTop = "12px";
  btn.textContent = "Vérifier";
  btn.onclick = checkPuzzle;
  puzzleArea.appendChild(btn);
}

function checkPuzzle() {
  const slots = puzzleArea.querySelectorAll(".drop-slot");
  let ok = true;

  slots.forEach(slot => {
    const target = slot.dataset.target;
    const value = slot.dataset.value;
    if (!value || value !== currentVerb[target]) {
      ok = false;
    }
  });

  registerResult(ok, currentVerb, true, false);

  feedbackEl.innerHTML = ok
    ? `<span style="color:#22c55e;">✔ Tout est correct !</span>`
    : `❌ Il y a des erreurs.<br>
       Bonne réponse : ${currentVerb.inf} /
       <span class="form-past">${currentVerb.past}</span> /
       <span class="form-part">${currentVerb.part}</span>`;

  nextBtn.style.display = "inline-block";
}
// =====================
// FLASHCARDS MODE
// =====================

function loadFlashcardQuestion() {
  const v = currentVerb;
  currentQuestion = { verb: v };

  stepLabel.textContent =
    "Mode flashcards : essaie de te souvenir des formes, puis affiche la réponse.";

  btnGroup.innerHTML = "";
  feedbackEl.innerHTML = "";

  const revealBtn = document.createElement("button");
  revealBtn.className = "primary-btn";
  revealBtn.textContent = "Afficher la réponse";
  revealBtn.onclick = showFlashcardAnswer;
  btnGroup.appendChild(revealBtn);
}

function showFlashcardAnswer() {
  const v = currentQuestion.verb;

  feedbackEl.innerHTML = `
    <div class="flashcard-answer">
      <strong>${v.inf}</strong><br>
      Past : <span class="form-past">${v.past}</span><br>
      Participe : <span class="form-part">${v.part}</span><br>
      <span style="opacity:0.85;">${v.fr || ""}</span>
    </div>
  `;

  btnGroup.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "flashcard-buttons";

  const knewBtn = document.createElement("button");
  knewBtn.className = "primary-btn";
  knewBtn.textContent = "Je savais ✅";
  knewBtn.onclick = () => validateFlashcard(true);

  const didntBtn = document.createElement("button");
  didntBtn.className = "secondary-btn";
  didntBtn.textContent = "Je ne savais pas ❌";
  didntBtn.onclick = () => validateFlashcard(false);

  wrapper.appendChild(knewBtn);
  wrapper.appendChild(didntBtn);
  btnGroup.appendChild(wrapper);
}

function validateFlashcard(knew) {
  if (knew) {
    registerResult(true, currentVerb, false, false);
    feedbackEl.innerHTML +=
      `<div style="margin-top:6px;color:#22c55e;">Bien joué !</div>`;
  } else {
    registerResult(false, currentVerb, true, false);
    feedbackEl.innerHTML +=
      `<div style="margin-top:6px;color:#f97316;">
        Pas grave, tu le reverras dans les autres modes.
       </div>`;
  }
  nextBtn.style.display = "inline-block";
}
// =====================
// EXAM TIMER
// =====================

function startExamTimer() {
  stopExamTimer();
  updateTimerDisplay();

  examTimer = setInterval(() => {
    examTimeLeft--;
    if (examTimeLeft <= 0) {
      examTimeLeft = 0;
      updateTimerDisplay();
      stopExamTimer();
      endGame(true);
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function stopExamTimer() {
  if (examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
}

function updateTimerDisplay() {
  const m = Math.floor(examTimeLeft / 60);
  const s = examTimeLeft % 60;
  timerEl.textContent =
    `⏱ Temps restant : ${m}m ${s < 10 ? "0" + s : s}s`;
}
// =====================
// FIN DE PARTIE & BILAN
// =====================

function endGame(fromTimer = false) {
  stopExamTimer();
  game.classList.add("hidden");
  result.classList.remove("hidden");

  let total = totalQuestions;
  if (
    gameMode === "learning" ||
    gameMode === "puzzle" ||
    gameMode === "flashcards"
  ) {
    total = currentIndex;
  }

  if (gameMode === "duel") {
    scoreText.textContent =
      `Duel terminé — Joueur 1 : ${duelScores[1]} | Joueur 2 : ${duelScores[2]}`;
  } else if (gameMode === "exam") {
    const note = total > 0 ? Math.round((score / total) * 20) : 0;
    scoreText.textContent =
      `Tu as obtenu ${score}/${total}, soit ${note}/20.`;
  } else {
    scoreText.textContent =
      `Tu as obtenu ${score} bonne(s) réponse(s) sur ${total}.`;
  }

  // Enregistrer l'exercice dans la séance (hors duel)
  if (gameMode !== "duel") {
    sessionResults.push({
      mode: gameMode,
      label: getExerciseLabel(gameMode),
      score,
      total
    });
  }

  // Badges
  badgeRow.innerHTML = "";
  const ratio = total > 0 ? score / total : 0;
  const badges = [];

  if (ratio === 1 && total > 0) badges.push("🌟 Zéro faute !");
  else if (ratio >= 0.8) badges.push("🏅 Très bon niveau");
  else if (ratio >= 0.5) badges.push("👍 Bon début, continue !");

  if (gameMode === "exam" && fromTimer)
    badges.push("⏱ Fin d'examen par temps écoulé");
  if (gameMode === "puzzle" && ratio >= 0.8)
    badges.push("🧩 Maître du puzzle");
  if (gameMode === "flashcards" && ratio >= 0.8)
    badges.push("🎴 Pro des flashcards");

  if (maxCombo >= 5)
    badges.push("🔥 Série de " + maxCombo + " bonnes réponses");

  badges.forEach(b => {
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = b;
    badgeRow.appendChild(span);
  });

  // Résumé
  summaryEl.innerHTML = `
    <p><strong>Précision globale :</strong> ${(ratio * 100).toFixed(0)}%</p>
    <p><strong>Meilleure série :</strong> ${maxCombo}</p>
  `;

  if (mistakes.length === 0) {
    mistakeList.innerHTML = "<p>Aucune erreur 🎉</p>";
  } else {
    mistakeList.innerHTML = mistakes.map(v =>
      `<p>• ${v.inf} → <span class="form-past">${v.past}</span> /
       <span class="form-part">${v.part}</span> (${v.fr || ""})</p>`
    ).join("");
  }

  openSessionModal();
}

// =====================
// REDÉMARRER
// =====================

function restart() {
  result.classList.add("hidden");
  goToMenu();
}

// =====================
// LABEL EXERCICE
// =====================

function getExerciseLabel(mode) {
  switch (mode) {
    case "classic": return "Classic / Classique";
    case "qcm": return "QCM (2 étapes)";
    case "learning": return "Learning / Apprentissage";
    case "exam": return "Exam / Examen";
    case "puzzle": return "Puzzle";
    case "flashcards": return "Flashcards";
    default: return mode || "Inconnu";
  }
}

// =====================
// IDENTITÉ ÉLÈVE
// =====================

function ensureIdentity() {
  if (studentIdentity.firstName && studentIdentity.classLabel) return;

  identityFirstNameInput.value = "";
  identityClassInput.value = "";
  identityModal.classList.remove("hidden");
  identityFirstNameInput.focus();
}

function saveIdentity() {
  const fn = identityFirstNameInput.value.trim();
  const cl = identityClassInput.value.trim();

  if (!fn || !cl) {
    alert("Merci de renseigner ton prénom et ta classe.");
    return;
  }

  studentIdentity.firstName = fn;
  studentIdentity.classLabel = cl;
  localStorage.setItem("ivt-student", JSON.stringify(studentIdentity));
  identityModal.classList.add("hidden");

  qrBoxEl.innerHTML = "";
  qrSectionEl.classList.add("hidden");
}

// =====================
// MODALE FIN DE SÉANCE
// =====================

function openSessionModal() {
  if (!sessionModal) return;

  // ✅ Génération automatique du QR dès l'ouverture de la modale
  buildSessionQR();

  sessionModal.classList.remove("hidden");
}

if (sessionContinueBtn) {
  sessionContinueBtn.addEventListener("click", () => {
    sessionModal.classList.add("hidden");
  });
}

if (sessionQrBtn) {
  sessionQrBtn.addEventListener("click", () => {
    sessionModal.classList.add("hidden");
    buildSessionQR(); // (regénération possible, sans risque)
  });
}


// =====================
// QR DE SÉANCE
// =====================

function normaliseClassLabel(raw) {
  if (!raw) return "";
  let s = raw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\s+/g, "");
  const match = s.match(/(\d+)([A-Z])/);
  return match ? match[1] + match[2] : s;
}

function buildSessionQR() {
  if (!studentIdentity.firstName || !studentIdentity.classLabel) {
    ensureIdentity();
    return;
  }

  if (!sessionResults.length) {
    alert("Aucun exercice réalisé pour cette séance.");
    return;
  }

  const payload = {
    prenom: studentIdentity.firstName.toUpperCase(),
    classe: normaliseClassLabel(studentIdentity.classLabel),
    exercices: sessionResults.map(r => ({
      exo: r.label,
      resultat: `${r.score}/${r.total}`
    }))
  };

  const json = JSON.stringify(payload);

  qrBoxEl.innerHTML = "";
  qrSectionEl.classList.remove("hidden");

  // ✅ API COMPATIBLE AVEC LA LIBRAIRIE QR LOCALE (MDM OK)
  try {
    new QRCode(qrBoxEl, {
      text: json,
      width: 256,
      height: 256,
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (e) {
    console.error(e);
    const pre = document.createElement("pre");
    pre.textContent = json;
    qrBoxEl.appendChild(pre);
  }
}

if (downloadQrBtn) {
  downloadQrBtn.addEventListener("click", () => {
    // 🔍 La lib peut générer <img> OU <canvas>
    const canvas = qrBoxEl.querySelector("canvas");
    const img = qrBoxEl.querySelector("img");

    if (!canvas && !img) {
      alert("Le QR n'est pas encore généré.");
      return;
    }

    const link = document.createElement("a");

    if (canvas) {
      link.href = canvas.toDataURL("image/png");
    } else {
      link.href = img.src;
    }

    link.download = `IrregularVerbs_QR_${studentIdentity.firstName || "ELEVE"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}
