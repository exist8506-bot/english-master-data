#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const preserveScript = path.join(root, "scripts/qa-preserve-main.mjs");
const integrityScript = path.join(root, "scripts/qa-data-integrity.mjs");

function run(cmd, args, cwd, okExitCodes = [0]) {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout: out, stderr: "" };
  } catch (err) {
    const code = Number(err.status ?? 1);
    if (okExitCodes.includes(code)) {
      return { code, stdout: String(err.stdout ?? ""), stderr: String(err.stderr ?? "") };
    }
    return { code, stdout: String(err.stdout ?? ""), stderr: String(err.stderr ?? "") };
  }
}

function writeJson(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function hashFile(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function gitInitWithBase(files) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "em-chaos-"));
  fs.mkdirSync(path.join(repo, "data"));
  for (const [name, value] of Object.entries(files)) writeJson(path.join(repo, "data", name), value);

  run("git", ["init"], repo);
  run("git", ["config", "user.email", "qa@example.invalid"], repo);
  run("git", ["config", "user.name", "English Master QA"], repo);
  run("git", ["add", "."], repo);
  run("git", ["commit", "-m", "base fixture"], repo);

  const baseSha = run("git", ["rev-parse", "HEAD"], repo).stdout.trim();
  run("git", ["branch", "-M", "main"], repo);
  run("git", ["branch", "candidate"], repo);
  run("git", ["update-ref", "refs/remotes/origin/main", baseSha], repo);
  run("git", ["checkout", "candidate"], repo);
  return { repo, baseSha };
}

function commitCandidate(repo, message) {
  run("git", ["add", "."], repo);
  const result = run("git", ["commit", "-m", message], repo);
  if (result.code !== 0) throw new Error("Fixture commit failed: " + result.stderr);
}

function runPreserveFixture(mutator) {
  const base = makePreserveBase();
  const { repo } = gitInitWithBase(base);
  const before = Object.fromEntries(
    Object.keys(base).map((name) => [name, hashFile(path.join(repo, "data", name))])
  );
  mutator(path.join(repo, "data"));
  commitCandidate(repo, "candidate mutation");
  const result = run("node", [preserveScript], repo);
  return { result, repo, before };
}

function runIntegrityFixture(mutator, expectPass) {
  const base = makeIntegrityBase();
  const { repo } = gitInitWithBase(base);
  mutator(path.join(repo, "data"));
  commitCandidate(repo, "candidate mutation");
  const result = run("node", [integrityScript], repo);
  if ((result.code === 0) !== expectPass) {
    throw new Error(
      "Unexpected integrity result. expectedPass=" + expectPass +
      " code=" + result.code + "\n" + result.stdout + "\n" + result.stderr
    );
  }
  return result;
}

function makePreserveBase() {
  const words = ["alpha", "beta", "gamma", "delta", "epsilon"];
  return {
    "vocabulary.json": words.map((word, i) => ({ id: "v" + (i + 1), word, meaning: word + " meaning" })),
    "sentences.json": words.map((word, i) => ({ id: "s" + (i + 1), vocabWord: word, en: "I use " + word + "." })),
    "questions.json": words.map((word, i) => ({ id: "q" + (i + 1), vocabWord: word, prompt: "What is " + word + "?", options: ["A","B","C","D"], answer: 0 })),
    "grammar.json": words.map((word, i) => ({ id: "g" + (i + 1), title: "Grammar " + word, vocabWords: [word] })),
    "communication.json": words.map((word, i) => ({ id: "c" + (i + 1), vocab: [word], lines: ["Line for " + word] })),
    "trilingual.json": words.map((word, i) => ({ id: "t" + (i + 1), en: word, zh: "词" + (i + 1), vi: word })),
    "expansion500.json": { package: "expansion500", version: "8.0.0", count: 5, words: words.map((word, i) => ({ word, vocabId: "v" + (i + 1) })) }
  };
}

