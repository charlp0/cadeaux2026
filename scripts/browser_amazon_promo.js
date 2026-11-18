// À exécuter dans le navigateur intégré sur une page de https://www.amazon.fr (javascript_tool), par lots de 30 ASIN max (45 s de limite, 4 requêtes en parallèle).
// Remplacer __ASINS__ par un tableau JSON d'ASIN. Rend un JSON {asin:{prix,barre,badge}} ; prix null = pas d'offre affichée.
// barre = prix barré affiché à côté du prix, badge = pastille d'offre (« Offre Pré-Black Friday », « Offre à durée limitée »…).
const asins=__ASINS__; const out={};
const one=async a=>{try{const r=await fetch('/s?k='+a,{credentials:'include'});const t=await r.text();if(/captcha/i.test(t)&&t.length<20000){out[a]={err:'captcha'};return;}const d=new DOMParser().parseFromString(t,'text/html');const x=[...d.querySelectorAll('div[data-component-type="s-search-result"]')].find(n=>n.getAttribute('data-asin')===a);if(!x){out[a]={absent:true};}else{const q=s=>(x.querySelector(s)||{}).textContent?.trim()||null;out[a]={prix:q('.a-price:not(.a-text-price) .a-offscreen'),barre:q('.a-price.a-text-price .a-offscreen'),badge:q('.a-badge-text')};}}catch(e){out[a]={err:String(e)}}};
for(let k=0;k<asins.length;k+=4){await Promise.all(asins.slice(k,k+4).map(one));await new Promise(r=>setTimeout(r,300));}
JSON.stringify(out)
