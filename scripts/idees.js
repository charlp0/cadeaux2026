#!/usr/bin/env node
// Idées de cadeaux ajoutées par les parents (mode parents, « Ajouter une idée de cadeau »), à compléter par Claude.
//
//   node scripts/idees.js list                      → JSON des idées en attente (aCompleter) : [{liste, id, nom, url, boutique, prix, img, age, sub, ajoute}]
//   node scripts/idees.js done <liste> <id> <fiche.json>
//        intègre la fiche complétée dans data.js (ITEMS_<LISTE> + AMAZON_<LISTE> + AILLEURS_<LISTE>) et supprime l'idée en ligne.
//        fiche.json : {nom, cat, noelOnly, sub, marque, age, boutique, prix, url, img, amazon:{prix,url,note,approx}, ailleurs:{vendeur,prix,url,verifie,note}}
//        img = chemin relatif dans le dépôt (ex. "img/custom/c1abc.jpg"), déjà téléchargé.
//   node scripts/idees.js drop <liste> <id>         → supprime l'idée en ligne sans l'intégrer (lien mort, doublon…)
//
// Les réservations et étoiles déjà posées sur l'idée sont conservées : l'id reste le même.
const fs=require('fs'),path=require('path'),vm=require('vm');
const SB_URL="https://vhhmageufrcenruywawg.supabase.co", SB_KEY="sb_publishable_NuRpgtxqVQ87R6K8txw57Q_oBUt4qay", TABLE="corse_votes";
const H={"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json"};
const root=path.join(__dirname,'..'); const dataPath=path.join(root,'data.js');
const [cmd,liste,id,fiche]=process.argv.slice(2);

async function rows(){ const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?select=block_id,voter,created_at&block_id=like.${encodeURIComponent('cadeau-item:*')}`,{headers:H}); if(!r.ok) throw new Error('supabase '+r.status); return r.json(); }
async function del(block_id){ const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?block_id=eq.${encodeURIComponent(block_id)}`,{method:'DELETE',headers:{...H,'Prefer':'return=minimal'}}); if(!r.ok) throw new Error('delete '+r.status); }
function pending(all){ const out=[]; for(const row of all){ const m=/^cadeau-item:([^:]+):(.+)$/.exec(row.block_id); if(!m) continue; let o; try{o=JSON.parse(row.voter);}catch(e){continue;} out.push({liste:m[1],id:m[2],...o,created:row.created_at}); } return out; }
const esc=v=>JSON.stringify(v==null?null:v);
function line(it){ // une ligne d'item au format de data.js
  const f=[`id:${esc(it.id)}`,`nom:${esc(it.nom)}`,`sub:${esc(it.sub||'')}`,`marque:${esc(it.marque||'')}`,`age:${it.age!=null?Number(it.age):0}`,`boutique:${esc(it.boutique||'Boutique')}`,`prix:${it.prix!=null?Number(it.prix):null}`,`url:${esc(it.url||null)}`,`img:${esc(it.img||null)}`];
  if(it.cat) f.splice(1,0,`cat:${esc(it.cat)}`);
  if(it.noelOnly) f.push('noelOnly:true');   // absent de la page anniversaire de Louis
  if(it.note) f.push(`noteKJ:${esc(it.note)}`);
  return ' {'+f.join(', ')+'},';
}
(async()=>{
  if(cmd==='list'){ const p=pending(await rows()).filter(i=>i.aCompleter); console.log(JSON.stringify(p,null,1)); return; }
  if(cmd==='drop'){ if(!liste||!id) throw new Error('usage: drop <liste> <id>'); await del(`cadeau-item:${liste}:${id}`); console.log('supprimé'); return; }
  if(cmd!=='done'||!liste||!id||!fiche) { console.error('usage: list | done <liste> <id> <fiche.json> | drop <liste> <id>'); process.exit(2); }
  const L=liste.toUpperCase(); const it=JSON.parse(fs.readFileSync(fiche,'utf8')); it.id=id;
  if(!it.nom) throw new Error('fiche sans nom');
  let src=fs.readFileSync(dataPath,'utf8');
  const arr=`const ITEMS_${L} = [`; if(!src.includes(arr)) throw new Error('liste inconnue dans data.js : '+liste);
  // 1. item : inséré à la fin du tableau ITEMS_<L>
  const start=src.indexOf(arr); const end=src.indexOf('\n];',start); if(end<0) throw new Error('fin de tableau introuvable');
  const already=new RegExp('\\{id:"'+id+'"').test(src.slice(start,end));
  if(already){ src=src.slice(0,start)+src.slice(start,end).replace(new RegExp('\\n [^\\n]*\\{id:"'+id+'"[^\\n]*'),'\n'+line(it))+src.slice(end); }
  else src=src.slice(0,end)+'\n'+line(it)+src.slice(end);
  // 2. amazon / ailleurs : objets AMAZON_<L> / AILLEURS_<L>
  const put=(name,val)=>{ const k=`const ${name} = {`; const i=src.indexOf(k); if(i<0) throw new Error(name+' introuvable'); const after=i+k.length; const entry=' '+JSON.stringify(id)+': '+JSON.stringify(val);
    if(src.startsWith('};',after)){ src=src.slice(0,after)+'\n'+entry+'\n'+src.slice(after); return; }
    const j=src.indexOf('\n};',after); let body=src.slice(after,j);
    body=body.replace(new RegExp('\\n "'+id+'": [^\\n]*?(,(?=\\n)|$)'),'');
    body=body.replace(/,\s*$/,''); body=body.trim()?body+',\n'+entry:'\n'+entry;
    src=src.slice(0,after)+body+src.slice(j); };
  put(`AMAZON_${L}`, it.amazon||{prix:null,url:null,note:"Pas relevé"});
  put(`AILLEURS_${L}`, it.ailleurs||{vendeur:null,prix:null,url:null,verifie:false,note:"Pas relevé"});
  vm.runInNewContext(src+';LISTS',{}); // data.js doit rester valide
  fs.writeFileSync(dataPath,src);
  await del(`cadeau-item:${liste}:${id}`);
  console.log(`intégré dans ITEMS_${L} : ${it.nom} (${id}) ; idée en ligne supprimée`);
})().catch(e=>{console.error(e.message);process.exit(1);});
