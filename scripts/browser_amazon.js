// À exécuter dans le navigateur intégré sur une page de https://www.amazon.fr (javascript_tool), par lots de 10 ASIN max (45 s de limite).
// Remplacer __ASINS__ par un tableau JSON d'ASIN. Rend un JSON {asin:{prix,titre}} ; prix null = pas d'offre affichée.
const asins=__ASINS__; const out={};
for(const a of asins){try{const r=await fetch('/s?k='+a,{credentials:'include'});const t=await r.text();const d=new DOMParser().parseFromString(t,'text/html');const x=[...d.querySelectorAll('div[data-component-type="s-search-result"]')].find(n=>n.getAttribute('data-asin')===a);out[a]=x?{titre:(x.querySelector('h2')||{}).textContent?.trim().slice(0,80),prix:(x.querySelector('.a-price .a-offscreen')||{}).textContent||null}:{absent:true};}catch(e){out[a]={err:String(e)}}await new Promise(r=>setTimeout(r,400));}
JSON.stringify(out)
