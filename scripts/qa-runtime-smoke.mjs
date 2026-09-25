#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const dataDir = path.join(root, "data");
const data = {
  vocabulary: JSON.parse(fs.readFileSync(path.join(dataDir, "vocabulary.json"), "utf8")),
  sentences: JSON.parse(fs.readFileSync(path.join(dataDir, "sentences.json"), "utf8")),
  questions: JSON.parse(fs.readFileSync(path.join(dataDir, "questions.json"), "utf8")),
  communication: JSON.parse(fs.readFileSync(path.join(dataDir, "communication.json"), "utf8")),
  trilingual: JSON.parse(fs.readFileSync(path.join(dataDir, "trilingual.json"), "utf8")),
  grammar: JSON.parse(fs.readFileSync(path.join(dataDir, "grammar.json"), "utf8")),
  version: JSON.parse(fs.readFileSync(path.join(dataDir, "version.json"), "utf8")),
};

const failures = [];
const pass = (name) => console.log("PASS", name);
function check(name, ok, detail = "") {
  if (ok) pass(name);
  else failures.push({ name, detail });
}

class El {
  constructor(id, tag = "DIV") {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.value = "";
    this.innerHTML = "";
    this.textContent = "";
    this.disabled = false;
    this.className = "";
    this.attributes = {};
    this.setAttribute = (name, value) => { this.attributes[name] = String(value); };
    this.classList = {
      _set: new Set(),
      add: (...xs) => xs.forEach((x) => this.classList._set.add(x)),
      remove: (...xs) => xs.forEach((x) => this.classList._set.delete(x)),
      contains: (x) => this.classList._set.has(x),
      toggle: (x, force) => {
        const on = force === undefined ? !this.classList._set.has(x) : !!force;
        on ? this.classList._set.add(x) : this.classList._set.delete(x);
      },
    };
  }
}

const elements = new Map();
const document = {
  body: new El("body"),
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new El(id));
    return elements.get(id);
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement(tag) { return new El("", tag); },
};
for (const id of ["view", "streak", "theme", "toast"]) {
  elements.set(id, new El(id, id === "theme" ? "button" : "div"));
}

function SpeechSynthesisUtterance(text) {
  this.text = text;
  this.lang = "";
  this.rate = 1;
  this.voice = null;
  this.onend = null;
  this.onerror = null;
}

const windowListeners = new Map();
const window = {
  indexedDB: undefined,
  __showListeningText: false,
  addEventListener(name, fn) {
    if (!windowListeners.has(name)) windowListeners.set(name, []);
    windowListeners.get(name).push(fn);
    if (name === "load") fn();
  },
  __emit(name, payload) {
    for (const fn of windowListeners.get(name) || []) fn(payload);
  },
  speechSynthesis: {
    getVoices() {
      return [{ lang: "en-US" }, { lang: "zh-CN" }, { lang: "vi-VN" }];
    },
    cancel() {},
    resume() {},
    speak(u) {
      setTimeout(() => u.onend?.(), 0);
    },
  },
};
const navigator = { serviceWorker: { register: async () => ({}) } };
const storage = new Map();
const localStorage = {
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  setItem(k, v) { storage.set(k, String(v)); },
  removeItem(k) { storage.delete(k); },
};
class FakeAudio {
  constructor(url) { this.url = url; this.preload = ""; }
  play() { return Promise.resolve(); }
}

let fetchImpl = async (url) => {
  const u = String(url);
  if (u.includes("/version.json")) return { ok: true, json: async () => data.version };
  for (const [name, value] of Object.entries(data)) {
    if (name !== "version" && u.includes("/" + name + ".json")) {
      return { ok: true, json: async () => value };
    }
  }
  throw new Error("unknown fetch: " + u);
};

const seed = {
  schemaVersion: 2,
  stats: { xp: 123, streak: 4, learned: 7, answered: 8, correct: 6 },
  profile: { theme: "dark", autoUpdate: false, speechRate: 0.75, layout: "auto" },
  positions: { flashIndex: 17, listenIndex: 19, speakIndex: 23, quizIndex: 29 },
  vocabState: [{
    word: "altogether",
    status: "Review",
    favorite: true,
    correct_count: 4,
    wrong_count: 1,
  }],
};
storage.set("englishMaster_v1", JSON.stringify(seed));

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
try {
  new vm.Script(app, { filename: "app.js" });
  check("app.js parses", true);
} catch (e) {
  check("app.js parses", false, e.stack || String(e));
}

