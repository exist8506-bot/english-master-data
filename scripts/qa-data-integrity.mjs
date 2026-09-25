#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");

function readJson(file) {
  const p = path.join(dataDir, file);
  const raw = fs.readFileSync(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("Invalid JSON: " + file + ": " + err.message);
  }
}

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

function norm(v) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function arr(value, name) {
  must(Array.isArray(value), name + " must be an array");
  return value;
}

const files = [
  "version.json",
  "vocabulary.json",
  "sentences.json",
  "questions.json",
  "grammar.json",
  "communication.json",
  "trilingual.json",
  "expansion500.json",
];

const data = Object.fromEntries(files.map((f) => [f, readJson(f)]));
const version = String(data["version.json"].version ?? "");
const expansion = data["expansion500.json"];

must(version === "8.0.0", "Expected data version 8.0.0, got " + version);
must(expansion.package === "expansion500", "Unexpected expansion package: " + expansion.package);
must(Number(expansion.count) === 500, "expansion500 count must be 500, got " + expansion.count);

const vocab = arr(data["vocabulary.json"], "vocabulary.json");
const sentences = arr(data["sentences.json"], "sentences.json");
const questions = arr(data["questions.json"], "questions.json");
const grammar = arr(data["grammar.json"], "grammar.json");
const communication = arr(data["communication.json"], "communication.json");
const trilingual = arr(data["trilingual.json"], "trilingual.json");
const expWords = arr(expansion.words, "expansion500.words");

must(expWords.length === 500, "expansion500.words must contain 500 rows, got " + expWords.length);

const expNorm = expWords.map((x) => norm(x.word));
must(expNorm.every(Boolean), "Every expansion500 row must have a word");
must(new Set(expNorm).size === 500, "The 500 expansion words contain duplicates");

const expVocab = vocab.filter(
  (x) => x && x.source === "expansion500" && String(x.sourceVersion ?? "") === "8.0.0"
);
const byId = (rows) => new Map(rows.map((x) => [String(x?.id ?? ""), x]).filter(([k]) => k));
const vocabById = byId(vocab);
const sentenceById = byId(sentences);
const questionById = byId(questions);
const trilingualById = byId(trilingual);
const communicationById = byId(communication);
const grammarById = byId(grammar);
must(expVocab.length === 500, "Expected 500 expansion vocab rows in vocabulary.json, got " + expVocab.length);

const vocabByWord = new Map();
for (const v of vocab) {
  const k = norm(v?.word);
  if (k && !vocabByWord.has(k)) vocabByWord.set(k, v);
}

const sentenceByVocab = new Set(
  sentences.map((x) => norm(x?.vocabWord)).filter(Boolean)
);
const questionByVocab = new Set(
  questions.map((x) => norm(x?.vocabWord)).filter(Boolean)
);
const trilingualByEn = new Set(
  trilingual.map((x) => norm(x?.en)).filter(Boolean)
);
const communicationByVocab = new Set(
  communication.flatMap((x) => Array.isArray(x?.vocab) ? x.vocab : []).map(norm).filter(Boolean)
);
const grammarByVocab = new Set(
  grammar.flatMap((x) => Array.isArray(x?.vocabWords) ? x.vocabWords : []).map(norm).filter(Boolean)
);

let missingVocab = 0;
let missingSentence = 0;
let missingQuestion = 0;
let missingTrilingual = 0;
let missingCommunication = 0;
let missingGrammar = 0;
let missingAudio = 0;

for (const row of expWords) {
  const word = norm(row.word);
  const v = vocabByWord.get(word);

  if (!v || v.source !== "expansion500" || String(v.sourceVersion ?? "") !== "8.0.0") missingVocab++;
  if (!sentenceByVocab.has(word)) missingSentence++;
  if (!questionByVocab.has(word)) missingQuestion++;
  if (!trilingualByEn.has(word)) missingTrilingual++;
  if (!communicationByVocab.has(word)) missingCommunication++;
  if (!grammarByVocab.has(word)) missingGrammar++;
  if (!v || v.audio !== "tts" || !String(v.audioEn ?? "").trim()) missingAudio++;
}

must(missingVocab === 0, "Missing/incorrect expansion vocabulary rows: " + missingVocab);
must(missingSentence === 0, "Expansion words without linked sentences: " + missingSentence);
must(missingQuestion === 0, "Expansion words without linked quiz questions: " + missingQuestion);
must(missingTrilingual === 0, "Expansion words without trilingual rows: " + missingTrilingual);
must(missingCommunication === 0, "Expansion words without communication links: " + missingCommunication);
must(missingGrammar === 0, "Expansion words without grammar links: " + missingGrammar);
must(missingAudio === 0, "Expansion TTS words without audioEn: " + missingAudio);

let badMappings = 0;
for (const row of expWords) {
  const word = norm(row.word);
  const v = vocabById.get(String(row.vocabId ?? ""));
  const s = sentenceById.get(String(row.sentenceId ?? ""));
  const q = questionById.get(String(row.questionId ?? ""));
  const t = trilingualById.get(String(row.trilingualId ?? ""));
  const c = communicationById.get(String(row.communicationId ?? ""));
  const g = grammarById.get(String(row.grammarId ?? ""));
  const cWords = Array.isArray(c?.vocab) ? c.vocab.map(norm) : [];
  const gWords = Array.isArray(g?.vocabWords) ? g.vocabWords.map(norm) : [];
  const ok =
    norm(v?.word) === word &&
    norm(s?.vocabWord) === word &&
    norm(q?.vocabWord) === word &&
    norm(t?.en) === word &&
    cWords.includes(word) &&
    gWords.includes(word);
  if (!ok) badMappings++;
}
must(badMappings === 0, "Broken expansion500 ID mappings: " + badMappings);

let badQuiz = 0;
for (const q of questions) {
  if (!Array.isArray(q?.options) || q.options.length !== 4) {
    badQuiz++;
    continue;
  }
  const normalized = q.options.map(norm);
  if (
    new Set(normalized).size !== 4 ||
    !Number.isInteger(Number(q.answer)) ||
    Number(q.answer) < 0 ||
    Number(q.answer) > 3
  ) badQuiz++;
}
must(badQuiz === 0, "Invalid quiz rows (need 4 unique options + answer index 0..3): " + badQuiz);

must(questions.every((q) => String(q?.prompt ?? "").trim()), "Found quiz question without prompt");
must(sentences.every((s) => String(s?.en ?? "").trim()), "Found sentence without English text");
must(
  trilingual.every(
    (x) =>
      String(x?.en ?? "").trim() &&
      String(x?.zh ?? x?.chinese ?? "").trim()
  ),
  "Found incomplete trilingual row"
);
must(grammar.every((g) => String(g?.title ?? "").trim()), "Found grammar row without title");
must(
  communication.every((c) => Array.isArray(c?.lines) && c.lines.length > 0),
  "Found communication row without lines"
);

const globalWordDuplicates = (() => {
  const counts = new Map();
  for (const v of vocab) {
    const k = norm(v?.word);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).length;
})();

console.log("=== English Master V8 data integrity ===");
console.log(JSON.stringify({
  version,
  vocab: vocab.length,
  sentences: sentences.length,
  questions: questions.length,
  grammar: grammar.length,
  communication: communication.length,
  trilingual: trilingual.length,
  expansion500: expWords.length,
  globalDuplicateWordKeys: globalWordDuplicates,
  brokenExpansionMappings: badMappings,
  checks: "PASS"
}, null, 2));
