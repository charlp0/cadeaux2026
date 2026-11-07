#!/usr/bin/env node
// Génère anniversaire.html (page « anniversaire de Louis ») à partir de index.html (page Noël). À relancer après chaque modification d'index.html.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'); let s=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sub=(a,b)=>{ if(!s.includes(a)) throw new Error('marqueur absent : '+a); s=s.replace(a,b); };
sub('<html lang="fr" data-mode="noel">','<html lang="fr" data-mode="anniv">');
sub('<title>Les listes de Noël</title>',"<title>L'anniversaire de Louis</title>");
sub('<meta name="description" content="Listes de cadeaux de Louis, Capucine, Clémentine et Charles : prix, meilleur prix ailleurs, réservation en un clic.">','<meta name="description" content="La liste d\'anniversaire de Louis (3 décembre) : prix, meilleur prix ailleurs, réservation en un clic.">');
s='<!-- Fichier généré par scripts/build_anniv.js : modifier index.html puis relancer le script. -->\n'+s;
fs.writeFileSync(path.join(root,'anniversaire.html'),s); console.log('anniversaire.html généré');
