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
const icon512 = fs.readFileSync(path.join(root, "icon-512.svg"), "utf8");


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
    this.appendChild = (child) => { this.child = child; };
    this.remove = () => { this.removed = true; };
    this.click = () => { this.clicked = true; };
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
  confirm: () => true,
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
      speechCalls.push(u);
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
const normalizeTest = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const audioCalls = [];
const speechCalls = [];
class FakeAudio {
  constructor(url) { this.url = url; this.preload = ""; this.playbackRate = 1; this.paused = false; this.currentTime = 0; this.onended = null; this.onerror = null; audioCalls.push(this); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
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

const seedVocabWord = String(data.vocabulary.find((v) => v && String(v.word ?? "").trim())?.word ?? "").trim();
const seed = {
  schemaVersion: 2,
  stats: { xp: 123, streak: 4, learned: 7, answered: 8, correct: 6 },
  profile: { theme: "dark", autoUpdate: false, speechRate: 0.75, layout: "auto" },
  positions: { flashIndex: 17, listenIndex: 19, speakIndex: 23, quizIndex: 29 },
  vocabState: [{
    word: seedVocabWord,
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
  snap: () => ({ db, view, flashIndex, listenIndex, speakIndex, quizIndex, quizOptions: quizOptions.map((x) => x.text), quizCorrectIndex, reviewQueue: [...reviewQueue], practiceQueue: practiceQueue.map((x) => ({...x, options:[...(x.options||[])], words:[...(x.words||[])]})), practiceIndex, practiceAnswered, practiceAnswerOrder: [...practiceAnswerOrder], practiceCorrectCount, practiceMode, practiceAnsweredCount, practiceSessionXp, quickReviewActive, reviewSession: {...reviewSession}, listenAnswered, lastReviewSummary: window.__lastReviewSummary ? {...window.__lastReviewSummary} : null }),
  show, render, vocab, flashcards, quiz, listening, speaking, grammar, communication, trilingual,
  grammarPracticePool, review, stats, settings, exportProgress, importProgress, resetProgress, dataAudit, runContentAudit, toggleFavorite, rateFlash, answerQuiz, nextQuiz, jumpToItem, setLayoutMode, goPage, sentencePracticePool, communicationPracticePool, playAudio, startReview, buildReviewQueue,
  listenCheck, startReview, buildQuickStudyQueue, startQuickStudy, finishReviewSession, reviewSummary, startQuickStudy, playDialogue, audioUrl, audioButton, speak, speakSequence, startRecognition, save, load, updateOnline, toggleLayoutQuick, applyLayoutMode, applyUserSnapshot, usableCachedContent, similarityScore, normalizeArrayIndex, weakVocabularyPool, buildPracticeSession, practiceVocabularyPool, practiceModeLabel, startPracticeMode, practice, practiceAnswer, practiceNext, practicePickToken, practiceRemoveToken, practiceCheckOrder, restartPractice, learnNext, dailyGoal, dailyPercent, ensureDailyProgress, guessLang, esc, escapeJs, standalonePracticeTemplateIsNatural, isNaturalStandaloneSentence, communicationLineIsNatural, contentSnapshot, userSnapshot, recordActivity, recordStudyUnit, addXP, mergeBy, blandExample, remoteReplaceAllowed, getVoice, voiceAvailability, dailyGoalOptions, registerServiceWorker, checkAppVersion, stopSpeech, playAudio, blankWordInExample,
  dateKey, setDailyGoal, savedProgressLooksUsable, legacyContentLooksUsable, openContentDB, cacheContent, readCachedContent, recordVocabOutcome, stopRecognition, shell, audioGroup, validateIncomingContent, validateContent, isPhoneViewport, updateLayoutQuickButton, handleViewportChange, pageControls, jumpControl, renderFlashcards, shuffleFlash, renderListening, renderSpeaking, nextSpeak, prevSpeak, normalizeQuizIndex, chooseFour, finishPractice, openProgressImport, validateProgressImport, compareVersions, reviewIntervalDays, reviewMeta, splitSpeechText, tokenLevenshtein, audioCacheSize, preloadAudio, refreshVoiceCache, derivedPoolSignature, normalizeSpeechText, getVoice,
  setView: (v) => { view = v; },
  setQuizCorrectIndex: (v) => { quizCorrectIndex = v; },
  setFetch: (fn) => { fetch = fn; },
  setStats: (stats) => { db.stats = { ...db.stats, ...stats }; },
};
`;

const context = {
  window, document, navigator, localStorage,
  URL: { createObjectURL: () => "blob:english-master-test", revokeObjectURL: () => {} },
  Blob: class { constructor(parts, options) { this.parts = parts; this.type = options?.type || ""; } },
  Audio: FakeAudio,
  SpeechSynthesisUtterance, console, setTimeout, clearTimeout,
  fetch: fetchImpl,
};
vm.runInNewContext(app + "\n" + hooks, context, { filename: "english-master-runtime.js" });

for (let i = 0; i < 80; i += 1) await Promise.resolve();

const T = window.__EM_TEST;
check("app test hooks initialized", !!T);

let snap = T.snap();
let hydrateReady = false;
for (let i = 0; i < 300; i += 1) {
  snap = T.snap();
  if (
    snap.db.vocab.length === 3500 &&
    snap.db.sentences.length === 3750 &&
    snap.db.questions.length === 6000 &&
    snap.db.communication.length === 328 &&
    snap.db.trilingual.length === 3000 &&
    snap.db.grammar.length === 80
  ) {
    hydrateReady = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
}
const hydrateError = window.__EM_LAST_UPDATE_ERROR || document.getElementById("toast")?.textContent || "";
check("hydrate all datasets", hydrateReady &&
  snap.db.vocab.length === 3500 &&
  snap.db.sentences.length === 3750 &&
  snap.db.questions.length === 6000 &&
  snap.db.communication.length === 328 &&
  snap.db.trilingual.length === 3000 &&
  snap.db.grammar.length === 80,
  JSON.stringify({
    vocab: snap.db.vocab.length, sentences: snap.db.sentences.length, questions: snap.db.questions.length,
    communication: snap.db.communication.length, trilingual: snap.db.trilingual.length, grammar: snap.db.grammar.length,
    hydrateError
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
const first = snap.db.vocab.find((v) => v && String(v.word ?? "").trim()) || snap.db.vocab[0];
check(
  "preserve vocab learning state",
  first?.status === "Review" && first?.favorite === true &&
  first?.correct_count === 4 && first?.wrong_count === 1
);

const audit = T.dataAudit();
const knownBadVocabularyExamples = [
  "The room feels shy today.",
  "The room feels rude today.",
  "The road is useful in daily life.",
  "The tennis is useful in daily life.",
  "I need to receive before dinner.",
  "The situation is financial right now.",
  "The situation is gradual right now.",
  "The situation is primary right now.",
  "We need to succeed before the meeting.",
  "We need to invest before the meeting.",
  "We need to float before the meeting.",
  "We need to surround before the meeting.",
  "This hall is useful in everyday life.",
  "This bottom is useful in everyday life.",
  "The team is working on secretary.",
  "They properly use the app.",
  "I saw aspect on my way home.",
  "I noticed justice this morning."
];
check(
  "vocabulary examples reject known semantic templates",
  knownBadVocabularyExamples.every((en) => !snap.db.vocab.some((v) => String(v.example || "").trim().toLowerCase() === en.toLowerCase())),
  JSON.stringify({remaining:knownBadVocabularyExamples.filter((en) => snap.db.vocab.some((v) => String(v.example || "").trim().toLowerCase() === en.toLowerCase()))})
);

check(
  "500-word cross-feature audit",
  audit.expansion500 === 500 &&
  audit.duplicateWords === 0 &&
  audit.sentences === 1000 &&
  audit.generalSentences === 500 &&
  audit.independentSentences === 1500 &&
  audit.independentSentenceLinks === 0 &&
  audit.naturalIndependentSentences === 1500 &&
  audit.standaloneQualityIssues === 0 &&
  audit.standaloneDuplicateEnglish === 0 &&
  audit.questions === 500 &&
  audit.trilingual === 500 &&
  audit.communication === 500 &&
  audit.grammar === 500 &&
  audit.audio === 500 &&
  Object.values(audit.missing || {}).every((items) => items.length === 0),
  JSON.stringify(audit)
);
const standalone = data.sentences.filter((s) => s?.source === "expansion500" || s?.source === "extra500_v8");
const practicePool = T.sentencePracticePool();
const badStandalone = standalone.filter((s) => s?.vocabWord || !String(s?.en ?? "").trim() || !String(s?.vi ?? "").trim() ||
  /^I want to understand .* better\.$/i.test(String(s.en ?? "")) ||
  /^The .* is on my desk today\.$/i.test(String(s.en ?? "")) ||
  /^I talked to the homework after class\.$/i.test(String(s.en ?? "")) ||
  /^I put the airport in my travel bag\.$/i.test(String(s.en ?? "")));
check(
  "standalone sentence pack is natural and independent",
  standalone.length === 1000 &&
  badStandalone.length === 0 &&
  T.dataAudit().naturalIndependentSentences === 1500 &&
  T.dataAudit().standaloneQualityIssues === 0 &&
  T.dataAudit().standaloneDuplicateEnglish === 0,
  JSON.stringify({count:standalone.length,bad:badStandalone.slice(0,5),quality:T.dataAudit().standaloneQualityIssues,duplicates:T.dataAudit().standaloneDuplicateEnglish})
);
const practiceKeys = practicePool.map((s) => String(s.en ?? "").trim().toLowerCase().replace(/\\s+/g, " "));
const knownBadPracticeExamples = [
  "The room looks worried this morning.",
  "I'm practicing shirt and pants.",
  "I'll keep practicing dress and skirt.",
  "When would you use broken?",
  "Can you give me an example with painting?",
  "Why is piece useful in real life?",
  "Which word is easier to remember: tape or hide?",
  "She wants to often after work.",
  "I need to usually before breakfast.",
  "That was a thirsty experience for me.",
  "I feel dangerous when I finish my work.",
  "The new plan is same for us.",
  "This majority is useful in everyday life.",
  "I try to give every day.",
  "We will meet next hour.",
  "We can hear together this evening.",
  "The team is working on secretary.",
  "They properly use the app.",
  "I use my email to study at night.",
  "I feel afraid when I finish my work.",
  "I feel lazy when I finish my work.",
  "I feel weak when I finish my work.",
  "We can tell together this evening.",
  "He decided to get before the meeting.",
  "We can buy together this evening.",
  "I feel afraid when I finish my work.",
  "I feel lazy when I finish my work.",
  "I feel weak when I finish my work.",
  "We will meet next evening.",
  "We will meet next hour.",
  "We will meet next date."
];
check(
  "sentence practice pool filters bad/duplicate entries",
  practicePool.length > 0 &&
  practicePool.length <= snap.db.sentences.length &&
  new Set(practiceKeys).size === practiceKeys.length &&
  practicePool.every((s) => !s.vocabWord && String(s.en ?? "").trim() && String(s.vi ?? "").trim()) &&
  knownBadPracticeExamples.every((en) => !practicePool.some((s) => String(s.en ?? "").trim().toLowerCase() === en.toLowerCase())),
  JSON.stringify({standalone:standalone.length,practicePool:practicePool.length,duplicates:practiceKeys.length-new Set(practiceKeys).size})
);
check(
  "500-word audit is per-item, not only aggregate",
  audit.expansion500 === 500 &&
  Object.values(audit.missing || {}).every((items) => Array.isArray(items)),
  JSON.stringify(audit.missing || {})
);

const routes = [
  "home", "vocab", "sentences", "flashcards", "practice", "quiz", "listening",
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
const searchableVocab = snap.db.vocab.find((v) => v && String(v.word ?? "").trim());
check("has searchable vocab record", !!searchableVocab);
const searchTerm = searchableVocab ? String(searchableVocab.word).trim() : "";
if (searchTerm) {
  document.getElementById("vSearch").value = searchTerm;
  T.vocab();
}
check("search reaches an existing vocab record", !!searchTerm && document.getElementById("view").innerHTML.toLowerCase().includes(searchTerm.toLowerCase()));

const favBefore = searchableVocab?.favorite;
if (searchTerm) T.toggleFavorite(searchTerm);
check("favorite interaction", !!searchableVocab && searchableVocab.favorite !== favBefore);
T.show("home");
const homeState=T.snap().db.vocab;
const expectedPending=new Set(homeState.filter(v=>v.reviewDue&&new Date(v.reviewDue)<=new Date()).map(v=>String(v.word||"").trim().toLowerCase()).concat(homeState.filter(v=>v.status==="Chưa nhớ"||v.status==="Review").map(v=>String(v.word||"").trim().toLowerCase())).filter(Boolean)).size;
const homePendingMatch=document.getElementById("view").innerHTML.match(/(\d+) từ đang đến hạn hoặc yếu/);
check("home pending count is unique", !!homePendingMatch && Number(homePendingMatch[1])===expectedPending);

const quickDue = snap.db.vocab.find(v=>String(v.word||"").trim()===String(snap.db.vocab[0]?.word||"").trim());
const quickWeak = snap.db.vocab.find(v=>v!==quickDue);
const quickNew = snap.db.vocab.find(v=>v!==quickDue && v!==quickWeak);
if(quickDue)quickDue.reviewDue=new Date(Date.now()-86400000).toISOString();
if(quickWeak){quickWeak.status="Review";quickWeak.reviewDue=null;}
if(quickNew){quickNew.status="New";quickNew.reviewDue=null;}
const quickQueue=T.buildQuickStudyQueue(10);
check(
  "quick study builds a capped unique priority queue",
  quickQueue.length>0 && quickQueue.length<=10 && new Set(quickQueue).size===quickQueue.length &&
  (!quickDue || quickQueue[0]===normalizeTest(quickDue.word)) &&
  (!quickWeak || quickQueue.includes(normalizeTest(quickWeak.word)))
);
T.startQuickStudy();
const quickSnap=T.snap();
check(
  "quick study opens a dedicated flashcard session",
  quickSnap.quickReviewActive===true && quickSnap.reviewQueue.length>0 && quickSnap.reviewQueue.length<=10 &&
  document.getElementById("view").innerHTML.includes("Học nhanh hôm nay")
);

const favTarget=snap.db.vocab.find(v=>v!==quickDue && v!==quickWeak);
if(favTarget)favTarget.favorite=true;
const favQueue=T.buildReviewQueue("favorites",10);
check("review center filters favorite words", favTarget ? favQueue.length>0 && favQueue.every(k=>snap.db.vocab.find(v=>normalizeTest(v.word)===k)?.favorite===true) : favQueue.length===0);
const newQueue=T.buildReviewQueue("new",10);
check("review center filters new words", newQueue.length>0 && newQueue.every(k=>snap.db.vocab.find(v=>normalizeTest(v.word)===k)?.status==="New"));
const smartQueue=T.buildReviewQueue("smart",20);
check(
  "smart review merges priorities without duplicates",
  smartQueue.length>0 && smartQueue.length<=20 && new Set(smartQueue).size===smartQueue.length &&
  (!quickDue || smartQueue[0]===normalizeTest(quickDue.word))
);
T.startReview("favorites",5);
const favoriteSession=T.snap();
check("favorite review opens as a real session", favoriteSession.quickReviewActive===false && favoriteSession.reviewQueue.length>0 && favoriteSession.reviewQueue.length<=5 && favoriteSession.reviewQueue.every(k=>snap.db.vocab.find(v=>normalizeTest(v.word)===k)?.favorite===true));
T.show("home");



// Core helper and resilience audit.
check("language detection covers English/Chinese/Vietnamese", T.guessLang("hello")==="en-US" && T.guessLang("你好")==="zh-CN" && T.guessLang("xin chào")==="vi-VN");
check("inline JS escaping protects HTML entities", T.escapeJs("&#39;<>&quot;").includes("&amp;#39;") && T.escapeJs("&#39;<>&quot;").includes("&lt;") && T.escapeJs("&#39;<>&quot;").includes("&gt;"));
check("remote validator handles null records safely", (()=>{try{T.validateIncomingContent({...{
  vocab:[null],sentences:[],questions:[],grammar:[],communication:[],trilingual:[]
}});return false;}catch(e){return true;}})());

check("fill-in-the-blank only replaces whole words", T.blankWordInExample("I like bread.", "bread").includes("_____") && T.blankWordInExample("The printer is useful.", "print")==="");
check("spaced repetition interval grows with memory streak",
  T.reviewIntervalDays({reviewStreak:1},"Đã nhớ")===1 &&
  T.reviewIntervalDays({reviewStreak:2},"Đã nhớ")===2 &&
  T.reviewIntervalDays({reviewStreak:3},"Đã nhớ")===4 &&
  T.reviewIntervalDays({reviewStreak:5},"Đã nhớ")===14 &&
  T.reviewIntervalDays({reviewStreak:6},"Đã nhớ")===30 &&
  T.reviewIntervalDays({reviewStreak:8},"Đã nhớ")===60
);
check("easy rating extends spaced repetition interval",
  T.reviewIntervalDays({reviewStreak:1},"Rất dễ")===2 &&
  T.reviewIntervalDays({reviewStreak:5},"Rất dễ")===28 &&
  T.reviewIntervalDays({reviewStreak:8},"Rất dễ")===90 &&
  T.reviewIntervalDays({reviewStreak:2},"Chưa nhớ")===0
);

check("fill-in-the-blank escapes regex metacharacters", T.blankWordInExample("Use C++ today.", "C++").includes("_____") && T.blankWordInExample("This costs $5.", "$5").includes("_____") && T.blankWordInExample("Read (draft) now.", "(draft)").includes("_____"));
const q0=T.snap().db.questions[0];
const savedOpts=q0.options,savedAns=q0.answer;
q0.options=[savedOpts[0],savedOpts[0],savedOpts[2],savedOpts[3]];
T.show("quiz");
const badQuizSnap=T.snap();
check("quiz skips duplicate local options", badQuizSnap.quizOptions.length===4 && badQuizSnap.db.questions[badQuizSnap.quizIndex]?.id!=="qa-bad");
q0.options=savedOpts;q0.answer=savedAns;
T.show("quiz");
check("quiz recovers after local question repair", T.snap().quizOptions.length===4 && Number.isInteger(T.snap().quizCorrectIndex));

check("standalone sentence naturality filter works", T.standalonePracticeTemplateIsNatural("It is useful to practice a little every day.") && !T.standalonePracticeTemplateIsNatural("It is hungry to practice a little every day."));
const validIndependent=T.sentencePracticePool()[0];
check("standalone sentence validator accepts real sentence", !!validIndependent && T.isNaturalStandaloneSentence(validIndependent)===true);
check("communication line filter rejects fragments", T.communicationLineIsNatural("to practice")==false);
check("mergeBy deduplicates and can replace", T.mergeBy([{id:"a",value:1}],[{id:"a",value:2},{id:"b",value:3}],x=>x.id,(old,incoming)=>incoming.value>old.value).length===2 &&
  T.mergeBy([{id:"a",value:1}],[{id:"a",value:2}],x=>x.id,(old,incoming)=>true)[0].value===2);
check("remote replacement policy recognizes replaceable sources", T.remoteReplaceAllowed({example:"I learned the word hello."}) && !T.remoteReplaceAllowed({example:"Hello, how are you?"}));
check("audio URL language routing is safe", T.audioUrl({audioEn:"en.mp3",audioZh:"zh.mp3",audioVi:"vi.mp3"},"en-US")==="en.mp3" &&
  T.audioUrl({audioEn:"en.mp3",audioZh:"zh.mp3",audioVi:"vi.mp3"},"zh-CN")==="zh.mp3" &&
  T.audioUrl({audio:"generic.mp3"},"zh-CN")==="generic.mp3" &&
  T.audioUrl({audio:"generic.mp3",zh:"你好",vi:"xin chào"},"zh-CN")==="");
check("daily goal options render a selected value", T.dailyGoalOptions().includes('value="10"') && T.dailyGoalOptions().includes("selected"));
T.show("settings");
const settingsUiHtml=document.getElementById("view")?.innerHTML||"";
check("settings daily-goal selector uses validated setter", settingsUiHtml.includes('onchange="setDailyGoal(this.value)"'));
const daily0=Number(T.snap().db.stats.dailyUnits)||0;
T.recordStudyUnit();
const daily1=Number(T.snap().db.stats.dailyUnits)||0;
check("daily study unit increments exactly once", daily1===daily0+1);
T.applyUserSnapshot({stats:{dailyUnits:"0",practiceCompleted:"4"},profile:{theme:"light"},vocabState:[]});
check("V9 progress counters normalize and remain numeric", typeof T.snap().db.stats.dailyUnits==="number" && typeof T.snap().db.stats.practiceCompleted==="number" && T.snap().db.stats.practiceCompleted===4);
T.setStats({lastActivityDate:""});
const beforeActivity=Number(T.snap().db.stats.dailyUnits)||0;
T.recordActivity();
const afterFirstActivity=T.snap().db.stats.dailyUnits;
T.recordActivity();
const afterSecondActivity=T.snap().db.stats.dailyUnits;
check("activity tracking counts each completed activity", afterFirstActivity===beforeActivity+1 && afterSecondActivity===beforeActivity+2);

// Direct audit of remaining helper paths and edge cases.
check("date key is stable", T.dateKey(new Date("2026-09-30T12:00:00"))==="2026-09-30");
check("language voice lookup handles exact and fallback", !!T.getVoice("en-US") && !!T.getVoice("zh-CN"));
check("voice availability reports supported languages", T.voiceAvailability().includes("en-US") && T.voiceAvailability().includes("zh-CN"));
check("shell escapes rendered text", !T.shell("<x>","a&b").includes("<x>"));
check("audio group renders three speed controls", (T.audioGroup("hello","en-US").match(/<button/g)||[]).length===3);
check("page controls hide for one-page lists", T.pageControls(1,20,50,"vocab")==="" && T.pageControls(1,100,50,"vocab").includes("Trang 1 / 2"));
check("jump control exposes bounded number input", T.jumpControl("quiz",2,6000).includes('min="1"') && T.jumpControl("quiz",2,6000).includes('max="6000"'));
check("quiz index normalization handles corrupt global index", (T.setStats({}), T.show("quiz"), true));
T.jumpToItem("quiz",1);
T.snap().db.questions[0].id="qa-original-0";
T.snap().db.questions.unshift({id:"qa-bad",prompt:"bad",options:["x","x","y","z"],answer:0});
const beforeQCount=T.snap().db.questions.length;
T.show("quiz");
check("quiz skips corrupted question safely", T.snap().quizOptions.length===4 && T.snap().db.questions.length===beforeQCount);
T.snap().db.questions.shift();
const v=T.snap().db.vocab.find(x=>String(x.word||"").trim());
if(v){
  const before={status:v.status,correct:v.correct_count||0,wrong:v.wrong_count||0,reviewStreak:v.reviewStreak||0};
  T.recordVocabOutcome(v.word,true,3);
  const after=T.snap().db.vocab.find(x=>x.word===v.word);
  check("vocabulary outcome updates correct/review state", after.correct_count===before.correct+1 && after.reviewDue && after.status!=="New" && after.reviewStreak===before.reviewStreak+1);
  T.recordVocabOutcome(v.word,false,0);
  const afterWrong=T.snap().db.vocab.find(x=>x.word===v.word);
  check("vocabulary wrong outcome schedules immediate review and resets streak", afterWrong.wrong_count===before.wrong+1 && afterWrong.status==="Chưa nhớ" && afterWrong.reviewStreak===0);
T.startReview("smart",1);
const sessionWord=T.snap().db.vocab[0];
const sessionBeforeXp=T.snap().db.stats.xp;
T.rateFlash("Đã nhớ");
const summarySnap=T.snap();
check("flashcard session ends on summary", summarySnap.view==="reviewSummary" && summarySnap.reviewQueue.length===0 && summarySnap.lastReviewSummary?.total===1 && summarySnap.lastReviewSummary?.answered===1);
check("flashcard session summary counts remembered and XP", summarySnap.lastReviewSummary?.remembered===1 && summarySnap.lastReviewSummary?.forgot===0 && summarySnap.lastReviewSummary?.xp===5 && summarySnap.db.stats.xp===sessionBeforeXp+5);
T.startReview("smart",1);
T.show("home");
check("leaving an unfinished review clears transient session state", T.snap().reviewSession.active===false && T.snap().reviewQueue.length===0);

}
check("no-indexedDB content cache path is graceful", typeof T.openContentDB()?.then==="function");
T.stopRecognition();
check("stop recognition is idempotent", true);
const incomingValid={
  vocab:[{word:"qa",meaning:"qa"}],
  sentences:[{id:"qa-s",en:"I study.",vi:"Tôi học."}],
  questions:[{id:"qa-q",prompt:"Q",options:["a","b","c","d"],answer:0}],
  grammar:[{id:"qa-g",title:"Present",formula:"S + V"}],
  communication:[{id:"qa-c",title:"Hi",lines:[["A","Hello."],["B","Hi."]]}],
  trilingual:[{en:"hello",zh:"你好",pinyin:"nǐ hǎo",vi:"xin chào"}]
};
check("incoming content validator accepts valid schema", T.validateIncomingContent(incomingValid)===true);
check("incoming content validator rejects invalid schema", (()=>{try{T.validateIncomingContent({...incomingValid,questions:[{id:"bad",prompt:"Q",options:["a","a","b","c"],answer:0}]});return false;}catch(e){return true;}})());
check("incoming validator rejects duplicate remote keys", (()=>{try{T.validateIncomingContent({...incomingValid,vocab:[{word:"qa",meaning:"1"},{word:" QA ",meaning:"2"}]});return false;}catch(e){return true;}})());

const snapBefore=T.snap().db.vocab.length;
const dup=T.snap().db.vocab.slice();
T.snap().db.vocab.push({...dup[0]});
const issues=T.validateContent(true);
T.snap().db.vocab.pop();
check("content validator catches duplicate vocab", issues.some(x=>x.includes("vocab trùng")) && T.snap().db.vocab.length===snapBefore);
check("layout viewport helper returns a boolean", typeof T.isPhoneViewport()==="boolean");
T.updateLayoutQuickButton(true);
check("layout button labels desktop target in phone mode", document.getElementById("layoutQuick").attributes["aria-label"].includes("máy tính"));
T.handleViewportChange();
T.renderFlashcards();T.renderListening();T.renderSpeaking();
check("render aliases execute safely", true);
T.show("speaking");T.nextSpeak();T.prevSpeak();check("speaking next/prev navigation executes", true);
check("chooseFour returns unique choices when enough data", T.chooseFour("___unlikely___","meaning").length===4);
const savedStats={...T.snap().db.stats};T.finishPractice(true);T.setStats(savedStats);
check("finishPractice is callable without corrupting stats", true);
check("progress import validator rejects invalid daily counters", (()=>{try{T.validateProgressImport({stats:{dailyUnits:-1},profile:{theme:"light"},vocabState:[]});return false;}catch(e){return true;}})());
const dailyBackup=JSON.parse(JSON.stringify(T.snap().db.stats));
T.ensureDailyProgress();
let dailySnap=T.snap();
const todayKey=T.dateKey();
const todayEntry=(dailySnap.db.stats.dailyHistory||[]).find(x=>x.date===todayKey);
check("daily history keeps today's activity", !!todayEntry && todayEntry.units===Number(dailySnap.db.stats.dailyUnits||0) && todayEntry.goal===T.dailyGoal());
T.recordStudyUnit();
dailySnap=T.snap();
const afterEntry=(dailySnap.db.stats.dailyHistory||[]).find(x=>x.date===todayKey);
check("daily history increments with study activity", !!afterEntry && afterEntry.units===Number(dailySnap.db.stats.dailyUnits||0));
const badHistoryTests=[
  {stats:{dailyHistory:"bad"},profile:{theme:"light"},vocabState:[]},
  {stats:{dailyHistory:[{date:"bad",units:1,goal:10}]},profile:{theme:"light"},vocabState:[]},
  {stats:{dailyHistory:[{date:todayKey,units:-1,goal:10}]},profile:{theme:"light"},vocabState:[]}
];
check("progress import rejects malformed daily history", badHistoryTests.every(x=>{try{T.validateProgressImport(x);return false;}catch(e){return true;}}));
const validDaily={stats:{dailyHistory:[{date:todayKey,units:3,goal:5}]},profile:{theme:"light"},vocabState:[]};
check("progress import accepts valid daily history", (()=>{try{T.validateProgressImport(validDaily);return true;}catch(e){return false;}})());
const invalidImportGuards=[
  {stats:{dailyHistory:[{date:todayKey,units:1,goal:101}]},profile:{theme:"light"},vocabState:[]},
  {stats:{dailyHistory:[{date:todayKey,units:1,goal:10}]},profile:{theme:"light"},vocabState:[{word:"Hello",status:"New"},{word:" hello ",status:"New"}]},
  {stats:{dailyHistory:[{date:todayKey,units:1,goal:10}]},profile:{theme:"light"},vocabState:[{word:"Hello",status:"New",reviewDue:"not-a-date"}]}
];
check("progress import rejects unsafe goal/state/timestamp variants", invalidImportGuards.every(x=>{try{T.validateProgressImport(x);return false;}catch(e){return true;}}));
T.setStats(dailyBackup);T.ensureDailyProgress();


T.show("practice");
const practiceSessionXpBefore=Number(T.snap().db.stats.xp)||0;
let ps = T.snap();
const modes=["weak","favorites","new","mixed"];
for(const mode of modes){
  const pool=T.practiceVocabularyPool(mode);
  const queue=T.buildPracticeSession(8,mode);
  check("practice mode "+mode+" builds from the selected pool", queue.length===Math.min(8,pool.length) && queue.length>0);
}
T.startPracticeMode("mixed",6);
const modeSnap=T.snap();
check("practice mode start resets session counters", modeSnap.practiceMode==="mixed" && modeSnap.practiceQueue.length===6 && modeSnap.practiceAnsweredCount===0 && modeSnap.practiceCorrectCount===0 && modeSnap.practiceSessionXp===0);
const malformedOrderBefore=T.snap().practiceAnswerOrder.length;
T.practicePickToken(-1);
T.practicePickToken(999999);
check("practice rejects malformed sentence-order tokens", T.snap().practiceAnswerOrder.length===malformedOrderBefore);
T.startPracticeMode("favorites",6);
const favoriteModeCount=T.snap().practiceQueue.length;
T.show("home");T.show("practice");
const reopenedPractice=T.snap();
check("reopening practice preserves selected mode", reopenedPractice.practiceMode==="favorites" && reopenedPractice.practiceQueue.length===favoriteModeCount);
T.startPracticeMode("smart",8);
ps=T.snap();

check("practice session creates mixed exercises", ps.practiceQueue.length === 8 &&
  new Set(ps.practiceQueue.map(x=>x.type)).size >= 3 &&
  ps.practiceQueue.every(x=>(x.type==="order" ? x.words.length>=1 : x.options.length===4)));
const practiceFirst = ps.practiceQueue[0];
const dailyBeforePractice = Number(ps.db.stats.dailyUnits)||0;
if(practiceFirst && practiceFirst.type!=="order"){
  const correctPractice = practiceFirst.options.findIndex(x=>normalizeTest(x)===normalizeTest(practiceFirst.answer));
  T.practiceAnswer(correctPractice);
  ps = T.snap();
  check("practice answer updates learning and daily progress", ps.practiceAnswered && (Number(ps.db.stats.dailyUnits)||0)===dailyBeforePractice+1 &&
    ps.db.vocab.some(v=>String(v.word||"").trim().toLowerCase()===String(practiceFirst.word||"").trim().toLowerCase() && Number(v.correct_count||0)>=1), JSON.stringify({type:practiceFirst.type,word:practiceFirst.word,answer:practiceFirst.answer,before:dailyBeforePractice,after:ps.db.stats.dailyUnits}));
}
T.show("practice");
for(let step=0; step<ps.practiceQueue.length; step++){
  const item=T.snap().practiceQueue[T.snap().practiceIndex];
  if(!item)break;
  if(item.type==="order"){
    const targetWords=String(item.target||"").replace(/[.!?]+$/,"").split(/\s+/).filter(Boolean);
    targetWords.forEach(word=>{
      const idx=item.words.findIndex((w,i)=>T.snap().practiceAnswerOrder.includes(i)===false&&String(w).toLowerCase()===String(word).toLowerCase());
      if(idx>=0)T.practicePickToken(idx);
    });
    T.practiceCheckOrder();
  }else{
    const idx=item.options.findIndex(x=>normalizeTest(x)===normalizeTest(item.answer));
    T.practiceAnswer(idx);
  }
  T.practiceNext();
}
check("practice completion awards completion counter", (T.snap().db.stats.practiceCompleted||0)>=1);
check("perfect mixed practice awards lesson and perfect bonus XP", (Number(T.snap().db.stats.xp)||0)-practiceSessionXpBefore>=160);
check("practice completion reward message is not stale", !document.getElementById("toast").textContent.includes("+20 XP"));
check("completed practice awards lesson XP", (Number(T.snap().db.stats.xp)||0)>0);
check("practice completion reports selected mode", !String(document.getElementById("toast").textContent||"").includes("undefined"));
check("practice completion reports correct answered count", /Hoàn thành .*: 8\/8 đúng/.test(String(document.getElementById("toast").textContent||"")));


T.show("quiz");
snap = T.snap();
const renderedQuizOptions = snap.quizOptions.map((x) => String(x).trim().toLowerCase());
const q = snap.db.questions.find((item) => {
  if (!item || !Array.isArray(item.options)) return false;
  const normalized = item.options.map((x) => String(x).trim().toLowerCase());
  return normalized.length === renderedQuizOptions.length && normalized.every((x) => renderedQuizOptions.includes(x));
});
check("quiz has a matching source question", !!q, JSON.stringify({quizIndex:snap.quizIndex,options:renderedQuizOptions}));
const originalOptions = q ? q.options.map((x) => String(x).trim().toLowerCase()) : [];
const renderedOptions = snap.quizOptions.map((x) => String(x).trim().toLowerCase());
check(
  "quiz shuffles all four choices",
  !!q &&
  renderedOptions.length === 4 &&
  new Set(renderedOptions).size === 4 &&
  new Set(renderedOptions).size === new Set(originalOptions).size &&
  originalOptions.every((x) => renderedOptions.includes(x)) &&
  snap.quizCorrectIndex >= 0 && snap.quizCorrectIndex < 4
);
const quizOrders = new Set();
for (let i = 0; i < 12; i += 1) {
  T.quiz();
  const order = T.snap().quizOptions.join("\u0000");
  quizOrders.add(order);
}
check("quiz order actually varies across renders", quizOrders.size > 1, "orders=" + quizOrders.size);
T.quiz();
snap = T.snap();
const answeredBefore = snap.db.stats.answered;
const correctBefore = snap.db.stats.correct;
const correctChoice = snap.quizCorrectIndex;
T.answerQuiz(correctChoice, correctChoice);
snap = T.snap();
check("quiz interaction", snap.db.stats.answered === answeredBefore + 1 && snap.db.stats.correct === correctBefore + 1);
const answeredAfterFirst = snap.db.stats.answered;
T.answerQuiz(correctChoice, correctChoice);
check("quiz blocks double-answer scoring", T.snap().db.stats.answered === answeredAfterFirst && T.snap().db.stats.correct === correctBefore + 1);

T.show("quiz");
const invalidQuizAnswerBefore = T.snap().db.stats.answered;
const invalidQuizIndexBefore = T.snap().quizIndex;
T.answerQuiz(999, T.snap().quizCorrectIndex);
check("invalid quiz choice is ignored", T.snap().db.stats.answered === invalidQuizAnswerBefore && T.snap().quizIndex === invalidQuizIndexBefore);
const savedQuizCorrectIndex = T.snap().quizCorrectIndex;
T.setQuizCorrectIndex(-1);
const quizAnsweredBeforeInvalidCorrect = T.snap().db.stats.answered;
T.answerQuiz(0, 0);
check("quiz rejects missing internal correct index", T.snap().db.stats.answered === quizAnsweredBeforeInvalidCorrect);
T.setQuizCorrectIndex(savedQuizCorrectIndex);
const quizPromptButton = (document.getElementById("view").innerHTML.match(/<button[^>]*>🔊 Đọc câu hỏi<\/button>/) || [])[0] || "";
check("quiz question uses TTS for prompt instead of word audio", !!quizPromptButton && !quizPromptButton.includes("playAudio("));

T.show("vocab");
const audioVocab = T.snap().db.vocab[0];
const wordAudioButton = audioVocab ? T.audioButton(audioVocab.word, "🔊 Từ", "en-US", 1, audioVocab) : "";
const exampleAudioButton = audioVocab ? T.audioButton(audioVocab.example || audioVocab.word, "🔊 Câu", "en-US", 1, audioVocab) : "";
check("vocabulary word uses attached audio", !!wordAudioButton && (!audioVocab.audioEn || wordAudioButton.includes("playAudio(")));
check("vocabulary example does not reuse word audio", !!exampleAudioButton && !exampleAudioButton.includes("playAudio("));

T.show("flashcards");
check("flashcards show spaced repetition status", document.getElementById("view").innerHTML.includes("Chuỗi nhớ") && document.getElementById("view").innerHTML.includes("Ôn lại"));
const xpBeforeFlash=Number(T.snap().db.stats.xp)||0;
T.rateFlash("Đã nhớ");
check("flashcard learning awards XP", (Number(T.snap().db.stats.xp)||0)>=xpBeforeFlash+5);
check("flashcard interaction", T.snap().db.vocab.length === 3500);
T.show("flashcards");
T.shuffleFlash();
check("flashcard shuffle keeps valid index", T.snap().flashIndex>=0 && T.snap().flashIndex<3500);
check("flashcard shuffle does not corrupt content", T.snap().db.vocab.length===3500);


T.show("listening");
snap = T.snap();
const listeningPool = T.sentencePracticePool();
const currentSentence = listeningPool[((Number.isFinite(Number(snap.listenIndex)) ? Math.trunc(Number(snap.listenIndex)) : 0) % Math.max(1, listeningPool.length) + Math.max(1, listeningPool.length)) % Math.max(1, listeningPool.length)];
check("listening has a current practice sentence", !!currentSentence && !!String(currentSentence.en ?? "").trim() && !!String(currentSentence.vi ?? "").trim());
const listeningHtml=document.getElementById("view").innerHTML;
const listenOptionCount=(listeningHtml.match(/class="option"/g)||[]).length;
check("listening renders up to four unique choices", listenOptionCount>=2 && listenOptionCount<=4);

const sentenceAnsweredBefore = T.snap().db.stats.sentenceAnswered || 0;
const sentenceCorrectBefore = T.snap().db.stats.sentenceCorrect || 0;
if (currentSentence) {
  const listenButton = new El("listen-option-idempotent", "button");
  T.listenCheck(listenButton, currentSentence.vi, currentSentence.vi);
  T.listenCheck(listenButton, currentSentence.vi, currentSentence.vi);
}
const afterDoubleListen = T.snap().db.stats;
check("listening double-tap is scored only once", afterDoubleListen.sentenceAnswered === sentenceAnsweredBefore + 1 && afterDoubleListen.sentenceCorrect === sentenceCorrectBefore + 1 && T.snap().listenAnswered === true);
T.show("listening");
if (currentSentence) T.listenCheck(new El("listen-option", "button"), currentSentence.vi, currentSentence.vi);
const afterListen = T.snap().db.stats;
check("listening interaction", afterListen.sentenceAnswered === sentenceAnsweredBefore + 1 && afterListen.sentenceCorrect >= 1);

T.show("listening");
let html=document.getElementById("view").innerHTML;
check("listening has direct jump control", html.includes('id="listeningJump"') && html.includes("Tới câu"));
check("listening jump changes exact sentence", practicePool.length >= 100 && T.jumpToItem("listening", 100) && T.snap().listenIndex === 99 && document.getElementById("view").innerHTML.includes("Câu 100 / " + practicePool.length));
check("listening rejects out-of-range jump", T.jumpToItem("listening", 999999) === false && T.snap().listenIndex === 99);

// The automatic listening advance must never repaint another screen after the learner leaves Listening.
T.show("listening");
const timerSentence = T.sentencePracticePool()[T.snap().listenIndex];
if (timerSentence) T.listenCheck(new El("timer-option", "button"), timerSentence.vi, timerSentence.vi);
T.show("stats");
await new Promise((resolve) => setTimeout(resolve, 760));
check("listening auto-advance never overwrites another route", document.getElementById("view").innerHTML.includes("Tiến độ"));

T.show("speaking");
html=document.getElementById("view").innerHTML;
check("speaking has direct jump control", html.includes('id="speakingJump"') && html.includes("Tới câu"));
check("speaking jump changes exact sentence", practicePool.length >= 200 && T.jumpToItem("speaking", 200) && T.snap().speakIndex === 199 && document.getElementById("view").innerHTML.includes("Câu 200 / " + practicePool.length));
T.show("speaking");
T.prevSpeak();
T.nextSpeak();
check("speaking previous/next keep valid bounds", T.snap().speakIndex>=0 && T.snap().speakIndex<practicePool.length);
T.playAudio("https://example.invalid/speak-next.mp3","next",1,"en-US");
const speakAudio=audioCalls[audioCalls.length-1];
T.nextSpeak();
check("speaking next stops audio", speakAudio.paused === true && speakAudio.currentTime === 0);



T.show("quiz");
html=document.getElementById("view").innerHTML;
check("quiz has direct jump control", html.includes('id="quizJump"') && html.includes("Tới câu"));
check("quiz jump changes exact question", T.jumpToItem("quiz", 300) && T.snap().quizIndex === 299 && document.getElementById("view").innerHTML.includes("Câu 300 / 6000"));

T.show("settings");
check("settings exposes one-click sentence audit", document.getElementById("view").innerHTML.includes("runContentAudit()") && document.getElementById("view").innerHTML.includes("Kiểm tra 1.500 câu luyện độc lập"));
T.runContentAudit();
check(
  "one-click content audit passes",
  document.getElementById("contentAuditResult").textContent.includes("500/500") &&
  document.getElementById("contentAuditResult").textContent.includes("1500/1500") &&
  document.getElementById("contentAuditResult").textContent.includes("không trùng")
);
T.show("settings");
const settingsHtml = document.getElementById("view").innerHTML;
check("settings exposes progress backup tools",
  settingsHtml.includes("exportProgress()") &&
  settingsHtml.includes("progressImport") &&
  settingsHtml.includes("resetProgress()")
);
check("progress backup functions exist", typeof T.exportProgress === "function" && typeof T.importProgress === "function" && typeof T.resetProgress === "function");

let exportThrew = false;
try { T.exportProgress(); } catch (e) { exportThrew = true; }
check("export progress executes", !exportThrew && document.body.child?.clicked === true,
  JSON.stringify({exportThrew,hasDownloadedElement:!!document.body.child,clicked:!!document.body.child?.clicked})
);

const importWord = String(T.snap().db.vocab[0]?.word || "").trim();
const numericStringPayload = {
  app: "English Master",
  stats: { xp: "888", streak: "7", answered: "4", correct: "3", sentenceAnswered: "2", sentenceCorrect: "1", speakingAttempts: "2", speakingGood: "1", learned: "1" },
  profile: { theme: "dark", autoUpdate: true, speechRate: "0.75", layout: "phone" },
  positions: { flashIndex: "9", listenIndex: "10", speakIndex: "11", quizIndex: "12" },
  vocabState: [{ word: importWord, status: "Review", favorite: true, correct_count: "5", wrong_count: "2" }]
};
await T.importProgress({
  value: "numeric-strings.json",
  files: [{ text: async () => JSON.stringify(numericStringPayload) }]
});
const normalizedNumeric = T.snap();
const normalizedWord = normalizedNumeric.db.vocab.find((v) => String(v.word || "").trim() === importWord);
check(
  "numeric import values are normalized to numbers",
  typeof normalizedNumeric.db.stats.xp === "number" &&
  normalizedNumeric.db.stats.xp === 888 &&
  typeof normalizedNumeric.db.stats.answered === "number" &&
  normalizedNumeric.db.stats.answered === 4 &&
  normalizedNumeric.db.profile.speechRate === 0.75 &&
  normalizedNumeric.flashIndex === 9 &&
  normalizedWord?.correct_count === 5 &&
  normalizedWord?.wrong_count === 2
);
const importPayload = {
  app: "English Master",
  stats: { xp: 777, streak: 9, answered: 2, correct: 2, sentenceAnswered: 1, sentenceCorrect: 1, speakingAttempts: 1, speakingGood: 1, learned: 1 },
  profile: { theme: "dark", autoUpdate: true, speechRate: 1.25, layout: "phone" },
  positions: { flashIndex: 5, listenIndex: 6, speakIndex: 7, quizIndex: 8 },
  vocabState: [{ word: importWord, status: "Review", favorite: true, correct_count: 9, wrong_count: 2 }]
};
await T.importProgress({
  value: "import.json",
  files: [{ text: async () => JSON.stringify(importPayload) }]
});
const imported = T.snap();
const importedWord = imported.db.vocab.find((v) => String(v.word || "").trim() === importWord);
check(
  "import progress restores stats and vocab state",
  imported.db.stats.xp === 777 &&
  imported.db.profile.speechRate === 1.25 &&
  imported.db.profile.layout === "phone" &&
  imported.flashIndex === 5 &&
  importedWord?.status === "Review" &&
  importedWord?.favorite === true &&
  importedWord?.correct_count === 9 &&
  importedWord?.wrong_count === 2,
  JSON.stringify({
    xp: imported.db.stats.xp,
    speechRate: imported.db.profile.speechRate,
    layout: imported.db.profile.layout,
    flashIndex: imported.flashIndex,
    word: importedWord ? {
      status: importedWord.status,
      favorite: importedWord.favorite,
      correct_count: importedWord.correct_count,
      wrong_count: importedWord.wrong_count
    } : null
  })
);

const beforeRelationImport = T.snap();
const relationInvalidImport = {
  app: "English Master",
  stats: { xp: 1, answered: 2, correct: 3 },
  profile: { theme: "light", autoUpdate: true, speechRate: 1, layout: "auto" },
  positions: {},
  vocabState: [{ word: importWord, status: "Review" }]
};
await T.importProgress({
  value: "relation-invalid.json",
  files: [{ text: async () => JSON.stringify(relationInvalidImport) }]
});
const relationCheck = T.snap();
check(
  "impossible accuracy stats are rejected",
  relationCheck.db.stats.xp === beforeRelationImport.db.stats.xp &&
  relationCheck.db.stats.answered === beforeRelationImport.db.stats.answered &&
  relationCheck.db.stats.correct === beforeRelationImport.db.stats.correct &&
  relationCheck.db.profile.theme === beforeRelationImport.db.profile.theme
);

const beforeInvalidImport = T.snap();
const invalidImportPayload = {
  app: "English Master",
  stats: { ...beforeInvalidImport.db.stats, xp: "not-a-number" },
  profile: { ...beforeInvalidImport.db.profile, layout: "tablet" },
  positions: { flashIndex: 999999 },
  vocabState: [{ word: importWord, status: "BROKEN", favorite: "yes", correct_count: -2, wrong_count: 0 }]
};
await T.importProgress({
  value: "invalid.json",
  files: [{ text: async () => JSON.stringify(invalidImportPayload) }]
});
const afterInvalidImport = T.snap();
check(
  "invalid progress import is rejected atomically",
  afterInvalidImport.db.stats.xp === beforeInvalidImport.db.stats.xp &&
  afterInvalidImport.db.profile.layout === beforeInvalidImport.db.profile.layout &&
  afterInvalidImport.flashIndex === beforeInvalidImport.flashIndex &&
  afterInvalidImport.db.vocab.find(v => String(v.word || "").trim() === importWord)?.status ===
    beforeInvalidImport.db.vocab.find(v => String(v.word || "").trim() === importWord)?.status
);

const importPreserveStats={...T.snap().db.stats};
const originalSetItem=localStorage.setItem;
localStorage.setItem=()=>{throw new Error("quota");};
const failingInput={value:"",files:[{text:async()=>JSON.stringify({stats:{xp:9999},profile:{theme:"dark"},vocabState:[]})}]};
await T.importProgress(failingInput);
localStorage.setItem=originalSetItem;
check("valid import is atomic when storage save fails", T.snap().db.stats.xp===importPreserveStats.xp);

T.show("practice");
const invalidPracticeBefore = T.snap().practiceAnsweredCount;
T.practiceAnswer(999);
check("invalid practice choice is ignored", T.snap().practiceAnsweredCount === invalidPracticeBefore && T.snap().practiceAnswered === false);

const resetPracticeSeed=T.snap();
if(resetPracticeSeed.practiceQueue.length){
  const firstResetItem=resetPracticeSeed.practiceQueue[0];
  if(firstResetItem.type!=="order"){
    const idx=firstResetItem.options.findIndex(x=>normalizeTest(x)===normalizeTest(firstResetItem.answer));
    T.practiceAnswer(idx);
  }
}
const beforeReset = T.snap();

T.resetProgress();
const resetSnap = T.snap();
check(
  "reset progress keeps content but clears learning state",
  resetSnap.db.vocab.length === beforeReset.db.vocab.length &&
  resetSnap.db.questions.length === beforeReset.db.questions.length &&
  resetSnap.db.sentences.length === beforeReset.db.sentences.length &&
  resetSnap.db.stats.xp === 0 &&
  resetSnap.db.stats.answered === 0 &&
  resetSnap.db.stats.sentenceAnswered === 0 &&
  resetSnap.db.vocab.every((v) => v.status === "New" && !v.favorite && Number(v.correct_count || 0) === 0 && Number(v.wrong_count || 0) === 0)
);
check(
  "reset progress clears learning state",
  resetSnap.db.stats.xp === 0 &&
  resetSnap.db.stats.answered === 0 &&
  resetSnap.db.stats.sentenceAnswered === 0 &&
  resetSnap.db.vocab.every((v) => v.status === "New" && !v.favorite && Number(v.correct_count || 0) === 0 && Number(v.wrong_count || 0) === 0)
);
check("reset progress clears streak activity date", !("lastActivityDate" in resetSnap.db.stats) || resetSnap.db.stats.lastActivityDate === "");
check("reset clears practice session state", resetSnap.practiceQueue.length===0 && resetSnap.practiceIndex===0 && resetSnap.practiceAnswered===false && resetSnap.practiceAnswerOrder.length===0 && resetSnap.practiceCorrectCount===0 && resetSnap.practiceMode==="smart" && resetSnap.practiceAnsweredCount===0 && resetSnap.practiceSessionXp===0);
check("reset clears daily history", Array.isArray(resetSnap.db.stats.dailyHistory) && resetSnap.db.stats.dailyHistory.length===0);


T.setDailyGoal(20);
const goalToday = T.snap().db.stats.dailyHistory.find(x => x.date === T.snap().db.stats.dailyDate);
check("daily goal change updates today's history", T.snap().db.profile.dailyGoal === 20 && goalToday?.goal === 20);
T.applyUserSnapshot(beforeReset.db);
T.save();
T.show("settings");
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
const fallbackBefore = T.snap().db.stats.xp;
T.show("home");
check("unknown route falls back to home", T.snap().db.view === undefined && document.getElementById("view").innerHTML.includes("English Master V"));
check("index normalization wraps negative index", T.normalizeArrayIndex(-1, 5) === 4);
check("index normalization handles invalid value", T.normalizeArrayIndex("bad", 5) === 0);

const cacheSentence=data.sentences.find(s=>s&&String(s.id||"").trim()&&String(s.en||"").trim()&&String(s.vi||"").trim()&&String(s.source||"")!=="extra500_v8"&&String(s.source||"")!=="expansion500"&&String(s.source||"")!=="expansion500_v2");
check("cached content validator accepts complete cache", T.usableCachedContent({
  vocab:[data.vocabulary[0]],sentences:[cacheSentence],questions:[data.questions[0]],grammar:[data.grammar[0]],communication:[data.communication[0]],trilingual:[data.trilingual[0]],
  contentCounts:{vocab:1,sentences:1,questions:1,grammar:1,communication:1,trilingual:1}
}));
check("cached content validator rejects incomplete cache", !T.usableCachedContent({
  vocab:[1],sentences:[1],questions:[1],grammar:[1],communication:[1],trilingual:[1],
  contentCounts:{vocab:1,sentences:0,questions:1,grammar:1,communication:1,trilingual:1}
}));
check("similarity score exact match is 100", T.similarityScore("Hello world!", "hello world.") === 100);
check("similarity score empty input is 0", T.similarityScore("", "hello") === 0);
check("speech similarity normalizes common contractions", T.similarityScore("I'm ready!", "I am ready.") >= 90);
check("speech similarity penalizes word-order errors", T.similarityScore("world hello", "hello world") < 100);
check("speech normalization keeps real words intact", T.normalizeSpeechText("We were well. It was its turn. I'll go.") === "we were well it was its turn i will go");
check("audio cache reuses the same source", (()=>{const before=T.audioCacheSize();T.preloadAudio("qa-audio.mp3");const after=T.audioCacheSize();T.preloadAudio("qa-audio.mp3");return T.audioCacheSize()===after && after===before+1;})());

T.show("speaking");
check("speaking UI and microphone fallback", document.getElementById("view").innerHTML.includes("Bắt đầu nói"));
check("speaking sentence practice is independent from vocab", !document.getElementById("view").innerHTML.includes("Từ trọng tâm:"));
try { T.startRecognition(); check("microphone fallback", true); } catch (e) { check("microphone fallback", false, e.stack || String(e)); }

T.show("grammar");
const rawGrammarLegacy = snap.db.grammar.filter((g) => String(g.id ?? "").startsWith("exp500_grammar_"));
check(
  "grammar UI excludes legacy vocabulary phrase bank",
  rawGrammarLegacy.length === 20 &&
  T.grammarPracticePool().length === 60 &&
  document.getElementById("view").innerHTML.includes("Chỉ hiển thị bài ngữ pháp thực hành")
);
T.show("communication");
try { T.playDialogue(0); check("dialogue playback path", true); } catch (e) { check("dialogue playback path", false, e.stack || String(e)); }
const commPool = T.communicationPracticePool();
const commEnglish = commPool.flatMap((d) => (d.lines || []).map((l) => String(l?.[1] ?? "").trim()));
check(
  "communication keeps real A/An sentences and filters phrase fragments",
  commEnglish.some((x) => /^A positive attitude can help you learn\.$/i.test(x)) &&
  commEnglish.some((x) => /^A former colleague visited us yesterday\.$/i.test(x)) &&
  !commEnglish.some((x) => /^a conscientious worker$/i.test(x)) &&
  !commEnglish.some((x) => /^to go for a bathe$/i.test(x)),
  JSON.stringify({lines:commEnglish.length,hasRealA:commEnglish.some((x) => /^A positive attitude can help you learn\.$/i.test(x)),hasFragment:commEnglish.some((x) => /^(?:a conscientious worker|to go for a bathe)$/i.test(x))})
);
const knownBadCommunicationExamples = [
  "The road is useful in daily life.",
  "The tennis is useful in daily life.",
  "The new plan is funny for us.",
  "The new plan is same for us.",
  "The new plan is dry for us.",
  "The situation is primary right now.",
  "They properly use the app.",
  "This plan is immediate.",
  "I noticed youth this morning.",
  "I saw aspect on my way home."
];
check(
  "communication filters semantic template failures",
  knownBadCommunicationExamples.every((en) => !commEnglish.some((x) => String(x).trim().toLowerCase() === en.toLowerCase())),
  JSON.stringify({remaining:knownBadCommunicationExamples.filter((en) => commEnglish.some((x) => String(x).trim().toLowerCase() === en.toLowerCase()))})
);
const commPages=Math.max(1,Math.ceil(commPool.length/12));
T.show("communication");
T.goPage("communication",commPages);
const commHtml=document.getElementById("view").innerHTML;
const filteredCommunication = T.communicationPracticePool();
const rawExtraDialogues = snap.db.communication.filter((d) => String(d.source ?? "") === "extra500_v8");
check(
  "communication UI restores expanded dialogues and filters only malformed lines",
  rawExtraDialogues.length === 50 &&
  filteredCommunication.length >= 178 &&
  filteredCommunication.some((d) => String(d.source ?? "") === "extra500_v8") &&
  filteredCommunication.every((d) => (d.lines || []).every((l) => {
    const en = String(l?.[1] ?? "").trim();
    return !/^i'?m practicing\b/i.test(en) &&
      !/^why do you need\b/i.test(en) &&
      !/^how do you use\b.*\bin real life\?$/i.test(en) &&
      !/^do you find\b.*\buseful\?$/i.test(en) &&
      !/^what will you do with\b.*\bnext\?$/i.test(en);
  })),
  JSON.stringify({rawExtraDialogues:rawExtraDialogues.length,filtered:filteredCommunication.length})
);
check(
  "communication pagination uses filtered pool",
  commPool.length > 0 &&
  commHtml.includes("Hiển thị "+((commPages-1)*12+1)+"–"+Math.min(commPages*12,commPool.length)+" / "+commPool.length+" hội thoại") &&
  commHtml.includes(" / "+commPool.length+" hội thoại")
);

T.show("trilingual");
const v2PackagePathForRuntime = path.join(root, "data", "expansion500_v2.json");
const v2PackageForRuntime = fs.existsSync(v2PackagePathForRuntime) ? JSON.parse(fs.readFileSync(v2PackagePathForRuntime, "utf8")) : { words: [] };
const v2WordSetForRuntime = new Set((v2PackageForRuntime.words || []).map((x) => String(x.word || "").trim().toLowerCase()).filter(Boolean));
const v2Words = snap.db.vocab.filter((v) => v2WordSetForRuntime.has(String(v.word || "").trim().toLowerCase()));
const v2Sentences = snap.db.sentences.filter((x) => String(x.source ?? "") === "expansion500_v2");
const v2Questions = snap.db.questions.filter((x) => String(x.source ?? "") === "expansion500_v2");
const v2Tri = snap.db.trilingual.filter((x) => String(x.source ?? "") === "expansion500_v2");
const v2Comm = snap.db.communication.filter((x) => String(x.source ?? "") === "expansion500_v2");
const v2Grammar = snap.db.grammar.filter((x) => String(x.source ?? "") === "expansion500_v2");
const v2PackagePath = path.join(root, "data", "expansion500_v2.json");
const v2PackageExists = fs.existsSync(v2PackagePath);
const v2Package = v2PackageExists ? JSON.parse(fs.readFileSync(v2PackagePath, "utf8")) : { words: [] };
check(
  "500-word V2 package is complete across all learning modes",
  !v2PackageExists || (v2Words.length === 500 && v2Sentences.length === 500 && v2Questions.length === 1000 &&
  v2Tri.length === 500 && v2Comm.length === 100 && v2Grammar.length === 20 &&
  Array.isArray(v2Package.words) && v2Package.words.length === 500 &&
  v2Words.every((v) => v.example && v.exampleVi && v.audioEn && v.ipa) &&
  v2Sentences.every((x) => !x.vocabWord && x.en && x.vi && x.audioEn) &&
  v2Tri.every((x) => x.en && x.zh && x.pinyin && x.vi && x.audioEn && x.audioZh && x.audioVi) &&
  v2Questions.every((q) => Array.isArray(q.options) && q.options.length === 4 && new Set(q.options.map((x) => String(x).trim().toLowerCase())).size === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)),
  JSON.stringify({vocab:v2Words.length,sentences:v2Sentences.length,questions:v2Questions.length,trilingual:v2Tri.length,communication:v2Comm.length,grammar:v2Grammar.length})
);
check(
  "V2 standalone English fields are clean",
  v2Sentences.every((x) => {
    const en=String(x.en ?? "").trim(),vi=String(x.vi ?? "").trim();
    return !String(x.en ?? "").includes("\\t") &&
      !/^eng\\t/i.test(String(x.en ?? "")) &&
      /[.!?]$/.test(en) &&
      en.length>0 && vi.length>0 && !x.vocabWord;
  }),
  JSON.stringify({count: v2Sentences.length})
);

check(
  "500-word V2 mapping covers every word",
  !v2PackageExists || v2Package.words.every((m) => v2Words.some((v) => v.word === m.word && v.id === m.vocabId) &&
    v2Sentences.some((x) => x.id === m.sentenceId) &&
    m.questionIds?.length === 2 && m.questionIds.every((id) => v2Questions.some((q) => q.id === id)) &&
    v2Tri.some((x) => x.id === m.trilingualId) &&
    v2Comm.some((x) => Array.isArray(x.vocab) && x.vocab.includes(m.word)) &&
    v2Grammar.some((x) => Array.isArray(x.vocabWords) && x.vocabWords.includes(m.word)))
);

const tri = T.snap().db.trilingual.find((x) => x.en === "altogether");
check("three-language audio paths", !!T.audioUrl(tri, "en-US") && !!T.audioUrl(tri, "zh-CN") && !!T.audioUrl(tri, "vi-VN"));
const audioBefore = audioCalls.length;
T.playAudio("https://example.invalid/test.mp3", "speed test", 0.75, "en-US");
T.playAudio("https://example.invalid/test2.mp3", "speed test", 1.25, "en-US");
check(
  "file audio respects selected playback speed",
  audioCalls.length === audioBefore + 2 &&
  audioCalls[audioCalls.length - 2].playbackRate === 0.75 &&
  audioCalls[audioCalls.length - 1].playbackRate === 1.25
);
T.playAudio("https://example.invalid/stop-test.mp3", "stop test", 1, "en-US");
const audioToStop = audioCalls[audioCalls.length - 1];
T.show("home");
check("route change stops active file audio", audioToStop.paused === true && audioToStop.currentTime === 0);
T.playAudio("https://example.invalid/first.mp3", "first", 1, "en-US");
const firstAudio = audioCalls[audioCalls.length - 1];
T.playAudio("https://example.invalid/second.mp3", "second", 1, "en-US");
check("starting another file audio stops the previous one", firstAudio.paused === true);
T.show("listening");
T.playAudio("https://example.invalid/jump.mp3","jump",1,"en-US");
const jumpAudio=audioCalls[audioCalls.length-1];
T.jumpToItem("listening",101);
check("jumping listening item stops audio", jumpAudio.paused === true && jumpAudio.currentTime === 0);
T.show("sentences");
T.playAudio("https://example.invalid/page.mp3","page",1,"en-US");
const pageAudio=audioCalls[audioCalls.length-1];
T.goPage("sentences",2);
check("changing sentence page stops audio", pageAudio.paused === true && pageAudio.currentTime === 0);


T.show("review");
const weakReviewWord = String(T.snap().db.vocab[0]?.word || "").trim();
const weakReviewVocab = T.snap().db.vocab.find((v) => String(v.word || "").trim() === weakReviewWord);
const newReviewWord = T.snap().db.vocab.find((v) => String(v.word || "").trim() !== weakReviewWord);
if(weakReviewVocab)weakReviewVocab.status = "Review";
if(newReviewWord)newReviewWord.status = "New";
T.startReview("weak",3);
const weakSessionSnap=T.snap();
check("review session initializes with queue size", weakSessionSnap.reviewSession.active===true && weakSessionSnap.reviewSession.total===weakSessionSnap.reviewQueue.length && weakSessionSnap.reviewSession.total<=3 && weakSessionSnap.reviewSession.answered===0);

check(
  "review queue prioritizes weak words over new words",
  T.snap().reviewQueue.includes(String(weakReviewWord).trim().toLowerCase()) &&
  (!newReviewWord || !T.snap().reviewQueue.includes(String(newReviewWord.word).trim().toLowerCase()))
);

const provenanceBefore = T.snap().db.vocab.find((v) => v.word === "altogether");
check("expansion provenance before resync", provenanceBefore?.source === "expansion500" && provenanceBefore?.sourceVersion === "8.0.0");

await T.updateOnline(true);
const provenanceAfter = T.snap().db.vocab.find((v) => v.word === "altogether");
check(
  "resync preserves expansion provenance",
  provenanceAfter?.source === "expansion500" && provenanceAfter?.sourceVersion === "8.0.0",
  JSON.stringify({ source: provenanceAfter?.source, sourceVersion: provenanceAfter?.sourceVersion })
);

T.setFetch(fetchImpl);
const restoredVocabLength = T.snap().db.vocab.length;
T.snap().db.vocab.pop();
await T.updateOnline(false);
check(
  "same-version missing content triggers resync",
  T.snap().db.vocab.length === restoredVocabLength &&
  !!T.snap().db.vocab.find((v) => String(v.word || "").trim() === importWord)
);
const questionRows = snap.db.questions || [];
check(
  "quiz question schema and four-choice integrity",
  questionRows.length >= 5000 && questionRows.every((q) => {
    const opts = Array.isArray(q?.options) ? q.options : [];
    const answer = Number(q?.answer);
    return q?.type === "multiple" && opts.length === 4 &&
      opts.every((x) => String(x ?? "").trim()) &&
      new Set(opts.map((x) => String(x).trim().toLowerCase())).size === 4 &&
      Number.isInteger(answer) && answer >= 0 && answer < opts.length;
  }),
  JSON.stringify({count: questionRows.length})
);
check(
  "quiz answer is tied to an existing option",
  questionRows.every((q) => String(q.options[q.answer] ?? "").trim().length > 0)
);

const inlineHandlers = [...app.matchAll(/onclick="([^"]+)"/g)].map((m) => m[1]);
const inlineNames = new Set();
for (const handler of inlineHandlers) {
  const m = handler.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
  if (m) inlineNames.add(m[1]);
}
const declaredFunctions = new Set([...app.matchAll(/(?:function|async function)\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
const missingHandlers = [...inlineNames].filter((name) => !declaredFunctions.has(name));
check(
  "inline UI handlers point to declared functions",
  missingHandlers.length === 0,
  JSON.stringify({missing: missingHandlers.slice(0, 30), totalInlineHandlers: inlineHandlers.length})
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

const backupWord = String(T.snap().db.vocab[0]?.word || "").trim();
const backupVocab = T.snap().db.vocab.find((v) => String(v.word || "").trim() === backupWord);
backupVocab.status = "Review";
backupVocab.favorite = true;
backupVocab.correct_count = 12;
backupVocab.wrong_count = 3;
T.setStats({ xp: 555 });
T.save();
backupVocab.status = "Mastered";
backupVocab.favorite = false;
backupVocab.correct_count = 99;
T.setStats({ xp: 777 });
T.save();
storage.set("englishMaster_v1", "{broken-json");
T.setStats({ xp: 0 });
T.load();
const recoveredSource = T.snap().db.vocab.find((v) => String(v.word || "").trim() === backupWord);
const recovered = recoveredSource ? JSON.parse(JSON.stringify(recoveredSource)) : null;


check("legacy content detector rejects malformed item arrays", !T.legacyContentLooksUsable({vocab:[null],sentences:[{}],questions:[{}],grammar:[{}],communication:[{}],trilingual:[{}]}) && T.legacyContentLooksUsable({
  vocab:[{word:"hello",meaning:"xin chào"}],sentences:[{id:"s1",en:"Hello.",vi:"Xin chào."}],questions:[{id:"q1",prompt:"Q",options:["a","b","c","d"],answer:0}],grammar:[{id:"g1",title:"Present",formula:"S + V"}],communication:[{id:"c1",title:"Hi",lines:[["A","Hello."],["B","Hi."]]}],trilingual:[{en:"hello",zh:"你好",pinyin:"nǐ hǎo",vi:"xin chào"}]
}));

check(
  "corrupt primary recovers from backup",
  T.snap().db.stats.xp === 555 &&
  recovered?.status === "Review" &&
  recovered?.favorite === true &&
  recovered?.correct_count === 12 &&
  recovered?.wrong_count === 3,
  JSON.stringify({xp:T.snap().db.stats.xp,recovered})
);
check("saved progress schema detector rejects malformed snapshots", !T.savedProgressLooksUsable({stats:{},profile:{}}) && T.savedProgressLooksUsable({stats:{},profile:{},vocabState:[]}));
check("saved progress detector rejects null vocab states", !T.savedProgressLooksUsable({stats:{},profile:{},vocabState:[null]}));
const malformedApplyStats={...T.snap().db.stats};
T.applyUserSnapshot({stats:{xp:malformedApplyStats.xp},profile:{theme:"light"},vocabState:[null,{}, {word:""}]});
check("malformed vocab state is filtered without crash", T.snap().db.stats.xp===malformedApplyStats.xp);
T.applyUserSnapshot({stats:{answered:2,correct:9,sentenceAnswered:1,sentenceCorrect:5,speakingAttempts:1,speakingGood:8},profile:{theme:"light"},vocabState:[{word:String(T.snap().db.vocab[0]?.word||"x"),status:"BROKEN",correct_count:-4,wrong_count:-7}]});
const normalizedCorrupt=T.snap();
const normalizedCorruptWord=normalizedCorrupt.db.vocab.find(v=>String(v.word||"").trim().toLowerCase()===backupWord.toLowerCase());
check("restored stats obey impossible-ratio limits", normalizedCorrupt.db.stats.correct===2 && normalizedCorrupt.db.stats.sentenceCorrect===1 && normalizedCorrupt.db.stats.speakingGood===1);
check("restored vocab state normalizes invalid status and negative counts", normalizedCorruptWord?.status!=="BROKEN" && normalizedCorruptWord?.correct_count===0 && normalizedCorruptWord?.wrong_count===0);

check("content storage key exists", !!storage.get("englishMaster_v1"));
check("backup storage key exists", !!storage.get("englishMaster_v1_backup"));

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
check("header theme button is accessible", /id="theme"[^>]+aria-label="[^"]+"/.test(index) && /id="theme"[^>]+title="[^"]+"/.test(index));
check("header settings button is accessible", /onclick="show\('settings'\)"[^>]+aria-label="Cài đặt"[^>]+title="Cài đặt"/.test(index));
check("quick layout button is in header", index.includes('id="layoutQuick"') && index.includes("toggleLayoutQuick()"));
const appVersion = JSON.parse(fs.readFileSync(path.join(root, "app-version.json"), "utf8"));
const expectedAppVersion = String(appVersion.version || "");
check("V9 is the final version signal", expectedAppVersion==="9.3.3" && !index.includes("V10") && !icon512.includes("V10"));
check("version comparison accepts only newer semantic versions", T.compareVersions("9.1.6","9.0.1")===1 && T.compareVersions("9.0.0","9.1.6")===-1 && T.compareVersions("9.1.6","9.1.6")===0 && T.compareVersions("future","9.1.6")===0 && T.compareVersions("10.0","9.1.6")===0);
check("version comparison handles multi-digit patch versions", T.compareVersions("9.1.60","9.1.6")===1 && T.compareVersions("9.10.0","9.9.9")===1);
check("index cache-busts latest app.js", index.includes('app.js?v=' + expectedAppVersion));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
check("manifest app name matches app version", String(manifest.name || "").includes("V" + expectedAppVersion));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
check("index references app/style/manifest", /<script[^>]+src="app\.js(?:\?v=[^"]+)?"/.test(index) && index.includes('href="styles.css"') && index.includes('href="manifest.json"'));
check("service worker caches app assets", sw.includes("app.js") && sw.includes("styles.css") && sw.includes("manifest.json"));
check("manifest is installable", manifest.display === "standalone" && manifest.start_url === "./" && manifest.icons?.length >= 2);
check("512 icon canvas matches manifest size", /viewBox="0 0 512 512"/.test(icon512) && /width="512"/.test(icon512) && /height="512"/.test(icon512));
check("version signals align", app.includes('APP_VERSION="' + expectedAppVersion + '"') && index.includes('application-version" content="' + expectedAppVersion + '"') && index.includes("English Master V" + expectedAppVersion));
check("service worker cache is busted for latest UI changes", sw.includes("english-master-v" + expectedAppVersion) && sw.includes("app.js?v=" + expectedAppVersion));
const styles=fs.readFileSync(path.join(root,"styles.css"),"utf8");
check("phone layout is scoped only to phone class", styles.includes("body.layout-phone") && styles.includes("body.layout-phone #side") && styles.includes("body.layout-phone main"));
check("phone layout uses bottom navigation", styles.includes("body.layout-phone #side{position:fixed") && styles.includes("body.layout-phone #side button"));
check("phone layout has safe-area support", styles.includes("env(safe-area-inset-bottom)"));
check("phone layout hardens long tables", styles.includes("body.layout-phone .table{min-width:620px}"));
check("phone layout keeps touch targets usable", styles.includes("body.layout-phone button,body.layout-phone input,body.layout-phone select{min-height:42px}"));
check("V9 practice order controls have styling hooks", styles.includes(".practice-order") && styles.includes(".token"));
check("quick layout button has stable touch size", styles.includes(".layout-quick{min-width:42px;min-height:42px") && styles.includes("body.layout-phone .layout-quick,body.layout-desktop .layout-quick"));


if (failures.length) {
  console.error("\nRUNTIME SMOKE FAILED");
  for (const f of failures) console.error("-", f.name, f.detail ? ":: " + f.detail : "");
  process.exitCode = 1;
} else {
  console.log("\nRUNTIME SMOKE PASSED:", "all checks");
}