function makeIntegrityBase() {
  const words = Array.from({ length: 500 }, (_, i) => "qa-word-" + String(i + 1).padStart(3, "0"));
  return {
    "version.json": { version: "8.0.0" },
    "vocabulary.json": words.map((word, i) => ({
      id: "v" + (i + 1),
      word,
      source: "expansion500",
      sourceVersion: "8.0.0",
      audioEn: "https://example.invalid/audio/" + encodeURIComponent(word) + ".mp3"
    })),
    "sentences.json": words.map((word, i) => ({
      id: "s" + (i + 1), vocabWord: word, en: "This is " + word + ".", vi: "Đây là " + word + "."
    })),
    "questions.json": words.map((word, i) => ({
      id: "q" + (i + 1), vocabWord: word, prompt: "Choose " + word,
      options: ["choice-a-" + i, "choice-b-" + i, "choice-c-" + i, "choice-d-" + i], answer: 0
    })),
    "grammar.json": words.map((word, i) => ({
      id: "g" + (i + 1), title: "Using " + word, vocabWords: [word]
    })),
    "communication.json": words.map((word, i) => ({
      id: "c" + (i + 1), vocab: [word], lines: ["Say " + word]
    })),
    "trilingual.json": words.map((word, i) => ({
      id: "t" + (i + 1), en: word, zh: "词" + (i + 1), vi: word
    })),
    "expansion500.json": {
      package: "expansion500",
      version: "8.0.0",
      count: 500,
      words: words.map((word, i) => ({
        word,
        vocabId: "v" + (i + 1),
        sentenceId: "s" + (i + 1),
        questionId: "q" + (i + 1),
        trilingualId: "t" + (i + 1),
        communicationId: "c" + (i + 1),
        grammarId: "g" + (i + 1),
        audio: "tts"
      }))
    }
  };
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function addRows(dataDir, file, rows) {
  const p = path.join(dataDir, file);
  const arr = readJson(p);
  arr.push(...rows);
  writeJson(p, arr);
}

const results = [];

function expectPreservePass(name, mutator) {
  const { result } = runPreserveFixture(mutator);
  if (result.code !== 0) throw new Error("Preservation scenario failed unexpectedly: " + name + "\n" + result.stdout + "\n" + result.stderr);
  results.push({ name, status: "PASS" });
}

function expectPreserveFail(name, mutator) {
  const { result } = runPreserveFixture(mutator);
  if (result.code === 0) throw new Error("Preservation scenario was not detected: " + name);
  results.push({ name, status: "DETECTED" });
}

expectPreservePass("duplicate additions do not remove old data", (d) => {
  addRows(d, "vocabulary.json", [{ id: "dup-v", word: "alpha", meaning: "duplicate" }]);
});

expectPreservePass("bad/invalid record can coexist without deleting old records", (d) => {
  addRows(d, "communication.json", [{ id: "bad-c", vocab: ["alpha"], lines: [] }]);
});

expectPreservePass("many additions / burst load preserve all old records", (d) => {
  addRows(d, "communication.json",
    Array.from({ length: 10000 }, (_, i) => ({ id: "burst-" + i, vocab: ["new-" + i], lines: ["burst " + i] }))
  );
});

expectPreservePass("same-meaning new words are retained", (d) => {
  addRows(d, "vocabulary.json", [
    { id: "syn-1", word: "large", meaning: "big" },
    { id: "syn-2", word: "huge", meaning: "very big" },
    { id: "syn-3", word: "enormous", meaning: "very large" }
  ]);
});

expectPreservePass("combined duplicate + bad + burst + synonym additions preserve old records", (d) => {
  addRows(d, "vocabulary.json", [
    { id: "combo-dup", word: "alpha", meaning: "dup" },
    { id: "combo-syn", word: "large", meaning: "big" }
  ]);
  addRows(d, "communication.json", [
    { id: "combo-bad", vocab: ["beta"], lines: [] },
    ...Array.from({ length: 5000 }, (_, i) => ({ id: "combo-burst-" + i, vocab: ["x-" + i], lines: ["x"] }))
  ]);
  addRows(d, "questions.json", [{
    id: "combo-q", vocabWord: "alpha", prompt: "bad options", options: ["same", "same", "x", "y"], answer: 0
  }]);
});

expectPreserveFail("deleted old record is detected", (d) => {
  const p = path.join(d, "vocabulary.json");
  const arr = readJson(p);
  arr.splice(0, 1);
  writeJson(p, arr);
});

expectPreserveFail("malformed JSON is detected", (d) => {
  fs.writeFileSync(path.join(d, "sentences.json"), "{ broken json\n", "utf8");
});

expectPreserveFail("repeated destructive failures are consistently rejected", (d) => {
  const p = path.join(d, "grammar.json");
  const arr = readJson(p);
  arr.splice(0, 1);
  writeJson(p, arr);
  // The scenario itself is executed repeatedly below; this first run must fail.
});

for (let i = 0; i < 5; i++) {
  const { result } = runPreserveFixture((d) => {
    const p = path.join(d, "grammar.json");
    const arr = readJson(p);
    arr.splice(0, 1);
    writeJson(p, arr);
  });
  if (result.code === 0) throw new Error("Repeated failure test unexpectedly passed at iteration " + (i + 1));
}
results.push({ name: "repeated destructive failures (5 runs)", status: "DETECTED" });

runIntegrityFixture((d) => {}, true);
results.push({ name: "baseline 500-word integrity", status: "PASS" });

const integrityFailCases = [
  ["duplicate expansion words", (d) => {
    const p = path.join(d, "expansion500.json");
    const x = readJson(p);
    x.words[499] = { ...x.words[0] };
    writeJson(p, x);
  }],
  ["wrong expansion count", (d) => {
    const p = path.join(d, "expansion500.json");
    const x = readJson(p);
    x.count = 499;
    x.words.pop();
    writeJson(p, x);
  }],
  ["missing linked sentence", (d) => {
    const p = path.join(d, "sentences.json");
    const a = readJson(p);
    a.shift();
    writeJson(p, a);
  }],
  ["invalid quiz options", (d) => {
    const p = path.join(d, "questions.json");
    const a = readJson(p);
    a[0].options = ["same", "same", "x", "y"];
    writeJson(p, a);
  }],
  ["missing TTS audio", (d) => {
    const p = path.join(d, "vocabulary.json");
    const a = readJson(p);
    a[0].audioEn = "";
    writeJson(p, a);
  }],
  ["malformed JSON", (d) => {
    fs.writeFileSync(path.join(d, "trilingual.json"), "{ broken json\n", "utf8");
  }],
  ["combined duplicate + invalid quiz + missing audio", (d) => {
    let p = path.join(d, "expansion500.json");
    let x = readJson(p);
    x.words[499] = { ...x.words[0] };
    writeJson(p, x);

    p = path.join(d, "questions.json");
    let q = readJson(p);
    q[0].options = ["same", "same", "x", "y"];
    writeJson(p, q);

    p = path.join(d, "vocabulary.json");
    let v = readJson(p);
    v[0].audioEn = "";
    writeJson(p, v);

    addRows(d, "communication.json",
      Array.from({ length: 10000 }, (_, i) => ({ id: "overload-" + i, vocab: ["load-" + i], lines: ["load"] }))
    );
  }]
];

for (const [name, mutator] of integrityFailCases) {
  runIntegrityFixture(mutator, false);
  results.push({ name, status: "DETECTED" });
}

for (let i = 0; i < 5; i++) {
  runIntegrityFixture((d) => {
    const p = path.join(d, "questions.json");
    const q = readJson(p);
    q[0].options = ["same", "same", "x", "y"];
    writeJson(p, q);
  }, false);
}
results.push({ name: "repeated integrity failures (5 runs)", status: "DETECTED" });

console.log("=== English Master chaos data-protection self-test ===");
console.log(JSON.stringify({
  status: "PASS",
  scenarioCount: results.length,
  results,
  note: "All tests ran in isolated temporary Git fixtures; repository data was never modified by the self-test."
}, null, 2));