const hooks = `
window.__EM_TEST = {
  snap: () => ({ db, view, flashIndex, listenIndex, speakIndex, quizIndex, reviewQueue: [...reviewQueue] }),
  show, render, vocab, flashcards, quiz, listening, speaking, grammar, communication, trilingual,
  review, stats, settings, dataAudit, runContentAudit, toggleFavorite, rateFlash, answerQuiz, nextQuiz, jumpToItem, setLayoutMode,
  listenCheck, startReview, playDialogue, audioUrl, speak, startRecognition, save, load, updateOnline, toggleLayoutQuick, applyLayoutMode,
  setFetch: (fn) => { fetch = fn; },
  setStats: (stats) => { db.stats = { ...db.stats, ...stats }; },
};
`;

const context = {
  window, document, navigator, localStorage, Audio: FakeAudio,
  SpeechSynthesisUtterance, console, setTimeout, clearTimeout,
  fetch: fetchImpl,
};
vm.runInNewContext(app + "\n" + hooks, context, { filename: "english-master-runtime.js" });

for (let i = 0; i < 80; i += 1) await Promise.resolve();
await new Promise((resolve) => setTimeout(resolve, 25));

const T = window.__EM_TEST;
check("app test hooks initialized", !!T);

let snap = T.snap();
check(
  "hydrate all datasets",
  snap.db.vocab.length === 3000 &&
  snap.db.sentences.length === 3250 &&
  snap.db.questions.length === 5000 &&
  snap.db.communication.length === 228 &&
  snap.db.trilingual.length === 2500 &&
  snap.db.grammar.length === 60,
  JSON.stringify({
    vocab: snap.db.vocab.length, sentences: snap.db.sentences.length, questions: snap.db.questions.length,
    communication: snap.db.communication.length, trilingual: snap.db.trilingual.length, grammar: snap.db.grammar.length,
  })
);
check(
  "preserve user stats/profile/positions",
  snap.db.stats.xp === 123 &&
  snap.db.stats.streak === 4 &&
  snap.db.profile.theme === "dark" &&
  snap.db.profile.speechRate === 0.75 &&
  snap.flashIndex === 17 &&
  snap.listenIndex === 19 &&
  snap.speakIndex === 23 &&
  snap.quizIndex === 29
);
const first = snap.db.vocab.find((v) => v.word === "altogether");
check(
  "preserve vocab learning state",
  first?.status === "Review" && first?.favorite === true &&
  first?.correct_count === 4 && first?.wrong_count === 1
);

const audit = T.dataAudit();
check(
  "500-word cross-feature audit",
  audit.expansion500 === 500 &&
  audit.duplicateWords === 0 &&
  audit.sentences === 500 &&
  audit.questions === 500 &&
  audit.trilingual === 500 &&
  audit.communication === 500 &&
  audit.grammar === 500 &&
  audit.audio === 500 &&
  Object.values(audit.missing || {}).every((items) => items.length === 0),
  JSON.stringify(audit)
);
check(
  "500-word audit is per-item, not only aggregate",
  audit.expansion500 === 500 &&
  Object.values(audit.missing || {}).every((items) => Array.isArray(items)),
  JSON.stringify(audit.missing || {})
);

const routes = [
  "home", "vocab", "sentences", "flashcards", "quiz", "listening",
  "speaking", "grammar", "communication", "trilingual", "review", "stats", "settings",
];
for (const route of routes) {
  try {
    T.show(route);
    const html = document.getElementById("view").innerHTML;
    check("render " + route, html.length > 0 && !/\b(?:undefined|NaN)\b/.test(html));
  } catch (e) {
    check("render " + route, false, e.stack || String(e));
  }
}

T.setLayoutMode("phone");
for (const route of routes) {
  try {
    T.show(route);
    const html = document.getElementById("view").innerHTML;
    check("mobile render " + route, document.body.classList._set.has("layout-phone") && html.length > 0 && !/\b(?:undefined|NaN)\b/.test(html));
  } catch (e) {
    check("mobile render " + route, false, e.stack || String(e));
  }
}

T.show("vocab");
document.getElementById("vSearch").value = "altogether";
T.vocab();
check("search reaches new 500-word content", document.getElementById("view").innerHTML.includes("altogether"));

const favBefore = first.favorite;
T.toggleFavorite("altogether");
check("favorite interaction", first.favorite !== favBefore);

T.show("quiz");
snap = T.snap();
const q = snap.db.questions[snap.quizIndex % snap.db.questions.length];
const answeredBefore = snap.db.stats.answered;
const correctBefore = snap.db.stats.correct;
T.answerQuiz(q.answer, q.answer);
snap = T.snap();
check("quiz interaction", snap.db.stats.answered === answeredBefore + 1 && snap.db.stats.correct === correctBefore + 1);

T.show("flashcards");
T.rateFlash("Đã nhớ");
check("flashcard interaction", T.snap().db.vocab.length === 3000);

T.show("listening");
snap = T.snap();
const currentSentence = snap.db.sentences[snap.listenIndex % snap.db.sentences.length];
T.listenCheck(new El("listen-option", "button"), currentSentence.vi, currentSentence.vi);
check("listening interaction", T.snap().db.stats.answered >= answeredBefore + 2);

