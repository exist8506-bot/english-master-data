#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");

const criticalFiles = [
  "vocabulary.json",
  "sentences.json",
  "questions.json",
  "grammar.json",
  "communication.json",
  "trilingual.json",
  "expansion500.json",
];

function gitShow(file) {
  return execFileSync(
    "git",
    ["show", "origin/main:data/" + file],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }
  );
}

function readCurrent(file) {
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) throw new Error("Missing current file: data/" + file);
  return fs.readFileSync(p, "utf8");
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("Invalid JSON in " + label + ": " + err.message);
  }
}

function norm(v) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function keyFor(file, x) {
  if (!x || typeof x !== "object") return "";
  if (file === "vocabulary.json") return norm(x.word);
  if (file === "trilingual.json") return norm(x.en) + "|" + norm(x.zh ?? x.chinese);
  return String(x.id ?? "").trim() || norm(x.en ?? x.prompt ?? x.title);
}

function asArray(value, label) {
  if (!Array.isArray(value)) throw new Error(label + " must be an array");
  return value;
}

const changedOutput = execFileSync(
  "git",
  ["diff", "--name-only", "origin/main...HEAD", "--", "data"],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
).trim();

const changedDataFiles = changedOutput
  ? changedOutput.split(/\r?\n/).filter(Boolean).map((p) => p.replace(/^data\//, ""))
  : [];

const results = {};

for (const file of criticalFiles) {
  if (!changedDataFiles.includes(file)) {
    results[file] = { skipped: true, reason: "unchanged on PR" };
    continue;
  }

  let baseValue;
  let currentValue;
  if (file === "expansion500.json") {
    baseValue = parseJson(gitShow(file), "origin/main:data/" + file);
    currentValue = parseJson(readCurrent(file), "PR:data/" + file);
    if (!Array.isArray(baseValue?.words) || !Array.isArray(currentValue?.words)) {
      throw new Error("expansion500.json must contain a words array");
    }

    const baseWords = new Set(baseValue.words.map((x) => norm(x?.word)).filter(Boolean));
    const currentWords = new Set(currentValue.words.map((x) => norm(x?.word)).filter(Boolean));
    const missing = [...baseWords].filter((word) => !currentWords.has(word));

    results[file] = {
      mainCount: baseValue.words.length,
      currentCount: currentValue.words.length,
      missingOldRecords: missing.length,
      sampleMissing: missing.slice(0, 10),
    };

    if (missing.length) {
      throw new Error(
        "DATA LOSS detected in " + file + ": " +
        missing.length + " previous words disappeared: " +
        JSON.stringify(missing.slice(0, 10))
      );
    }
    continue;
  }

  const base = asArray(parseJson(gitShow(file), "origin/main:data/" + file), file + " (main)");
  const current = asArray(parseJson(readCurrent(file), "PR:data/" + file), file + " (PR)");

  const baseKeys = new Set(base.map((x) => keyFor(file, x)).filter(Boolean));
  const currentKeys = new Set(current.map((x) => keyFor(file, x)).filter(Boolean));
  const missing = [...baseKeys].filter((key) => !currentKeys.has(key));

  results[file] = {
    mainCount: base.length,
    currentCount: current.length,
    missingOldRecords: missing.length,
    sampleMissing: missing.slice(0, 5),
  };

  if (missing.length) {
    throw new Error(
      "DATA LOSS detected in " + file + ": " +
      missing.length + " existing records disappeared: " +
      JSON.stringify(missing.slice(0, 5))
    );
  }
}

console.log("=== English Master preservation audit ===");
console.log(JSON.stringify({
  status: "PASS",
  changedDataFiles,
  message: "All records present on main are preserved. Unchanged data files were not rewritten.",
  files: results
}, null, 2));
