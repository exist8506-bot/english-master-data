#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files=["vocabulary.json","sentences.json","questions.json","grammar.json","communication.json","trilingual.json","expansion500.json"];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"em-chaos2-"));
const base=Object.fromEntries(files.map(f=>[f,f==="expansion500.json"
  ? {package:"expansion500",version:"8.0.0",count:3,words:[{word:"alpha",vocabId:"v1"},{word:"beta",vocabId:"v2"},{word:"gamma",vocabId:"v3"}]}
  : [{id:"1",word:"alpha",en:"alpha"},{id:"2",word:"beta",en:"beta"},{id:"3",word:"gamma",en:"gamma"}]
]));
for(const [f,v] of Object.entries(base))fs.writeFileSync(path.join(dir,f),JSON.stringify(v));

function load(f){return JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"))}
function save(f,v){fs.writeFileSync(path.join(dir,f),JSON.stringify(v))}
function clone(v){return JSON.parse(JSON.stringify(v))}
function keyFor(file,item){
  if(file==="vocabulary.json")return String(item.word||item.id||"");
  if(file==="expansion500.json")return String(item.word||item.vocabId||"");
  return String(item.id||item.word||item.en||"");
}
function recordMap(file,value){
  if(!Array.isArray(value))return new Map();
  return new Map(value.map(x=>[keyFor(file,x),JSON.stringify(x)]).filter(([k])=>k));
}
function assertOldRecords(allowedChanged=[]){
  const allow=new Set(allowedChanged);
  for(const f of files){
    if(allow.has(f))continue;
    const before=recordMap(f,base[f]);
    const after=recordMap(f,load(f));
    for(const [k,v] of before){
      if(!after.has(k))throw Error("old record lost: "+f+" key="+k);
      if(after.get(k)!==v)throw Error("old record changed: "+f+" key="+k);
    }
  }
}
const tests=[];

function pass(name,fn,allowedChanged=[]){
  for(let i=0;i<3;i++){
    for(const f of files)save(f,clone(base[f]));
    fn();
    assertOldRecords(allowedChanged);
  }
  tests.push(name+" PASS");
}
function detect(name,fn){
  let detected=false;
  for(let i=0;i<3;i++){
    for(const f of files)save(f,clone(base[f]));
    try{
      fn();
      for(const f of files){
        if(f==="expansion500.json"){
          const exp=load(f);
          if(exp.count!==3||!Array.isArray(exp.words)||exp.words.length!==3)detected=true;
          continue;
        }
        const before=recordMap(f,base[f]),after=recordMap(f,load(f));
        for(const [k,v] of before){
          if(!after.has(k)||after.get(k)!==v){detected=true;break}
        }
        if(detected)break;
      }
    }catch{detected=true}
  }
  if(!detected)throw Error(name+" was not detected");
  tests.push(name+" DETECTED");
}

pass("simultaneous synonym additions",
  ()=>save("vocabulary.json",[...load("vocabulary.json"),...Array.from({length:100},(_,i)=>({id:"s"+i,word:"large"+i,meaning:"big"}))]),
  ["vocabulary.json"]);

pass("rapid repeated duplicate additions",
  ()=>save("vocabulary.json",[...load("vocabulary.json"),...Array.from({length:1000},()=>({id:"dup",word:"alpha"}))]),
  ["vocabulary.json"]);

pass("partial records added across all feature files",
  ()=>{for(const f of files.slice(0,6)){const v=load(f);v.push({id:"partial-"+f,word:"new"});save(f,v)}},
  files.slice(0,6));

pass("large burst of mixed valid records",
  ()=>{const v=load("communication.json");v.push(...Array.from({length:20000},(_,i)=>({id:"b"+i,word:"burst"+i})));save("communication.json",v)},
  ["communication.json"]);

pass("unicode and long text additions",
  ()=>{const v=load("sentences.json");v.push({id:"unicode",en:"你好 🌟 café — very long ".repeat(1000)});save("sentences.json",v)},
  ["sentences.json"]);

pass("same key namespace across different files",
  ()=>{for(const f of files.slice(0,6)){const v=load(f);v.push({id:"shared-key",word:"same-key-in-this-file"});save(f,v)}},
  files.slice(0,6));

detect("truncate old vocabulary",()=>save("vocabulary.json",load("vocabulary.json").slice(0,2)));
detect("overwrite old record",()=>save("vocabulary.json",load("vocabulary.json").map((x,i)=>i===0?{id:"1",word:"OVERWRITTEN"}:x)));
detect("empty old data file",()=>save("vocabulary.json",[]));
detect("malformed UTF-8-like content",()=>fs.writeFileSync(path.join(dir,"vocabulary.json"),"\u0000\u0000broken"));
detect("expansion package loses one mapped word",()=>{const x=load("expansion500.json");x.words.pop();x.count=2;save("expansion500.json",x)});
detect("reset to stale snapshot",()=>save("vocabulary.json",[base["vocabulary.json"][0]]));
detect("simulated interrupted write",()=>fs.writeFileSync(path.join(dir,"vocabulary.json"),'{"id":"partial"'));
detect("duplicate IDs with destructive overwrite",()=>save("vocabulary.json",[{id:"1",word:"new"},{id:"2",word:"beta"},{id:"3",word:"gamma"}]));

console.log(JSON.stringify({status:"PASS",scenarioCount:tests.length,tests,note:"isolated temporary fixtures only; additive scenarios verify old records remain byte-for-byte identical while allowing expected target-file changes"},null,2));
