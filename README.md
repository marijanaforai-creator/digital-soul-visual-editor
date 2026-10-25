# Digital Soul — Vizuelni editor

Bezbedan lokalni prototip vizuelnog uređivača. Builder i stari uređivač rade odvojeno; nijedan nije povezan sa `mindstru.site` niti objavljuje promene.

## Page builder

- Uđi preko dugmeta **Page builder** u starom editoru.
- Upravljaј početnih deset nacrta stranica, menjaj imena i redosled, dupliraj ih ili briši; jednu označi kao početnu.
- Početnih pet stranica odgovara sekcijama koje postoje u prototipu. Oznaka ne znači da je stari sadržaj automatski pretvoren u builder blokove. Ostale su novi nezavisni nacrti.
- Dodaj, izaberi, premesti, dupliraj, sakrij ili obriši blok. Izbor bloka otvara uređivanje teksta, URL-a, slike, boja, širine, poravnanja, razmaka i vidljivosti po uređajima.
- Pregledaj raspored na desktopu, tabletu i telefonu. Povuci blok za promenu redosleda; postoje i kontrole gore/dole.
- Mediji se dodaju u lokalnu IndexedDB biblioteku. Podržani su JPG, PNG, WebP i GIF do 5 MB po slici.
- Nacrt se automatski čuva nakon kratkog zastoja i može se vratiti posle osvežavanja u istom pregledaču.
- JSON izvoz uključuje slike; uvoz validira strukturu i traži potvrdu pre zamene lokalnog projekta.
- Undo/redo pokriva poslednjih 50 izmena.

## Pokretanje i provera

Potreban je Node.js. Zavisnosti su React, Vite i lucide-react.

```bash
npm install
npm run dev
npm test
npm run build
```

## Ograničenja

Podaci ostaju samo u IndexedDB pregledača i uređaja; nema sinhronizacije, rezervne kopije ni server-side skladištenja. Navigacija zaglavlja je demonstraciona. CTA dugmad rade za dozvoljen URL, stranicu ili blok koji je izabran u svojstvima; ostala dugmad su primeri bez povezane destinacije. Kontakt forma je primer bez slanja, a objavljivanje nije povezano. Za trajno deljenje nacrta potreban je autentifikovan backend i media storage. Ne stavljaj tajne ključeve u frontend.
