#!/usr/bin/env node
// Alertes promo PRIVÉES pour Charles sur les listes de Noël. Ne modifie ni data.js ni le site.
//
//   node scripts/alertes_prix.js refs
//       → JSON {kj:[refs King Jouet], amazon:[ASIN], autres:n} des produits à relever
//   node scripts/alertes_prix.js autres <sortie.json>
//       → relève en Node les autres boutiques (Shopify /products/<handle>.js, sinon JSON-LD de la fiche)
//   node scripts/alertes_prix.js rapport <kj.json> <amazon.json> <autres.json>
//       → compare au prix connu (data.js) et à l'historique, écrit le rapport et met à jour l'historique
//
// kj.json = sortie de scripts/browser_kj.js, amazon.json = sortie de scripts/browser_amazon_promo.js.
// Config : ~/Documents/Claude/Context/cadeaux-alertes.json (achats à faire par Charles, seuils).
// Historique et rapports : ~/Documents/Claude/Outbox/Cadeaux/alertes/ (etat.json, alertes-AAAA-MM-JJ.md).
// Code de sortie du rapport : 0 rien de nouveau, 3 au moins une alerte nouvelle.
const fs=require('fs'),vm=require('vm'),path=require('path'),os=require('os');
const root=path.join(__dirname,'..');
const LISTS=vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8')+';LISTS',{});
const HOME=os.homedir();
const cfgPath=path.join(HOME,'Documents','Claude','Context','cadeaux-alertes.json');
const cfg=fs.existsSync(cfgPath)?JSON.parse(fs.readFileSync(cfgPath,'utf8')):{achats:[]};
const SEUIL=cfg.seuilPromo??0.10, SEUIL_MIN=cfg.seuilNouveauMin??0.02;
const outDir=path.join(HOME,'Documents','Claude','Outbox','Cadeaux','alertes');
const SUPA='https://vhhmageufrcenruywawg.supabase.co/rest/v1/corse_votes', KEY='sb_publishable_NuRpgtxqVQ87R6K8txw57Q_oBUt4qay';
const asinOf=u=>u&&(/amazon\.[a-z.]+\/.*?(?:dp|gp\/product)\/([A-Z0-9]{10})/.exec(u)||[])[1];
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return null}};
const eur=n=>n==null?'—':Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const num=s=>{if(s==null)return null;if(typeof s==='number')return s;const m=String(s).replace(/\s| | /g,'').match(/(\d[\d.]*)(?:,(\d{1,2}))?/);return m?Number(m[1].replace(/\./g,''))+(m[2]?Number(m[2].padEnd(2,'0'))/100:0):null;};

// Offres suivies par cadeau : {key, vendeur, url, connu}
function offres(L,i){
  const o=[];
  if(i.ref&&i.prixWeb!=null) o.push({key:'kj:'+i.ref,vendeur:'King Jouet',url:i.url,connu:i.prixWeb});
  const a=L.amazon&&L.amazon[i.id];
  if(a&&a.url&&!a.approx&&asinOf(a.url)) o.push({key:'amz:'+asinOf(a.url),vendeur:'Amazon',url:a.url,connu:a.prix});
  if(!i.ref&&i.url){ const s=asinOf(i.url); if(s) o.push({key:'amz:'+s,vendeur:'Amazon',url:i.url,connu:i.prix}); else o.push({key:'web:'+L.id+':'+i.id,vendeur:i.boutique||host(i.url),url:i.url,connu:i.prix}); }
  const x=L.ailleurs&&L.ailleurs[i.id];
  if(x&&x.url){ const s=asinOf(x.url); if(s) o.push({key:'amz:'+s,vendeur:'Amazon',url:x.url,connu:x.prix}); }
  const seen=new Set(); return o.filter(z=>!seen.has(z.key)&&seen.add(z.key));
}
const tous=[]; for(const L of LISTS) for(const i of L.items) if(!i.commun&&!i.indicatif) tous.push({L,i,o:offres(L,i)});

