#!/usr/bin/env node
// Imprime les références à relever : refs King Jouet et ASIN Amazon de toutes les listes.
// Usage : node scripts/prix_refs.js  →  JSON {kj:[...], amazon:[...]}
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8');
const LISTS=vm.runInNewContext(src+';LISTS',{});
const kj=new Set(),amazon=new Set();
for(const L of LISTS){ for(const i of L.items){ if(i.ref&&i.prixWeb!=null) kj.add(i.ref); const a=L.amazon[i.id]; if(a&&a.url){ const m=/\/dp\/([A-Z0-9]{10})/.exec(a.url); if(m) amazon.add(m[1]); } } }
console.log(JSON.stringify({kj:[...kj],amazon:[...amazon]}));
