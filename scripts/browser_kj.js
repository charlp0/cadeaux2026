// À exécuter dans le navigateur intégré sur une page de https://www.king-jouet.com (javascript_tool).
// Remplacer __REFS__ par le tableau JSON des refs (sortie de prix_refs.js, clé "kj"). Rend un JSON {ref:{nom,prix,prixOrig,dispo}}.
const refs=__REFS__; const out={};
await Promise.all(refs.map(async ref=>{try{const r=await fetch('/api/search/products/jeux-jouets/page1.htm?search='+ref,{credentials:'include',headers:{'accept':'application/json'}});const j=await r.json();const h=(j.hits||[]).find(x=>x.reference===ref);out[ref]=h?{nom:h.libelle,prix:h.prix,prixOrig:h.prixOriginal||null,dispo:!!h.estDispoWeb}:{absent:true};}catch(e){out[ref]={err:String(e)}}}));
JSON.stringify(out)