async function relevAutre(url){
  const H={'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36','accept-language':'fr-FR,fr;q=0.9'};
  const u=new URL(url);
  if(/\/products\/[^/?#]+/.test(u.pathname)){ // Shopify
    const handle=u.pathname.match(/\/products\/([^/?#]+)/)[1];
    const r=await fetch(u.origin+'/products/'+handle+'.js',{headers:H}); if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json(); const vid=u.searchParams.get('variant');
    const v=(vid&&j.variants.find(x=>String(x.id)===vid))||j.variants.find(x=>x.available)||j.variants[0];
    return {prix:v.price/100,barre:v.compare_at_price&&v.compare_at_price>v.price?v.compare_at_price/100:null,dispo:!!v.available};
  }
  const r=await fetch(url,{headers:H}); if(!r.ok) throw new Error('HTTP '+r.status); const t=await r.text();
  const prices=[];
  for(const m of t.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)){
    let j; try{j=JSON.parse(m[1].trim())}catch(e){continue}
    const walk=n=>{ if(!n||typeof n!=='object')return; if(Array.isArray(n)) return n.forEach(walk);
      if(n.offers){ const of=[].concat(n.offers); for(const f of of){ const p=num(f.price??f.lowPrice??(f.priceSpecification&&[].concat(f.priceSpecification)[0].price)); if(p) prices.push({p,dispo:!/OutOfStock/.test(f.availability||'')}); } }
      for(const k in n) if(k!=='offers') walk(n[k]); };
    walk(j);
  }
  if(!prices.length) throw new Error('prix introuvable');
  return {prix:prices[0].p,barre:null,dispo:prices[0].dispo};
}

async function main(){
  const [cmd,...args]=process.argv.slice(2);
  if(cmd==='refs'){
    const kj=new Set(),amz=new Set(); let autres=0;
    for(const t of tous) for(const o of t.o){ if(o.key.startsWith('kj:')) kj.add(o.key.slice(3)); else if(o.key.startsWith('amz:')) amz.add(o.key.slice(4)); else autres++; }
    console.log(JSON.stringify({kj:[...kj],amazon:[...amz],autres})); return;
  }
  if(cmd==='autres'){
    const out={}; const todo=[]; for(const t of tous) for(const o of t.o) if(o.key.startsWith('web:')) todo.push(o);
    await Promise.all(todo.map(async o=>{ try{ out[o.key]=await relevAutre(o.url); }catch(e){ out[o.key]={err:String(e.message||e)}; } }));
    fs.writeFileSync(args[0],JSON.stringify(out,null,1));
    const ok=Object.values(out).filter(x=>!x.err).length; console.log(`autres boutiques : ${ok}/${todo.length} relevées`);
    for(const [k,v] of Object.entries(out)) if(v.err) console.log('  échec',k,v.err); return;
  }
  if(cmd==='rapport'){
    const [kjF,amzF,autF]=args; const rd=f=>f&&fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{};
    const kj=rd(kjF), amz=rd(amzF), aut=rd(autF);
    // Relevé du jour par clé d'offre
    const now={};
    for(const [ref,v] of Object.entries(kj)) if(!v.err&&!v.absent) now['kj:'+ref]={prix:v.prix,barre:v.prixOrig&&v.prixOrig>v.prix?v.prixOrig:null,dispo:v.dispo};
    for(const [a,v] of Object.entries(amz)) if(!v.err&&!v.absent&&num(v.prix)!=null) now['amz:'+a]={prix:num(v.prix),barre:num(v.barre),badge:v.badge||null,dispo:true};
    for(const [k,v] of Object.entries(aut)) if(!v.err) now[k]=v;
    // Réservations en ligne
    // + cadeaux retirés de la liste (cadeau-hide:<liste>:<id>) : jamais d'alerte dessus
    let resa={}; const retires=new Set();
    try{ const r=await fetch(SUPA+'?select=block_id,voter&block_id=like.cadeau:*',{headers:{apikey:KEY,authorization:'Bearer '+KEY}}); for(const x of await r.json()) resa[x.block_id.slice(7)]=x.voter; }catch(e){ console.error('réservations illisibles',e.message); }
    try{ const r=await fetch(SUPA+'?select=block_id&block_id=like.cadeau-hide:*',{headers:{apikey:KEY,authorization:'Bearer '+KEY}}); for(const x of await r.json()) retires.add(x.block_id.slice(12)); }catch(e){ console.error('cadeaux retirés illisibles',e.message); }
    fs.mkdirSync(outDir,{recursive:true}); const etatP=path.join(outDir,'etat.json');
    const etat=fs.existsSync(etatP)?JSON.parse(fs.readFileSync(etatP,'utf8')):{offres:{},signale:{}};
    const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'});
    const achats=new Map((cfg.achats||[]).map(a=>[a.liste+':'+a.id,a.pour]));
    const lignes=[]; let nouvelles=0; const nonSuivis=[];
    for(const {L,i,o} of tous){
      const k=L.id+':'+i.id; const r=resa[k]||null;
      if(retires.has(k)&&!achats.has(k)){ delete etat.signale[k]; continue; }
      const vus=o.filter(z=>now[z.key]&&now[z.key].prix!=null).map(z=>({...z,...now[z.key]}));
      if(!vus.length){ if(!o.some(z=>z.key.startsWith('kj:')||z.key.startsWith('amz:'))||achats.has(k)) nonSuivis.push(L.prenom+' · '+i.nom); continue; }
      const best=vus.filter(z=>z.dispo!==false).sort((a,b)=>a.prix-b.prix)[0]||vus.sort((a,b)=>a.prix-b.prix)[0];
      const connus=o.map(z=>z.connu).filter(x=>x!=null); const connu=connus.length?Math.min(...connus):null;
      const hist=o.map(z=>etat.offres[z.key]).filter(Boolean);
      const histMin=hist.length?Math.min(...hist.map(h=>h.min)):null;
      const raisons=[];
      if(connu!=null&&best.prix<=connu*(1-SEUIL)) raisons.push(`${Math.round((1-best.prix/connu)*100)} % sous le prix noté sur la liste (${eur(connu)})`);
      if(best.barre&&best.barre>best.prix*(1+SEUIL)&&(best.key.startsWith('kj:')||best.key.startsWith('web:')||best.badge)) raisons.push(`promo affichée, prix barré ${eur(best.barre)}${best.badge?' · '+best.badge:''}`);
      else if(best.badge&&/black|friday|cyber|vente|offre|deal/i.test(best.badge)) raisons.push(best.badge);
      if(histMin!=null&&best.prix<histMin*(1-SEUIL_MIN)) raisons.push(`plus bas prix vu depuis le début du suivi (avant ${eur(histMin)})`);
      const sig=etat.signale[k]; const nouveau=raisons.length&&(!sig||best.prix<sig.prix-0.009);
      const aMoi=achats.has(k)||(r&&r.startsWith('__nous__'));
      if(raisons.length||aMoi) lignes.push({L,i,r,best,connu,raisons,nouveau,aMoi,pour:achats.get(k)||(aMoi?'vous (Maman et Papa)':null)});
      if(nouveau){ nouvelles++; etat.signale[k]={prix:best.prix,date:today}; }
      if(!raisons.length&&sig&&best.prix>sig.prix*(1+SEUIL_MIN)) delete etat.signale[k]; // promo finie : on re-signalera la prochaine
    }
    // Historique par offre
    for(const [key,v] of Object.entries(now)){ const h=etat.offres[key]||{min:v.prix,minDate:today,hist:[]}; if(v.prix<h.min){h.min=v.prix;h.minDate=today;} h.dernier=v.prix; h.hist=(h.hist||[]).filter(x=>x[0]!==today).concat([[today,v.prix]]).slice(-60); etat.offres[key]=h; }
    fs.writeFileSync(etatP,JSON.stringify(etat));
    const ligne=x=>`| ${x.nouveau?'🆕 ':''}${x.L.prenom} · [${x.i.nom}](${x.best.url}) | **${eur(x.best.prix)}** chez ${x.best.vendeur}${x.best.dispo===false?' (indispo)':''} | ${x.raisons.join(' ; ')||'pas de promo pour l\'instant'} |`;
    const tab=arr=>arr.length?'| Cadeau | Prix du jour | Pourquoi |\n|---|---|---|\n'+arr.map(ligne).join('\n')+'\n':'Rien à signaler.\n';
    const mes=lignes.filter(x=>x.aMoi), libres=lignes.filter(x=>!x.aMoi&&!x.r&&x.raisons.length), autres=lignes.filter(x=>!x.aMoi&&x.r&&x.raisons.length);
    let md=`# Alertes promo des listes de Noël — ${today}\n\nPrivé, rien n'est publié sur le site. ${Object.keys(now).length} offres relevées (King Jouet, Amazon, autres boutiques). 🆕 = nouvelle alerte depuis le dernier relevé.\n\n`;
    md+=`## Tes achats\n\n${mes.map(x=>`- ${x.i.nom} : pour ${x.pour}`).join('\n')}\n\n${tab(mes)}\n`;
    md+=`## En promo, sans preneur\n\n${tab(libres)}\n`;
    md+=`## En promo, déjà réservés par quelqu'un\n\n${autres.length?'| Cadeau | Prix du jour | Pourquoi |\n|---|---|---|\n'+autres.map(x=>ligne(x).replace(/ \|$/,` · réservé par ${x.r.replace(' · Anniversaire','').replace('__nous__','vous')} |`)).join('\n')+'\n':'Rien à signaler.\n'}\n`;
    if(nonSuivis.length) md+=`## Non suivis aujourd'hui\n\n${nonSuivis.map(s=>'- '+s).join('\n')}\n`;
    const f=path.join(outDir,`alertes-${today}.md`); fs.writeFileSync(f,md);
    console.log(md); console.log(`\nRapport : ${f}\nNouvelles alertes : ${nouvelles}`); process.exit(nouvelles?3:0);
  }
  console.error('usage : alertes_prix.js refs | autres <out.json> | rapport <kj.json> <amazon.json> <autres.json>'); process.exit(2);
}
main();
