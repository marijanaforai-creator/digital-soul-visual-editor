# Digital Soul — Vizuelni editor

Bezbedan početni prototip vizuelnog uređivača sajta. Nije povezan sa `mindstru.site` i ne objavljuje izmene na javnom sajtu.

## Trenutne mogućnosti
- klikni element u prikazu i uredi tekst u panelu;
- učitaj fotografiju sa računara za lokalni pregled (do 8 MB);
- pregledaj prikaz za računar, tablet i telefon;
- sačuvaj nacrt u lokalnom pregledaču.

## Pokretanje
Potrebni su Node.js i npm.

```bash
npm install
npm run dev
```

Za produkcioni build: `npm run build`.

## Ograničenja prototipa
Slike i nacrti se ne čuvaju na serveru. Nema prijave korisnika, povezivanja sa stvarnim elementima `mindstru.site`, objavljivanja ili istorije verzija. Pre povezivanja sa produkcijom potrebno je dodati autentifikaciju, server-side skladištenje, backup i eksplicitnu potvrdu objave. Ne stavljaj tajne ključeve u frontend.