T.show("listening");
let html=document.getElementById("view").innerHTML;
check("listening has direct jump control", html.includes('id="listeningJump"') && html.includes("Tới câu"));
check("listening jump changes exact sentence", T.jumpToItem("listening", 100) && T.snap().listenIndex === 99 && document.getElementById("view").innerHTML.includes("Câu 100 / 3250"));
check("listening rejects out-of-range jump", T.jumpToItem("listening", 999999) === false && T.snap().listenIndex === 99);

T.show("speaking");
html=document.getElementById("view").innerHTML;
check("speaking has direct jump control", html.includes('id="speakingJump"') && html.includes("Tới câu"));
check("speaking jump changes exact sentence", T.jumpToItem("speaking", 200) && T.snap().speakIndex === 199 && document.getElementById("view").innerHTML.includes("Câu 200 / 3250"));

T.show("quiz");
html=document.getElementById("view").innerHTML;
check("quiz has direct jump control", html.includes('id="quizJump"') && html.includes("Tới câu"));
check("quiz jump changes exact question", T.jumpToItem("quiz", 300) && T.snap().quizIndex === 299 && document.getElementById("view").innerHTML.includes("Câu 300 / 5000"));

T.show("settings");
check("settings exposes one-click 500-word audit", document.getElementById("view").innerHTML.includes("runContentAudit()") && document.getElementById("view").innerHTML.includes("Kiểm tra liên kết 500 từ"));
T.runContentAudit();
check("one-click 500-word audit passes", document.getElementById("contentAuditResult").textContent.includes("500/500") && document.getElementById("contentAuditResult").textContent.includes("đầy đủ"));
check("settings exposes device layout selector", document.getElementById("view").innerHTML.includes('id="layoutMode"') && document.getElementById("view").innerHTML.includes("Điện thoại") && document.getElementById("view").innerHTML.includes("Máy tính"));
T.setLayoutMode("phone");
check("phone layout mode applies", T.snap().db.profile.layout === "phone" && document.body.classList._set.has("layout-phone") && !document.body.classList._set.has("layout-desktop"));
check("quick button is desktop-targeting in phone mode",
  document.getElementById("layoutQuick").textContent === "🖥️" &&
  document.getElementById("layoutQuick").attributes.title === "Chuyển sang giao diện máy tính" &&
  document.getElementById("layoutQuick").attributes["aria-label"] === "Chuyển sang giao diện máy tính"
);
T.toggleLayoutQuick();
check("quick layout button switches to desktop", T.snap().db.profile.layout === "desktop" && document.body.classList._set.has("layout-desktop") && document.getElementById("layoutQuick").textContent === "📱");
T.toggleLayoutQuick();
check("quick layout button switches to phone", T.snap().db.profile.layout === "phone" && document.body.classList._set.has("layout-phone") && document.getElementById("layoutQuick").textContent === "🖥️");
check("quick button is mutually exclusive",
  document.body.classList._set.has("layout-phone") && !document.body.classList._set.has("layout-desktop")
);
check("quick layout choice is persisted",
  JSON.parse(storage.get("englishMaster_v1")).profile.layout === "phone"
);
T.setLayoutMode("desktop");
check("desktop layout mode applies", T.snap().db.profile.layout === "desktop" && document.body.classList._set.has("layout-desktop") && !document.body.classList._set.has("layout-phone"));
T.setLayoutMode("auto");
check("auto layout mode restores", T.snap().db.profile.layout === "auto" && document.body.classList._set.has("layout-desktop"));

const originalMatchMedia = window.matchMedia;
let simulatedPhone = true;
window.matchMedia = (query) => ({ matches: query.includes("max-width: 800px") ? simulatedPhone : false, addEventListener() {}, addListener() {} });
T.setLayoutMode("auto");
check("auto layout detects phone viewport", document.body.classList._set.has("layout-phone") && !document.body.classList._set.has("layout-desktop"));
simulatedPhone = false;
window.__emit("resize");
check("auto layout follows viewport change to desktop", document.body.classList._set.has("layout-desktop") && !document.body.classList._set.has("layout-phone"));
simulatedPhone = true;
window.__emit("resize");
check("auto layout follows viewport change back to phone", document.body.classList._set.has("layout-phone") && !document.body.classList._set.has("layout-desktop"));
window.matchMedia = originalMatchMedia;
T.setLayoutMode("desktop");
check("desktop layout remains isolated", !document.body.classList._set.has("layout-phone") && document.body.classList._set.has("layout-desktop"));
T.setLayoutMode("phone");
check("phone layout remains isolated", document.body.classList._set.has("layout-phone") && !document.body.classList._set.has("layout-desktop"));

