#!/usr/bin/env node
// Compare un relevé King Jouet / Amazon avec data.js, met à jour data.js et écrit un rapport.
// Usage : node scripts/compare_prix.js kj.json amazon.json [--dry]
//   kj.json     : sortie de browser_kj.js      {ref:{nom,prix,prixOrig,dispo}}
//   amazon.json : sortie de browser_amazon.js  {asin:{prix:"12,34 €",titre}}
// Écrit ~/Documents/Claude/Outbox/Cadeaux/prix-AAAA-MM-JJ.md et, s'il y a des changements, ~/Documents/Claude/Inbox/cadeaux-prix-alerte.md.
// Code de sortie : 0 sans changement, 3 avec changements (data.js modifié sauf --dry).
const fs=require('fs'),vm=require('vm'),path=require('path'),os=require('os');
const [kjFile,amzFile]=process.argv.slice(2); const dry=process.argv.includes('--dry');
if(!kjFile||!amzFile){console.error('usage: compare_prix.js kj.json amazon.json [--dry]');process.exit(2);}
const root=path.join(__dirname,'..'); const dataPath=path.join(root,'data.js');
let src=fs.readFileSync(dataPath,'utf8');
const LISTS=vm.runInNewContext(src+';LISTS',{});
const kj=JSON.parse(fs.readFileSync(kjFile,'utf8')), amz=JSON.parse(fs.readFileSync(amzFile,'utf8'));
const eur=n=>n==null?'—':Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const parsePrix=s=>{if(s==null)return null;const m=String(s).replace(/\s/g,'').match(/([\d.]+),(\d{2})/);return m?Number(m[1].replace(/\./g,''))+Number(m[2])/100:null;};
const today=new Date().toISOString().slice(0,10);
const changes=[]; // {liste, nom, type, avant, apres}
function setField(itemId,field,val){ // remplace `field:<val>` dans la ligne de l'item (data.js est écrit à la main, une ligne par item)
  const re=new RegExp('(\\{id:"'+itemId+'",[^\\n]*?'+field+':)([^,}]*)');
  const m=src.match(re); if(!m) return false;
  src=src.replace(re,'$1'+(val==null?'null':String(val))); return true;
}
function setAmazon(itemId,listVar,val){ const re=new RegExp('(\\n\\s*"'+itemId+'": \\{"prix":)([^,]*)'); const m=src.match(re); if(!m) return false; src=src.replace(re,'$1'+(val==null?'null':String(val))); return true; }
for(const L of LISTS){
  for(const i of L.items){
    const k=i.ref&&kj[i.ref];
    if(k&&!k.err){
      if(k.absent){ changes.push({liste:L.prenom,nom:i.nom,type:'King Jouet : fiche disparue du site',avant:eur(i.prixWeb),apres:'absent'}); }
      else{
        if(i.prixWeb!=null&&Math.abs(k.prix-i.prixWeb)>0.001){ changes.push({liste:L.prenom,nom:i.nom,type:k.prix<i.prixWeb?'King Jouet : prix en baisse':'King Jouet : prix en hausse',avant:eur(i.prixWeb),apres:eur(k.prix)}); setField(i.id,'prixWeb',k.prix); setField(i.id,'prixWebOrig',k.prixOrig||null); }
        const wasIndispo=/Indisponible en ligne/.test(i.noteKJ||'');
        if(!k.dispo&&!wasIndispo) changes.push({liste:L.prenom,nom:i.nom,type:'King Jouet : plus disponible en ligne',avant:'dispo',apres:'indisponible'});
        if(k.dispo&&wasIndispo) changes.push({liste:L.prenom,nom:i.nom,type:'King Jouet : de nouveau disponible en ligne',avant:'indisponible',apres:'dispo'});
      }
    }
    const a=L.amazon[i.id]; const asin=a&&a.url&&(/\/dp\/([A-Z0-9]{10})/.exec(a.url)||[])[1]; const am=asin&&amz[asin];
    if(am&&!am.err){
      const p=am.absent?null:parsePrix(am.prix);
      if(a.prix!=null&&p==null) changes.push({liste:L.prenom,nom:i.nom,type:'Amazon : plus d\'offre affichée',avant:eur(a.prix),apres:'—'});
      else if(a.prix==null&&p!=null){ changes.push({liste:L.prenom,nom:i.nom,type:'Amazon : offre de retour',avant:'—',apres:eur(p)}); setAmazon(i.id,null,p); }
      else if(p!=null&&Math.abs(p-a.prix)>0.001){ changes.push({liste:L.prenom,nom:i.nom,type:p<a.prix?'Amazon : prix en baisse':'Amazon : prix en hausse',avant:eur(a.prix),apres:eur(p)}); setAmazon(i.id,null,p); }
    }
  }
}
const outDir=path.join(os.homedir(),'Documents','Claude','Outbox','Cadeaux'); fs.mkdirSync(outDir,{recursive:true});
let md=`# Relevé des prix — ${today}\n\nListes : ${LISTS.map(l=>l.prenom+' ('+l.items.length+')').join(', ')}. Sources : king-jouet.com (prix web) et amazon.fr (prix affiché en résultats de recherche).\n\n`;
if(!changes.length) md+='Aucun changement depuis le dernier relevé.\n';
else{ md+='| Liste | Cadeau | Changement | Avant | Après |\n|---|---|---|---|---|\n'; for(const c of changes) md+=`| ${c.liste} | ${c.nom} | ${c.type} | ${c.avant} | ${c.apres} |\n`; }
fs.writeFileSync(path.join(outDir,`prix-${today}.md`),md);
if(changes.length){ const inbox=path.join(os.homedir(),'Documents','Claude','Inbox'); fs.mkdirSync(inbox,{recursive:true}); fs.writeFileSync(path.join(inbox,'cadeaux-prix-alerte.md'),md+'\nSite : https://charlp0.github.io/cadeaux2026/ — data.js '+(dry?'non modifié (--dry)':'mis à jour')+'.\n'); if(!dry) fs.writeFileSync(dataPath,src); }
console.log(md); process.exit(changes.length?3:0);
