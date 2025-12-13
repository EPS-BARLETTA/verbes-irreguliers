/*************************************************
 * BLOC 1 — ÉTAT GLOBAL & RÉFÉRENCES DOM
 *************************************************/

// =====================
// DONNÉES
// =====================
let VERBS = [];
let verbsLoaded = false;

// état jeu
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

// séries
let combo = 0;
let maxCombo = 0;

// timer examen
let examTimer = null;
let examTimeLeft = 0;

// identité & séance
let studentIdentity = { firstName: "", classLabel: "" };
let sessionResults = [];

// =====================
// RESTAURATION SESSION
// =====================
try {
  const stored = localStorage.getItem("ivt-session-results");
  if (stored) sessionResults = JSON.parse(stored) || [];
} catch {
  sessionResults = [];
}

// =====================
// RÉFÉRENCES DOM
// =====================
const home = document.getElementById("home");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const result = document.getElementById("result");

const gameTitle = document.getElementById("game-title");
const questionCtr = document.getElementById("question-counter");
const timerEl = document.getElementById("timer");

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

// QR
const qrSectionEl = document.getElementById("qr-section");
const qrBoxEl = document.getElementById("qrBox");
const downloadQrBtn = document.getElementById("download-qr-btn");

// modales
const identityModal = document.getElementById("identity-modal");
const identityFirstNameInput = document.getElementById("student-firstname");
const identityClassInput = document.getElementById("student-class");

const sessionModal = document.getElementById("session-modal");
const sessionContinueBtn = document.getElementById("session-continue-btn");
const sessionQrBtn = document.getElementById("session-qr-btn");
/*************************************************
 * BLOC 2 — NAVIGATION & RESET ÉCRANS
 *************************************************/

function hideAllScreens() {
  home.classList.add("hidden");
  menu.classList.add("hidden");
  game.classList.add("hidden");
  result.classList.add("hidden");
}

function goToMenu() {
  hideAllScreens();
  closeAllModals();
  hideQR();

  menu.classList.remove("hidden");

  clearModeSelection();
  clearDifficultySelection();
  clearQuestionSelection();

  ensureIdentity();
}

function backHome() {
  stopExamTimer();
  hideAllScreens();
  closeAllModals();
  hideQR();

  home.classList.remove("hidden");

  clearModeSelection();
  clearDifficultySelection();
  clearQuestionSelection();
}

// =====================
// RESET UI
// =====================

function clearModeSelection() {
  document
    .querySelectorAll(".mode-card")
    .forEach(c => c.classList.remove("selected"));
}

function clearDifficultySelection() {
  document
    .querySelectorAll(".difficulty-buttons button")
    .forEach(b => b.classList.remove("selected"));
}

function clearQuestionSelection() {
  document
    .querySelectorAll(".question-buttons button")
    .forEach(b => b.classList.remove("selected"));
}

// =====================
// QR
// =====================

function hideQR() {
  if (qrSectionEl) qrSectionEl.classList.add("hidden");
  if (qrBoxEl) qrBoxEl.innerHTML = "";
}
/*************************************************
 * BLOC 3 — IDENTITÉ ÉLÈVE (MODALE STABLE)
 *************************************************/

// =====================
// HELPERS MODALE IDENTITÉ
// =====================

function openIdentityModal() {
  if (!identityModal) return;

  // sécurité : fermer la modale de fin si ouverte
  if (sessionModal) {
    sessionModal.classList.add("hidden");
    sessionModal.setAttribute("aria-hidden", "true");
  }

  identityModal.classList.remove("hidden");
  identityModal.setAttribute("aria-hidden", "false");

  if (identityFirstNameInput) identityFirstNameInput.focus();
}

function closeIdentityModal() {
  if (!identityModal) return;
  identityModal.classList.add("hidden");
  identityModal.setAttribute("aria-hidden", "true");
}

// =====================
// LOGIQUE IDENTITÉ
// =====================

