<p align="center">
  <img src="public/img/login-hero.png" alt="ImaGrow" width="200" />
</p>

# ImaGrow

> Previously released as **Auxology**. As of v4.0.0 the international name is **ImaGrow**.

Desktop aplikace pro sledování růstu nedonošených dětí na základě referenčních auxologických dat Centra komplexní péče KDDL VFN Praha (LMS kvantilová regrese, 1 781 dětí, 5 676 vyšetření, 2001–2015).

ImaGrow běží plně offline v prostředí Electron, data zůstávají na uživatelském počítači (IndexedDB / LoveField).

## Website

🌐 [**imagrow.app**](https://imagrow.app) — landing page, downloads, documentation

## Dokumentace

- 🇨🇿 [Uživatelská příručka (CZ)](docs/user-guide-cs.html)
- 🇬🇧 [User guide (EN)](docs/user-guide.html)
- [CHANGELOG](CHANGELOG.md)

## Instalace

Stáhněte si nejnovější build pro macOS nebo Windows z [Releases](https://github.com/jirihelmich/imagrow/releases/latest).

> **Upgrading from Auxology 3.x?** Version 4.0 renames the app to ImaGrow. On first launch your data is automatically migrated from `~/Library/Application Support/Auxology/` (macOS) or `%APPDATA%\Auxology\` (Windows) to the new `ImaGrow` folder. The old Auxology.app / installation remains on your machine — you can uninstall it manually once you've confirmed everything works.

## Vývoj

```bash
npm install          # nainstalovat závislosti
npm run dev          # Vite dev server (pouze browser, hot reload)
npm start            # sestavit + spustit jako Electron
npm run build:mac    # macOS .dmg do dist/
npm run build:win    # Windows NSIS do dist/
npm run build        # obojí
npx tsc --noEmit     # typecheck
npm run docs         # regenerate docs/ (Playwright required)
```

## Stack

React 19 + TypeScript + Tailwind CSS 4 · Recharts · LoveField (IndexedDB) · Electron.

## Licence

Kód je uvolněn pod [CC0 1.0](LICENSE.md). Referenční auxologická data pocházejí z projektu KDDL VFN Praha (viz přihlašovací obrazovka aplikace pro plné uvedení autorů).