T.show("speaking");
check("speaking UI and microphone fallback", document.getElementById("view").innerHTML.includes("Bắt đầu nói"));
try { T.startRecognition(); check("microphone fallback", true); } catch (e) { check("microphone fallback", false, e.stack || String(e)); }

T.show("communication");
try { T.playDialogue(0); check("dialogue playback path", true); } catch (e) { check("dialogue playback path", false, e.stack || String(e)); }

T.show("trilingual");
const tri = T.snap().db.trilingual.find((x) => x.en === "altogether");
check("three-language audio paths", !!T.audioUrl(tri, "en-US") && !!T.audioUrl(tri, "zh-CN") && !!T.audioUrl(tri, "vi-VN"));

T.show("review");
T.startReview();
check("review queue", T.snap().reviewQueue.length > 0);

const provenanceBefore = T.snap().db.vocab.find((v) => v.word === "altogether");
check("expansion provenance before resync", provenanceBefore?.source === "expansion500" && provenanceBefore?.sourceVersion === "8.0.0");

await T.updateOnline(true);
const provenanceAfter = T.snap().db.vocab.find((v) => v.word === "altogether");
check(
  "resync preserves expansion provenance",
  provenanceAfter?.source === "expansion500" && provenanceAfter?.sourceVersion === "8.0.0",
  JSON.stringify({ source: provenanceAfter?.source, sourceVersion: provenanceAfter?.sourceVersion })
);

const stableCounts = {
  vocab: T.snap().db.vocab.length,
  sentences: T.snap().db.sentences.length,
  questions: T.snap().db.questions.length,
};
T.setFetch(async () => { throw new Error("forced network failure"); });
await T.updateOnline(true);
snap = T.snap();
check(
  "network failure is atomic",
  snap.db.vocab.length === stableCounts.vocab &&
  snap.db.sentences.length === stableCounts.sentences &&
  snap.db.questions.length === stableCounts.questions
);

T.setFetch(async (url) => {
  const u = String(url);
  if (u.includes("/version.json")) return { ok: true, json: async () => data.version };
  if (u.includes("/vocabulary.json")) return { ok: true, json: async () => [{ word: "", meaning: "" }] };
  throw new Error("stop after malformed vocabulary");
});
await T.updateOnline(true);
snap = T.snap();
check(
  "invalid remote content is atomic",
  snap.db.vocab.length === stableCounts.vocab &&
  snap.db.sentences.length === stableCounts.sentences &&
  snap.db.questions.length === stableCounts.questions
);

T.setStats({ xp: 555 });
T.save();
T.setStats({ xp: 777 });
T.save();
storage.set("englishMaster_v1", "{broken-json");
T.setStats({ xp: 0 });
T.load();
check("corrupt primary recovers from backup", T.snap().db.stats.xp === 555, T.snap().db.stats.xp);

check("content storage key exists", !!storage.get("englishMaster_v1"));
check("backup storage key exists", !!storage.get("englishMaster_v1_backup"));

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
check("quick layout button is in header", index.includes('id="layoutQuick"') && index.includes("toggleLayoutQuick()"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
check("index references app/style/manifest", index.includes('src="app.js"') && index.includes('href="styles.css"') && index.includes('href="manifest.json"'));
check("service worker caches app assets", sw.includes("app.js") && sw.includes("styles.css") && sw.includes("manifest.json"));
check("manifest is installable", manifest.display === "standalone" && manifest.start_url === "./" && manifest.icons?.length >= 2);
check("version signals align", /APP_VERSION="8\.0\.0"/.test(app) && /application-version" content="8\.0\.0"/.test(index) && /English Master V8\.0\.0/.test(index) && /english-master-v8\.0\.0/.test(sw));
const styles=fs.readFileSync(path.join(root,"styles.css"),"utf8");
check("phone layout is scoped only to phone class", styles.includes("body.layout-phone") && styles.includes("body.layout-phone #side") && styles.includes("body.layout-phone main"));
check("phone layout uses bottom navigation", styles.includes("body.layout-phone #side{position:fixed") && styles.includes("body.layout-phone #side button"));
check("phone layout has safe-area support", styles.includes("env(safe-area-inset-bottom)"));
check("phone layout hardens long tables", styles.includes("body.layout-phone .table{min-width:620px}"));
check("phone layout keeps touch targets usable", styles.includes("body.layout-phone button,body.layout-phone input,body.layout-phone select{min-height:42px}"));
check("quick layout button has stable touch size", styles.includes(".layout-quick{min-width:42px;min-height:42px") && styles.includes("body.layout-phone .layout-quick,body.layout-desktop .layout-quick"));


if (failures.length) {
  console.error("\nRUNTIME SMOKE FAILED");
  for (const f of failures) console.error("-", f.name, f.detail ? ":: " + f.detail : "");
  process.exitCode = 1;
} else {
  console.log("\nRUNTIME SMOKE PASSED:", "all checks");
}
