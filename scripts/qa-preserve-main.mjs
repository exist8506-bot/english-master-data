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

function currentJson(file) {
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) throw new Error("Missing current file: data/" + file);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function baselineJson(file) {
  const raw = execFileSync("git", ["show", "origin/main:data/" + file], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return JSON.parse(raw);
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

function list(value, name) {
  if (!Array.isArray(value)) throw new Error(name + " must be an array");
  return value;
}

const changedOutput = execFileSync(
  "git",
  ["diff", "--name-only", "origin/main...HEAD", "--", "data/*.json"],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
).trim();

const changedDataFiles = changedOutput
  ? changedOutput.split("\\n").filter(Boolean).map((p) => p.replace(/^data\\//, ""))
  : [];

const results = {};

for (const file of criticalFiles) {
  if (!changedDataFiles.includes(file)) {
    results[file] = { skipped: true, reason: "unchanged on PR" };
    continue;
  }
  try {
    execFileSync("git", ["cat-file", "-e", "origin/main:data/" + file], { maxBuffer: 256 * 1024 * 1024 });
  } catch {
    throw new Error("Baseline file missing on origin/main: data/" + file);
  }

  let base;
  let cur;
  try {
    base = list(baselineJson(file), file + " (main)");
    cur = list(currentJson(file), file + " (PR)");
  } catch (err) {
    console.error("PRESERVATION READ ERROR:", file, err.message);
    throw err;
  }

  const baseKeys = new Set(base.map((x) => keyFor(file, x)).filter(Boolean));
  const curKeys = new Set(cur.map((x) => keyFor(file, x)).filter(Boolean));
  const missing = [...baseKeys].filter((k) => !curKeys.has(k));

  results[file] = {
    mainCount: base.length,
    currentCount: cur.length,
    missingOldRecords: missing.length,
    sampleMissing: missing.slice(0, 5),
  };

  if (missing.length) {
    throw new Error(
      "DATA LOSS detected in " + file +
      ": " + missing.length + " existing records disappeared. " +
      JSON.stringify(missing.slice(0, 5))
    );
  }
}

let baseExp;
let curExp;
try {
  baseExp = baselineJson("expansion500.json");
  curExp = currentJson("expansion500.json");
} catch (err) {
  console.error("PRESERVATION READ ERROR: expansion500.json", err.message);
  throw err;
}
if (!baseExp || typeof baseExp !== "object" || !Array.isArray(baseExp.words)) {
  throw new Error("Baseline expansion500.json has invalid shape");
}
if (!curExp || typeof curExp !== "object" || !Array.isArray(curExp.words)) {
  throw new Error("Current expansion500.json has invalid shape");
}
const baseWords = new Set(baseExp.words.map((x) => norm(x?.word)).filter(Boolean));
const curWords = new Set(curExp.words.map((x) => norm(x?.word)).filter(Boolean));
const missingExpansionWords = [...baseWords].filter((w) => !curWords.has(w));
if (changedDataFiles.includes("expansion500.json") && missingExpansionWords.length) {
  throw new Error(
    "DATA LOSS detected in expansion500.json: " +
    missingExpansionWords.length +
    " previous expansion words disappeared: " +
    JSON.stringify(missingExpansionWords.slice(0, 10))
  );
}
}

console.log("=== English Master preservation audit ===");
console.log("Critical files checked: " + criticalFiles.length);
console.log(JSON.stringify({
  status: "PASS",
  message: "All records present on main are preserved on the PR branch.",
  files: results
}, null, 2));
