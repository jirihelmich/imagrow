# Changelog

Všechny významné změny v Auxology jsou popsané v tomto souboru. Verze odpovídají [SemVer](https://semver.org/lang/cs/) a jsou zveřejňovány jako [GitHub releases](https://github.com/jirihelmich/auxology/releases).

## [3.4.1] — 2026-04-30

### Změněno
- **Nová ikona aplikace** namísto původních misek vah — stylizovaná dětská ilustrace s růstovou křivkou. V dock / taskbar / instalátoru se ukazuje místo legacy obrázku.
- **Přepracovaný login screen** — split layout 2:3 s modrým brand panelem vlevo (popis aplikace, ilustrace, copyright a grant info) a samostatným formulářem vpravo. Formulář má teď viditelný titul „Přihlášení" / „Sign in".
- **Grant text** rozdělen na tři řádky pro lepší čitelnost (název projektu „Nové metody v následné péči…" je teď na samostatném řádku).
- **Window title** ukazuje „Auxology" místo původního dlouhého českého popisku.

### Pojistka pro existující data
- Žádná změna `userData` cesty — verze 3.4.1 čte databázi z přesně stejné složky jako 3.3.0 a 3.4.0.

## [3.4.0] — 2026-04-30

### Přidáno
- **Banner před automatickým odhlášením.** Limit nečinnosti je nyní 60 minut (dříve 2). 10 minut před vypršením se v horní části aplikace objeví žlutý pruh s odpočtem MM:SS a tlačítkem „Zůstat přihlášen". Po skutečném vypršení limitu aplikace bezpečně přesměruje na přihlášení.
- **Hledání podle data narození.** Lze zadat formát `1.4.2025`, `01.04.2025` nebo `1. 4. 2025`. Aplikace si datum převede na YYMMDD prefix a najde všechny děti narozené ten den (s ohledem na +50 měsíc u dívek a další technické varianty).
- **Export grafu jako PNG.** Každý ze čtyř růstových grafů má v pravém horním rohu malé tlačítko Download. Klepnutím se uloží graf jako PNG ve dvojnásobném rozlišení s bílým pozadím a názvem grafu zapečeným nahoře — připravený k vložení do propouštěcí zprávy.

### Opraveno
- **Hledání podle plného rodného čísla** (`260212/2457`) — dříve mlčky selhávalo, protože interní převod lomítka nesouhlasil s uložením v DB. Funguje i v krátké formě bez lomítka.

## [3.3.0] — 2026-04-22

### Přidáno
- **Tooltip grafu ukazuje percentil.** Při najetí myší na bod pacienta se kromě věku a hodnoty zobrazuje i vypočtený percentil.
- **Zvýraznění extrémů v tabulce vyšetření.** Hodnoty pod 1. nebo nad 99. percentil mají červené pozadí — v tabulce s hmotností, délkou, obvodem hlavy i hmotností k délce.
- **Tlačítko „← Seznam pacientů"** na detailu pacienta pro zřejmější návrat.
- **ErrorBoundary** zachytí případnou chybu při renderu a místo bílé obrazovky ukáže hlášku s tlačítky „Zkusit znovu" / „Zpět na úvod".

### Změněno
- **Délka a obvod hlavy se zadávají v cm**, ne v mm. Akceptuje se desetinná čárka i tečka. Stará uložená data se načtou v pořádku, na pozadí se dál ukládají v mm (žádná migrace databáze).
- **Z formuláře vyšetření zmizel čas** — zadává se pouze datum.
- **Fotografie odstraněna** z formuláře. Existující fotky v starších záznamech se dál zobrazují.
- **Údaje o rodičích jsou defaultně sbalené.** U pacientů s vyplněnými údaji se sekce rozbalí automaticky.

### Opraveno
- **Enter ve formulářích už neodesílá.** Mezi poli se tabuje, submit jen tlačítkem.

## [3.2.0] — 2026-03-05

### Přidáno
- Anglický překlad celé aplikace + jazykový přepínač v sidebaru a na login obrazovce.
- Auto-generovaná uživatelská dokumentace (CS + EN) v `docs/`.

## [3.1.x] — únor 2026

### Změněno
- Drobné UI polishing po React rewrite (print styles, toast notifications, vylepšení grafů).

## [3.0.0] — únor 2026

### Změněno
- **Kompletní přepis frontendu** z AngularJS 1.x na React 19 + TypeScript + Tailwind CSS 4. Aplikační logika a databáze (LoveField/IndexedDB) zůstávají; změnila se pouze prezentační vrstva.

[3.4.1]: https://github.com/jirihelmich/auxology/releases/tag/v3.4.1
[3.4.0]: https://github.com/jirihelmich/auxology/releases/tag/v3.4.0
[3.3.0]: https://github.com/jirihelmich/auxology/releases/tag/v3.3.0
[3.2.0]: https://github.com/jirihelmich/auxology/releases/tag/v3.2.0
[3.0.0]: https://github.com/jirihelmich/auxology/releases/tag/v3.0.0