function ensureIdentity() {
  // ❌ jamais pendant la fin de séance
  if (sessionModal && !sessionModal.classList.contains("hidden")) return;

  if (studentIdentity.firstName && studentIdentity.classLabel) return;

  if (identityFirstNameInput) identityFirstNameInput.value = "";
  if (identityClassInput) identityClassInput.value = "";

  openIdentityModal();
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

  closeIdentityModal();
}
/*************************************************
 * BLOC 4 — MODALE FIN DE SÉANCE (STABLE iPad)
 *************************************************/

// =====================
// HELPERS MODALE FIN
// =====================

function openSessionModal() {
  if (!sessionModal) return;

  // sécurité : fermer identité si ouverte
  closeIdentityModal();

  // la modale passe toujours AU-DESSUS
  sessionModal.classList.remove("hidden");
  sessionModal.setAttribute("aria-hidden", "false");

  // focus obligatoire iPad Safari
  const firstBtn = sessionModal.querySelector("button");
  if (firstBtn) firstBtn.focus();
}

function closeSessionModal() {
  if (!sessionModal) return;
  sessionModal.classList.add("hidden");
  sessionModal.setAttribute("aria-hidden", "true");
}

// =====================
// ACTIONS BOUTONS
// =====================

// ➜ CONTINUER UN AUTRE EXERCICE
function handleContinueSession(e) {
  e.preventDefault();
  e.stopPropagation();

  closeSessionModal();

  // nettoyage écrans
  result.classList.add("hidden");
  game.classList.add("hidden");
  home.classList.add("hidden");
  menu.classList.remove("hidden");

  // reset UX
  clearModeSelection();
  clearDifficultySelection();
  clearQuestionSelection();
}

// ➜ TERMINER & GÉNÉRER LE QR
function handleFinishSession(e) {
  e.preventDefault();
  e.stopPropagation();

  closeSessionModal();

  buildSessionQR();

  if (qrSectionEl) {
    qrSectionEl.classList.remove("hidden");

    // scroll fiable iPad
    setTimeout(() => {
      qrSectionEl.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);
  }
}

// =====================
// LISTENERS (click + touchend)
// =====================

if (sessionContinueBtn) {
  sessionContinueBtn.onclick = handleContinueSession;
  sessionContinueBtn.addEventListener(
    "touchend",
    handleContinueSession,
    { passive: false }
  );
}

if (sessionQrBtn) {
  sessionQrBtn.onclick = handleFinishSession;
  sessionQrBtn.addEventListener(
    "touchend",
    handleFinishSession,
    { passive: false }
  );
}
/*************************************************
 * BLOC 5 — QR DE SÉANCE + NOUVELLE SÉANCE (FINAL)
 *************************************************/

// =====================
// NORMALISATION CLASSE
// =====================

function normaliseClassLabel(raw) {
  if (!raw) return "";
  let s = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\s+/g, "");
  const match = s.match(/(\d+)([A-Z])/);
  return match ? match[1] + match[2] : s;
}

// =====================
// GÉNÉRATION QR (ScanProf)
// =====================

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
      exo: r.exo,
      resultat: r.resultat
    }))
  };

  const json = JSON.stringify(payload);

  if (qrBoxEl) qrBoxEl.innerHTML = "";
  if (qrSectionEl) qrSectionEl.classList.remove("hidden");

  if (typeof QRCode === "undefined") {
    alert("Erreur : librairie QRCode non chargée.");
    return;
  }

  new QRCode(qrBoxEl, {
    text: json,
    width: 256,
    height: 256,
    correctLevel: QRCode.CorrectLevel.H
  });
}

// =====================
// TÉLÉCHARGER LE QR
// =====================

