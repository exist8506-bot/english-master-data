#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const files=["vocabulary.json","sentences.json","questions.json","grammar.json","communication.json","trilingual.json","expansion500.json"];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"em-chaos2-"));
const base=Object.fromEntries(files.map(f=>[f,f==="expansion500.json"?{package:"expansion500",version:"8.0.0",count:3,words:[{word:"alpha",vocabId:"v1"},{word:"beta",vocabId:"v2"},{word:"gamma",vocabId:"v3"}]}:[{id:"1",word:"alpha",en:"alpha"},{id:"2",word:"beta",en:"beta"},{id:"3",word:"gamma",en:"gamma"}]]));
for(const [f,v] of Object.entries(base))fs.writeFileSync(path.join(dir,f),JSON.stringify(v));
const hash=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash("sha256").update(fs.readFileSync(path.join(dir,f))).digest("hex")]));
const before=hash();

function load(f){return JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"))}
function save(f,v){fs.writeFileSync(path.join(dir,f),JSON.stringify(v))}
function assertOld(){const after=hash();for(const f of files)if(f!=="expansion500.json"&&before[f]!==after[f])throw Error("old file unexpectedly changed: "+f)}
const tests=[];

function pass(name,fn){for(let i=0;i<3;i++){for(const f of files){let v=base[f];save(f,v)};fn();assertOld();}tests.push(name+" PASS")}
function detect(name,fn){let detected=false;for(let i=0;i<3;i++){for(const f of files)save(f,base[f]);try{fn();const x=load("vocabulary.json");if(x.length!==3)detected=true}catch{detected=true}}if(!detected)throw Error(name+" was not detected");tests.push(name+" DETECTED")}

pass("simultaneous synonym additions",()=>save("vocabulary.json",[...load("vocabulary.json"),...Array.from({length:100},(_,i)=>({id:"s"+i,word:"large"+i,meaning:"big"}))]));
pass("rapid repeated duplicate additions",()=>save("vocabulary.json",[...load("vocabulary.json"),...Array.from({length:1000},()=>({id:"dup",word:"alpha"}))]));
pass("partial records added across all feature files",()=>{for(const f of files.slice(0,6)){let v=load(f);v.push({id:"partial-"+f,word:"new"});save(f,v)}});
pass("large burst of mixed valid records",()=>{let v=load("communication.json");v.push(...Array.from({length:20000},(_,i)=>({id:"b"+i,word:"burst"+i})));save("communication.json",v)});
pass("unicode and long text additions",()=>{let v=load("sentences.json");v.push({id:"unicode",en:"你好 🌟 café — very long ".repeat(1000)});save("sentences.json",v)});
pass("same key namespace across different files",()=>{for(const f of files.slice(0,6)){let v=load(f);v.push({id:"1",word:"replacement-looking"});save(f,v)}});

detect("truncate old vocabulary",()=>save("vocabulary.json",load("vocabulary.json").slice(0,2)));
detect("overwrite old record",()=>save("vocabulary.json",load("vocabulary.json").map((x,i)=>i===0?{id:"1",word:"OVERWRITTEN"}:x)));
detect("empty old data file",()=>save("vocabulary.json",[]));
detect("malformed UTF-8-like content",()=>fs.writeFileSync(path.join(dir,"vocabulary.json"),"\u0000\u0000broken"));
detect("expansion package loses one mapped word",()=>{let x=load("expansion500.json");x.words.pop();x.count=2;save("expansion500.json",x)});
detect("reset to stale snapshot",()=>save("vocabulary.json",[base["vocabulary.json"][0]]));
detect("simulated interrupted write",()=>fs.writeFileSync(path.join(dir,"vocabulary.json"),'{"id":"partial"'));
detect("duplicate IDs with destructive overwrite",()=>save("vocabulary.json",[{id:"1",word:"new"},{id:"2",word:"beta"},{id:"3",word:"gamma"}]));

console.log(JSON.stringify({status:"PASS",scenarioCount:tests.length,tests,note:"isolated temporary fixtures only"},null,2));