if (downloadQrBtn) {
  downloadQrBtn.onclick = () => {
    const canvas = qrBoxEl.querySelector("canvas");
    const img = qrBoxEl.querySelector("img");

    if (!canvas && !img) {
      alert("Le QR n'est pas encore généré.");
      return;
    }

    const link = document.createElement("a");
    link.href = canvas ? canvas.toDataURL("image/png") : img.src;
    link.download = `IrregularVerbs_QR_${studentIdentity.firstName || "ELEVE"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
}

// =====================
// NOUVELLE SÉANCE (RESET TOTAL)
// =====================

function restart() {
  // fermer toutes les modales
  closeSessionModal();
  closeIdentityModal();

  // reset ScanProf
  sessionResults = [];
  localStorage.removeItem("ivt-session-results");

  // reset QR
  if (qrBoxEl) qrBoxEl.innerHTML = "";
  if (qrSectionEl) qrSectionEl.classList.add("hidden");

  // retour menu propre
  result.classList.add("hidden");
  game.classList.add("hidden");
  home.classList.add("hidden");
  menu.classList.remove("hidden");

  clearModeSelection();
  clearDifficultySelection();
  clearQuestionSelection();
}
/*************************************************
 * BLOC 6 — FIN D’EXERCICE (DÉCLENCHEUR UNIQUE)
 *************************************************/

function endGame(fromTimer = false) {
  stopExamTimer();

  // afficher écran résultat
  hideAllScreens();
  result.classList.remove("hidden");

  // calcul total réel
  let total = totalQuestions;
  if (
    gameMode === "learning" ||
    gameMode === "puzzle" ||
    gameMode === "flashcards"
  ) {
    total = currentIndex;
  }

  // score texte
  if (gameMode === "exam") {
    const note = total > 0 ? Math.round((score / total) * 20) : 0;
    scoreText.textContent = `Tu as obtenu ${score}/${total} (${note}/20)`;
  } else {
    scoreText.textContent = `Tu as obtenu ${score}/${total}`;
  }

  // sauvegarde ScanProf (hors duel)
  if (gameMode !== "duel") {
    sessionResults.push({
      exo: getExerciseLabel(gameMode),
      resultat: `${score}/${total}`
    });

    localStorage.setItem(
      "ivt-session-results",
      JSON.stringify(sessionResults)
    );
  }

  // erreurs
  if (mistakes.length === 0) {
    mistakeList.innerHTML = "<p>Aucune erreur 🎉</p>";
  } else {
    mistakeList.innerHTML = mistakes.map(v =>
      `<p>• ${v.inf} → <span class="form-past">${v.past}</span> /
       <span class="form-part">${v.part}</span></p>`
    ).join("");
  }

  // ouvrir la modale AU-DESSUS (1 seule fois)
  setTimeout(() => {
    openSessionModal();
  }, 50);
}
/*************************************************
 * BLOC 7 — QUESTION SUIVANTE
 *************************************************/

if (nextBtn) {
  nextBtn.onclick = () => {
    nextQuestion();
  };
}
/*************************************************
 * BLOC 8 — LABEL EXERCICE
 *************************************************/

function getExerciseLabel(mode) {
  switch (mode) {
    case "classic": return "Classique";
    case "qcm": return "QCM";
    case "learning": return "Apprentissage";
    case "exam": return "Examen";
    case "puzzle": return "Puzzle";
    case "flashcards": return "Flashcards";
    default: return "Exercice";
  }
}
/*************************************************
 * BLOC 9 — CHARGEMENT DES VERBES & START GAME
 *************************************************/

// =====================
// CHARGEMENT DES VERBES
// =====================

async function loadVerbs() {
  try {
    const res = await fetch("verbs.json");
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      throw new Error("Liste de verbes invalide");
    }

    VERBS = data;
    verbsLoaded = true;
  } catch (e) {
    console.error("Erreur chargement verbes", e);
    wordEl.textContent = "Erreur de chargement des verbes.";
  }
}

// =====================
// DÉMARRAGE JEU
// =====================

async function startGame() {
  if (!verbsLoaded) {
    await loadVerbs();
  }

  // reset état
  score = 0;
  mistakes = [];
  learningQueue = [];
  currentIndex = 0;
  combo = 0;
  maxCombo = 0;
  translationVisible = false;

  // bascule écrans
  hideAllScreens();
  game.classList.remove("hidden");

  // titre
  gameTitle.textContent = getExerciseLabel(gameMode);

  // timer examen
  if (gameMode === "exam") {
    examTimeLeft = totalQuestions * 20;
    startExamTimer();
    toggleTransBtn.style.display = "none";
  } else {
    stopExamTimer();
    timerEl.textContent = "";
    toggleTransBtn.style.display = "inline-block";
  }

  nextQuestion();
}
/*************************************************
 * BLOC 10 — QUESTION SUIVANTE & SÉLECTION VERBE
 *************************************************/

// =====================
// RESET UI QUESTION
// =====================

function resetUIForQuestion() {
  btnGroup.innerHTML = "";
  puzzleArea.innerHTML = "";
  feedbackEl.innerHTML = "";
  stepLabel.textContent = "";
  nextBtn.style.display = "none";

  if (translationVisible) {
    translationEl.textContent = currentVerb?.fr || "";
  } else {
    translationEl.textContent = "";
  }
}

// =====================
// QUESTION SUIVANTE
// =====================

function nextQuestion() {
  resetUIForQuestion();

  // fin de partie
  if (currentIndex >= totalQuestions) {
    endGame();
    return;
  }

  currentIndex++;
  questionCtr.textContent = `Question ${currentIndex} / ${totalQuestions}`;

  // choix du verbe
  if (learningQueue.length > 0) {
    currentVerb = learningQueue.shift();
  } else {
    currentVerb = VERBS[Math.floor(Math.random() * VERBS.length)];
  }

  wordEl.textContent = currentVerb.inf;

  // dispatcher selon mode
  switch (gameMode) {
    case "classic":
    case "exam":
      loadClassicQuestion();
      break;

    case "qcm":
      loadQcmQuestion();
      break;

    case "learning":
      loadLearningQuestion();
      break;

    case "puzzle":
      loadPuzzleQuestion();
      break;

    case "flashcards":
      loadFlashcardQuestion();
      break;

    default:
      console.warn("Mode inconnu :", gameMode);
      endGame();
  }
}
/*************************************************
 * BLOC 11 — MODE CLASSIQUE
 *************************************************/

// =====================
// OUTILS
// =====================

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function pickDifferent(list, correct) {
  const filtered = list.filter(v => v && v !== correct);
  if (!filtered.length) return correct;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function generateFakePast(v) {
  const variants = [
    v.inf + "ed",
    v.inf + "d",
    v.past + "ed",
    v.part,
    v.past.split("").reverse().join("")
  ];
  return pickDifferent(variants, v.past);
}

function generateFakePart(v) {
  const variants = [
    v.inf + "ed",
    v.inf + "en",
    v.part + "ed",
    v.past,
    v.part.split("").reverse().join("")
  ];
  return pickDifferent(variants, v.part);
}

// =====================
// GÉNÉRATION OPTIONS
// =====================

function generateClassicOptions(v) {
  return shuffle([
    { past: v.past, part: v.part, correct: true },
    { past: generateFakePast(v), part: generateFakePart(v), correct: false },
    { past: generateFakePast(v), part: generateFakePart(v), correct: false }
  ]);
}

// =====================
// CHARGEMENT QUESTION
// =====================

function loadClassicQuestion() {
  const v = currentVerb;
  const options = generateClassicOptions(v);
  currentQuestion = { verb: v, options };

  stepLabel.textContent =
    "Choisis la bonne combinaison (past / past participle)";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `
      <span class="form-past">${opt.past}</span> /
      <span class="form-part">${opt.part}</span>
    `;

    btn.onclick = () => checkClassicAnswer(opt);
    btnGroup.appendChild(btn);
  });
}

// =====================
// VÉRIFICATION
// =====================

function checkClassicAnswer(opt) {
  const v = currentQuestion.verb;

  if (opt.correct) {
    score++;
    combo++;
    feedbackEl.innerHTML =
      `<span style="color:#22c55e;">✔ Correct</span>`;
  } else {
    combo = 0;
    mistakes.push(v);
    learningQueue.push(v);
    feedbackEl.innerHTML = `
      ❌ Faux<br>
      Bonne réponse :
      <span class="form-past">${v.past}</span> /
      <span class="form-part">${v.part}</span>
    `;
  }

  if (combo > maxCombo) maxCombo = combo;

  nextBtn.style.display = "inline-block";
}
/*************************************************
 * BLOC 12 — MODE QCM
 *************************************************/

// =====================
// CHARGEMENT QUESTION QCM
// =====================

function loadQcmQuestion() {
  const v = currentVerb;

  currentQuestion = {
    verb: v,
    step: "past",
    pastCorrect: false
  };

  stepLabel.textContent = "Étape 1 : choisis le prétérit";
  btnGroup.innerHTML = "";
  feedbackEl.innerHTML = "";

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

// =====================
// ÉTAPE 1 — PRÉTÉRIT
// =====================

function checkQcmPast(past) {
  const q = currentQuestion;
  q.pastCorrect = past === q.verb.past;

  stepLabel.textContent = "Étape 2 : choisis le participe passé";
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

// =====================
// ÉTAPE 2 — PARTICIPE
// =====================

function checkQcmPart(part) {
  const q = currentQuestion;
  const correct = q.pastCorrect && part === q.verb.part;

  if (correct) {
    score++;
    combo++;
    feedbackEl.innerHTML =
      `<span style="color:#22c55e;">✔ Correct</span>`;
  } else {
    combo = 0;
    mistakes.push(q.verb);
    learningQueue.push(q.verb);
    feedbackEl.innerHTML = `
      ❌ Faux<br>
      Bonne réponse :
      <span class="form-past">${q.verb.past}</span> /
      <span class="form-part">${q.verb.part}</span>
    `;
  }

  if (combo > maxCombo) maxCombo = combo;

  nextBtn.style.display = "inline-block";
}
/*************************************************
 * BLOC 13 — MODE LEARNING
 *************************************************/

// =====================
// CHARGEMENT QUESTION LEARNING
// =====================

function loadLearningQuestion() {
  const v = currentVerb;
  currentQuestion = { verb: v };

  stepLabel.textContent = "Mode apprentissage : choisis la bonne réponse";
  btnGroup.innerHTML = "";
  feedbackEl.innerHTML = "";

  const options = generateOptions(v);

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `
      <span class="form-past">${opt.past}</span> /
      <span class="form-part">${opt.part}</span>
    `;
    btn.onclick = () => checkLearning(opt);
    btnGroup.appendChild(btn);
  });
}

// =====================
// VÉRIFICATION LEARNING
// =====================

function checkLearning(opt) {
  const v = currentQuestion.verb;

  if (opt.correct) {
    score++;
    combo++;
    feedbackEl.innerHTML =
      `<span style="color:#22c55e;">✔ Correct</span>`;
  } else {
    combo = 0;
    mistakes.push(v);
    learningQueue.push(v);
    feedbackEl.innerHTML = `
      ❌ Faux<br>
      Bonne réponse :
      <span class="form-past">${v.past}</span> /
      <span class="form-part">${v.part}</span>
    `;
  }

  if (combo > maxCombo) maxCombo = combo;

  nextBtn.style.display = "inline-block";
}
/*************************************************
 * BLOC 14 — MODE PUZZLE (clic → clic, iPad safe)
 *************************************************/

function loadPuzzleQuestion() {
  const v = currentVerb;
  currentQuestion = { verb: v };

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

  if (ok) {
    feedbackEl.innerHTML = `<span style="color:#22c55e;">✔ Tout est correct !</span>`;
  } else {
    feedbackEl.innerHTML = `❌ Il y a des erreurs.<br>
      Bonne réponse : ${currentVerb.inf} /
      <span class="form-past">${currentVerb.past}</span> /
      <span class="form-part">${currentVerb.part}</span>`;
  }

  registerResult(ok, currentVerb, true, false);
  nextBtn.style.display = "inline-block";
}
/*************************************************
 * BLOC 15 — MODE FLASHCARDS
 *************************************************/

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
/*************************************************
 * BLOC 16 — TIMER DE L'EXAMEN
 *************************************************/

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
/*************************************************
 * BLOC 17 — FIN DE PARTIE & BILAN
 *************************************************/

function endGame(fromTimer = false) {
  stopExamTimer();

  // afficher écran résultat
  hideAllScreens();
  result.classList.remove("hidden");

  // calcul total réel
  let total = totalQuestions;
  if (
    gameMode === "learning" ||
    gameMode === "puzzle" ||
    gameMode === "flashcards"
  ) {
    total = currentIndex;
  }

  // score texte
  if (gameMode === "exam") {
    const note = total > 0 ? Math.round((score / total) * 20) : 0;
    scoreText.textContent = `Tu as obtenu ${score}/${total} (${note}/20)`;
  } else {
    scoreText.textContent = `Tu as obtenu ${score}/${total}`;
  }

  // sauvegarde ScanProf (hors duel)
  if (gameMode !== "duel") {
    sessionResults.push({
      exo: getExerciseLabel(gameMode),
      resultat: `${score}/${total}`
    });

    localStorage.setItem(
      "ivt-session-results",
      JSON.stringify(sessionResults)
    );
  }

  // erreurs
  if (mistakes.length === 0) {
    mistakeList.innerHTML = "<p>Aucune erreur 🎉</p>";
  } else {
    mistakeList.innerHTML = mistakes.map(v =>
      `<p>• ${v.inf} → <span class="form-past">${v.past}</span> /
       <span class="form-part">${v.part}</span></p>`
    ).join("");
  }

  // ouvrir la modale AU-DESSUS (1 seule fois)
  setTimeout(() => {
    openSessionModal();
  }, 50);
}
/*************************************************
 * BLOC 18 — QUESTION SUIVANTE
 *************************************************/

if (nextBtn) {
  nextBtn.onclick = () => {
    nextQuestion();
  };
}
/*************************************************
 * BLOC 19 — LABEL EXERCICE
 *************************************************/

function getExerciseLabel(mode) {
  switch (mode) {
    case "classic": return "Classique";
    case "qcm": return "QCM";
    case "learning": return "Apprentissage";
    case "exam": return "Examen";
    case "puzzle": return "Puzzle";
    case "flashcards": return "Flashcards";
    default: return "Exercice";
  }
}
/*************************************************
 * BLOC 20 — NAVIGATION
 *************************************************/

// =====================
// CHANGER DE QUESTION
// =====================

function nextQuestion() {
  // reset
  resetUIForQuestion();

  // si on a fini les questions
  if (currentIndex >= totalQuestions) {
    endGame();
    return;
  }

  // nouvelle question
  currentIndex++;

  // update du compteur
  questionCtr.textContent = `Question ${currentIndex} / ${totalQuestions}`;

  // chargement de la question
  loadQuestion();
}

// =====================
// RESET QUESTION UI
// =====================

function resetUIForQuestion() {
  btnGroup.innerHTML = "";
  puzzleArea.innerHTML = "";
  feedbackEl.innerHTML = "";
  nextBtn.style.display = "none";
  stepLabel.textContent = "";
  updateTranslationDisplay();
}

// =====================
// CHARGER LA QUESTION
// =====================

function loadQuestion() {
  // Logique pour charger la question
  let v;
  if (gameMode === "learning" && learningQueue.length > 0) {
    v = learningQueue.shift();
  } else {
    v = VERBS[Math.floor(Math.random() * VERBS.length)];
  }

  currentVerb = v;
  wordEl.textContent = v.inf;

  // Affichage en fonction du mode de jeu
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
/*************************************************
 * BLOC 21 — CHARGER LA QUESTION CLASSIC
 *************************************************/

// =====================
// CHARGER QUESTION CLASSIC
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
/*************************************************
 * BLOC 22 — CHARGER LA QUESTION QCM
 *************************************************/

// =====================
// CHARGER QUESTION QCM
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
/*************************************************
 * BLOC 23 — CHARGER LA QUESTION DANS LE MODE APPRENTISSAGE
 *************************************************/

// =====================
// CHARGER QUESTION MODE APPRENTISSAGE
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
/*************************************************
 * BLOC 24 — CHARGER LA QUESTION DANS LE MODE PUZZLE
 *************************************************/

// =====================
// CHARGER QUESTION MODE PUZZLE
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
/*************************************************
 * BLOC 25 — CHARGER LA QUESTION DANS LE MODE FLASHCARDS
 *************************************************/

// =====================
// CHARGER QUESTION MODE FLASHCARDS
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
/*************************************************
 * BLOC 26 — TIMER EXAMEN
 *************************************************/

// =====================
// TIMER EXAMEN
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
/*************************************************
 * BLOC 27 — FIN DE PARTIE & BILAN
 *************************************************/

// =====================
// FIN DE PARTIE
// =====================

function endGame(fromTimer = false) {
  stopExamTimer();

  // afficher écran résultat
  hideAllScreens();
  result.classList.remove("hidden");

  // calcul total réel
  let total = totalQuestions;
  if (
    gameMode === "learning" ||
    gameMode === "puzzle" ||
    gameMode === "flashcards"
  ) {
    total = currentIndex;
  }

  // score texte
  if (gameMode === "exam") {
    const note = total > 0 ? Math.round((score / total) * 20) : 0;
    scoreText.textContent = `Tu as obtenu ${score}/${total} (${note}/20)`;
  } else {
    scoreText.textContent = `Tu as obtenu ${score}/${total}`;
  }

  // sauvegarde ScanProf (hors duel)
  if (gameMode !== "duel") {
    sessionResults.push({
      exo: getExerciseLabel(gameMode),
      resultat: `${score}/${total}`
    });

    localStorage.setItem(
      "ivt-session-results",
      JSON.stringify(sessionResults)
    );
  }

  // erreurs
  if (mistakes.length === 0) {
    mistakeList.innerHTML = "<p>Aucune erreur 🎉</p>";
  } else {
    mistakeList.innerHTML = mistakes.map(v =>
      `<p>• ${v.inf} → <span class="form-past">${v.past}</span> /
       <span class="form-part">${v.part}</span></p>`
    ).join("");
  }

  // ouvrir la modale AU-DESSUS (1 seule fois)
  setTimeout(() => {
    openSessionModal();
  }, 50);
}
/*************************************************
 * BLOC 28 — QUESTION SUIVANTE
 *************************************************/

if (nextBtn) {
  nextBtn.onclick = () => {
    nextQuestion();
  };
}
/*************************************************
 * BLOC 29 — LABEL EXERCICE
 *************************************************/

function getExerciseLabel(mode) {
  switch (mode) {
    case "classic": return "Classique";
    case "qcm": return "QCM";
    case "learning": return "Apprentissage";
    case "exam": return "Examen";
    case "puzzle": return "Puzzle";
    case "flashcards": return "Flashcards";
    default: return "Exercice";
  }
}
/*************************************************
 * BLOC 30 — GESTION DES QUESTIONS
 *************************************************/

function nextQuestion() {
  if (currentIndex >= totalQuestions) {
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

  if (gameMode === "classic") {
    loadClassicQuestion();
  } else if (gameMode === "qcm") {
    loadQcmQuestion();
  } else if (gameMode === "learning") {
    loadLearningQuestion();
  } else if (gameMode === "puzzle") {
    loadPuzzleQuestion();
  } else if (gameMode === "flashcards") {
    loadFlashcardQuestion();
  }
}
/*************************************************
 * BLOC 31 — GÉNÉRATION DES QUESTIONS
 *************************************************/

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
/*************************************************
 * BLOC 32 — VALIDATION DES RÉPONSES
 *************************************************/

function checkClassic(opt) {
  const v = currentQuestion.verb;
  const correct = opt.correct;

  registerResult(correct, v, true, false);

  feedbackEl.innerHTML = correct
    ? `<span style="color:#22c55e;">✔ Correct</span>`
    : `❌ Faux<br>Bonne réponse : <span class="form-past">${v.past}</span> / <span class="form-part">${v.part}</span>`;

  nextBtn.style.display = "inline-block";
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

function checkLearning(opt) {
  const v = currentQuestion.verb;
  registerResult(opt.correct, v, true, false);

  feedbackEl.innerHTML = opt.correct
    ? `<span style="color:#22c55e;">✔ Correct</span>`
    : `❌ Faux<br>Bonne réponse : <span class="form-past">${v.past}</span> / <span class="form-part">${v.part}</span>`;

  nextBtn.style.display = "inline-block";
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
/*************************************************
 * BLOC 33 — RÉINITIALISATION DES RÉSULTATS
 *************************************************/

function resetResults() {
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
  feedbackEl.innerHTML = "";
  nextBtn.style.display = "none";
  timerEl.textContent = "";
  stepLabel.textContent = "";
}
/*************************************************
 * BLOC 34 — DÉMARRAGE DU JEU
 *************************************************/

async function startGame() {
  // Initialisation du jeu
  if (!verbsLoaded) {
    await loadVerbs();
  }

  // Réinitialisation des résultats
  resetResults();

  // Mise à jour de l'interface pour démarrer le jeu
  menu.classList.add("hidden");
  result.classList.add("hidden");
  game.classList.remove("hidden");

  // Choix du mode de jeu
  gameTitle.textContent =
    gameMode === "classic" ? "Mode classique" :
    gameMode === "qcm" ? "Mode QCM" :
    gameMode === "learning" ? "Mode apprentissage" :
    gameMode === "exam" ? "Mode examen" :
    gameMode === "puzzle" ? "Mode puzzle" :
    gameMode === "duel" ? "Mode duel" :
    "Mode flashcards";

  // Gérer le mode examen
  if (gameMode === "exam") {
    examTimeLeft = totalQuestions * 20;
    startExamTimer();
    toggleTransBtn.style.display = "none";
  } else {
    stopExamTimer();
    timerEl.textContent = "";
    toggleTransBtn.style.display = "inline-block";
  }

  // Gérer le mode duel
  if (gameMode === "duel") {
    duelInfo.textContent = "Joueur 1 commence.";
    duelPlayersEl.classList.remove("hidden");
    updateDuelVisual();
  }

  // Charger la première question
  nextQuestion();
}
/*************************************************
 * BLOC 35 — QUESTION SUIVANTE
 *************************************************/

function nextQuestion() {
  resetUIForQuestion();

  // Si la limite de questions est atteinte, fin du jeu
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

  // Sélectionner un verbe au hasard ou de la queue d'apprentissage
  let v;
  if (gameMode === "learning" && learningQueue.length > 0) {
    v = learningQueue.shift();
  } else {
    v = VERBS[Math.floor(Math.random() * VERBS.length)];
  }

  currentVerb = v;
  wordEl.textContent = v.inf;

  // Charger la question selon le mode de jeu
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
/*************************************************
 * BLOC 36 — AFFICHAGE QUESTION (CLASSIC/EXAM/DUEL)
 *************************************************/

function loadClassicQuestion() {
  const v = currentVerb;
  const options = generateOptions(v);
  currentQuestion = { verb: v, options };

  stepLabel.textContent = "Choisis la bonne combinaison (past + past participle).";

  // Créer les boutons pour les choix
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.innerHTML = `<span class="form-past">${opt.past}</span> / <span class="form-part">${opt.part}</span>`;
    btn.onclick = () => checkClassic(opt);
    btnGroup.appendChild(btn);
  });
}

function checkClassic(opt) {
  const v = currentQuestion.verb;
  const correct = opt.correct;

  // Gestion du feedback pour le mode duel
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
/*************************************************
 * BLOC 37 — AFFICHAGE QUESTION (QCM)
 *************************************************/

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
/*************************************************
 * BLOC 38 — AFFICHAGE QUESTION (LEARNING)
 *************************************************/

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
/*************************************************
 * BLOC 39 — PUZZLE MODE (complément final)
 *************************************************/

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
/*************************************************
 * BLOC 40 — FLASHCARDS MODE
 *************************************************/

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
