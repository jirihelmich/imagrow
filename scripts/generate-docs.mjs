import { _electron as electron } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const REPO = 'jirihelmich/auxology';
const RELEASE_URL = `https://github.com/${REPO}/releases/latest`;
const DMG_URL = `https://github.com/${REPO}/releases/download/v${VERSION}/Auxology-${VERSION}-arm64.dmg`;
const EXE_URL = `https://github.com/${REPO}/releases/download/v${VERSION}/Auxology-Setup-${VERSION}.exe`;
const screenshotDir = path.join(root, 'docs', 'screenshots');

const TEST_USER = 'docs-test-user-' + Date.now();
const TEST_PASS = 'docs-test-pass-123';

// Born Apr 1, 2025 at 30 weeks GA — birth number 250401/0003 (valid mod-11 checksum)
// Expected due date: Jun 10, 2025 (10 weeks later)
const SAMPLE_PATIENT = {
  birthNumber: '250401/0003',
  gender: 'male',
  birthWeight: '1200',
  birthWeek: '30',
  expectedBirthDate: '10. 6. 2025',
  firstname: 'Jan',
  lastname: 'Novák',
};

async function screenshot(page, name, description) {
  const filePath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath });
  console.log(`  Screenshot: ${name}`);
  return { name, description, file: `screenshots/${name}.png` };
}

async function navigateTo(window, hash) {
  await window.evaluate((h) => { window.location.hash = h; }, hash);
  await window.waitForTimeout(1000);
}

async function main() {
  console.log('Launching Electron app...');
  const electronApp = await electron.launch({ args: [path.join(root, 'main.js')] });
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.unmaximize();
    win.setSize(1440, 900);
    win.center();
  });
  await window.waitForTimeout(2000);

  const s = {};

  // Login (Czech)
  console.log('Capturing login page (Czech)...');
  s.loginCs = await screenshot(window, '01-login-cs', 'Login page in Czech');

  // Switch to English
  console.log('Switching to English...');
  const langButton = window.locator('button', { hasText: 'EN' });
  if (await langButton.count() > 0) {
    await langButton.first().click();
    await window.waitForTimeout(300);
  }
  s.loginEn = await screenshot(window, '02-login-en', 'Login page in English');

  // Register
  console.log('Navigating to register page...');
  await navigateTo(window, '#/register');
  s.register = await screenshot(window, '03-register', 'Account registration');

  // Create account & login
  console.log('Creating test account...');
  await window.fill('input[type="text"]', TEST_USER);
  await window.fill('input[type="password"]', TEST_PASS);
  await window.click('button[type="submit"]');
  await window.waitForTimeout(1500);

  console.log('Logging in...');
  await window.fill('input[type="text"]', TEST_USER);
  await window.fill('input[type="password"]', TEST_PASS);
  await window.click('button[type="submit"]');
  await window.waitForTimeout(2000);

  // Dashboard (empty)
  console.log('Capturing dashboard...');
  s.dashboard = await screenshot(window, '04-dashboard', 'Patient dashboard');

  // New patient form (empty)
  console.log('Navigating to new patient form...');
  await navigateTo(window, '#/patients/new');
  s.newPatient = await screenshot(window, '05-new-patient', 'New patient form');

  // Fill patient form
  console.log('Creating a sample patient...');
  await window.fill('input[placeholder="260212/2457"]', SAMPLE_PATIENT.birthNumber);
  await window.fill('input[placeholder="17. 3. 2016"]', SAMPLE_PATIENT.expectedBirthDate);
  await window.locator('select').first().selectOption(SAMPLE_PATIENT.gender);
  await window.locator('input[type="number"][max="2500"]').fill(SAMPLE_PATIENT.birthWeight);
  await window.locator('input[type="number"][max="37"]').fill(SAMPLE_PATIENT.birthWeek);
  await window.locator('input[placeholder="Jan"]').first().fill(SAMPLE_PATIENT.firstname);
  await window.locator('input[placeholder="Novák"]').first().fill(SAMPLE_PATIENT.lastname);
  s.newPatientFilled = await screenshot(window, '06-new-patient-filled', 'Filled patient form');

  // Submit
  await window.locator('button[type="submit"]').click();
  await window.waitForTimeout(2000);

  // Patient detail
  console.log('Capturing patient detail...');
  s.patientDetail = await screenshot(window, '07-patient-detail', 'Patient detail');

  // Add multiple examinations to build realistic growth history
  // Baby born Apr 1, 2025 at 30 weeks with 1200g, ~11 months of follow-up
  // Examinations from April 2025 through early March 2026
  // All dates in the past (today is March 5, 2026)
  // Realistic catch-up growth: head circ ~40th–60th P, weight/length 10th→35th P
  const examinations = [
    { date: '8. 4. 2025 9:00',    length: '37.0', weight: '1150', head: '27.0' },
    { date: '22. 4. 2025 10:00',  length: '39.0', weight: '1400', head: '29.0' },
    { date: '6. 5. 2025 9:00',    length: '41.5', weight: '1700', head: '31.0' },
    { date: '20. 5. 2025 10:00',  length: '44.0', weight: '2050', head: '33.0' },
    { date: '3. 6. 2025 9:00',    length: '46.0', weight: '2400', head: '34.5' },
    { date: '17. 6. 2025 10:00',  length: '48.0', weight: '2800', head: '35.5' },
    { date: '8. 7. 2025 9:00',    length: '51.0', weight: '3400', head: '37.0' },
    { date: '5. 8. 2025 10:00',   length: '54.0', weight: '4100', head: '38.5' },
    { date: '2. 9. 2025 9:00',    length: '57.0', weight: '4800', head: '39.5' },
    { date: '30. 9. 2025 10:00',  length: '59.5', weight: '5400', head: '40.5' },
    { date: '4. 11. 2025 9:00',   length: '62.5', weight: '6100', head: '41.5' },
    { date: '9. 12. 2025 10:00',  length: '65.0', weight: '6800', head: '42.5' },
    { date: '20. 1. 2026 9:00',   length: '67.5', weight: '7500', head: '43.5' },
    { date: '3. 3. 2026 10:00',   length: '70.0', weight: '7800', head: '44.0' },
  ];

  // Add first exam with screenshot
  console.log(`Adding ${examinations.length} examinations...`);
  const firstExam = examinations[0];
  const newExamBtn = window.locator('a', { hasText: /New examination|Nové vyšetření/ });
  if (await newExamBtn.count() > 0) await newExamBtn.first().click();
  await window.waitForTimeout(1000);

  await window.locator('input').first().fill(firstExam.date);
  const lengthInput = window.locator('input[placeholder="520"]').first();
  if (await lengthInput.count() > 0) await lengthInput.fill(firstExam.length);
  const examWeightInput = window.locator('input[placeholder="2345"]');
  if (await examWeightInput.count() > 0) await examWeightInput.fill(firstExam.weight);
  const headInput = window.locator('input[placeholder="375"]').first();
  if (await headInput.count() > 0) await headInput.fill(firstExam.head);

  s.examFilled = await screenshot(window, '08-examination-filled', 'Examination form with measurements');

  await window.locator('button[type="submit"]').click();
  await window.waitForTimeout(1500);

  // Add remaining examinations
  for (let i = 1; i < examinations.length; i++) {
    const exam = examinations[i];
    console.log(`  Exam ${i + 1}/${examinations.length}: ${exam.date}`);
    const btn = window.locator('a', { hasText: /New examination|Nové vyšetření/ });
    if (await btn.count() > 0) await btn.first().click();
    await window.waitForTimeout(800);

    await window.locator('input').first().fill(exam.date);
    const li = window.locator('input[placeholder="520"]').first();
    if (await li.count() > 0) await li.fill(exam.length);
    const wi = window.locator('input[placeholder="2345"]');
    if (await wi.count() > 0) await wi.fill(exam.weight);
    const hi = window.locator('input[placeholder="375"]').first();
    if (await hi.count() > 0) await hi.fill(exam.head);

    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(1500);
  }

  // Patient with growth data
  console.log('Capturing patient with growth data...');
  s.patientGrowth = await screenshot(window, '09-patient-growth', 'Patient overview with examination history');

  // Growth charts
  await window.evaluate(() => window.scrollBy(0, 600));
  await window.waitForTimeout(500);
  s.growthCharts = await screenshot(window, '10-growth-charts', 'Growth charts with percentile curves');

  // Tabulated data
  await window.evaluate(() => window.scrollBy(0, 600));
  await window.waitForTimeout(500);
  s.growthTable = await screenshot(window, '11-growth-table', 'Tabulated data with percentiles and Z-scores');

  // Dashboard with preview
  console.log('Capturing dashboard with patient preview...');
  await navigateTo(window, '#/patients/dashboard');
  const infoBtn = window.locator('button').filter({ has: window.locator('svg') }).last();
  if (await infoBtn.count() > 0) {
    await infoBtn.click();
    await window.waitForTimeout(500);
  }
  s.dashboardPreview = await screenshot(window, '12-dashboard-preview', 'Dashboard with patient preview');

  // Patient list
  console.log('Navigating to patient list...');
  await navigateTo(window, '#/patients/list');
  s.patientList = await screenshot(window, '13-patient-list', 'Patient list');

  // Reference charts
  console.log('Navigating to reference charts...');
  await navigateTo(window, '#/charts');
  await window.waitForTimeout(500);
  s.refCharts = await screenshot(window, '14-ref-charts', 'Reference growth charts');

  // Doctor profile
  console.log('Navigating to doctor profile...');
  await navigateTo(window, '#/doctor/profile');
  s.doctorProfile = await screenshot(window, '15-doctor-profile', 'Doctor profile');

  // --- Czech screenshots ---
  console.log('\nSwitching to Czech for CZ screenshots...');
  const csLangBtn = window.locator('button', { hasText: 'Čeština' });
  if (await csLangBtn.count() > 0) {
    await csLangBtn.first().click();
    await window.waitForTimeout(500);
  }

  const cs = {};

  // Czech doctor profile (already on page)
  cs.doctorProfile = await screenshot(window, 'cs-15-doctor-profile', 'Profil lékaře');

  // Czech dashboard
  console.log('Capturing Czech dashboard...');
  await navigateTo(window, '#/patients/dashboard');
  const csInfoBtn = window.locator('button').filter({ has: window.locator('svg') }).last();
  if (await csInfoBtn.count() > 0) {
    await csInfoBtn.click();
    await window.waitForTimeout(500);
  }
  cs.dashboardPreview = await screenshot(window, 'cs-12-dashboard-preview', 'Přehled pacientů s náhledem');

  // Czech patient detail — navigate to patient
  console.log('Capturing Czech patient detail...');
  await navigateTo(window, '#/patients/list');
  const patientLink = window.locator('a', { hasText: SAMPLE_PATIENT.lastname });
  if (await patientLink.count() > 0) {
    await patientLink.first().click();
    await window.waitForTimeout(1500);
  }

  cs.patientGrowth = await screenshot(window, 'cs-09-patient-growth', 'Přehled pacienta s historií vyšetření');

  await window.evaluate(() => window.scrollBy(0, 600));
  await window.waitForTimeout(500);
  cs.growthCharts = await screenshot(window, 'cs-10-growth-charts', 'Růstové grafy s percentilovými křivkami');

  await window.evaluate(() => window.scrollBy(0, 600));
  await window.waitForTimeout(500);
  cs.growthTable = await screenshot(window, 'cs-11-growth-table', 'Tabulková data s percentily a Z-skóre');

  // Czech new examination form
  console.log('Capturing Czech examination form...');
  await window.evaluate(() => window.scrollTo(0, 0));
  await window.waitForTimeout(300);
  const csNewExamBtn = window.locator('a', { hasText: /Nové vyšetření/ });
  if (await csNewExamBtn.count() > 0) {
    await csNewExamBtn.first().click();
    await window.waitForTimeout(1000);
  }
  await window.locator('input').first().fill('15. 3. 2026 9:00');
  const csLi = window.locator('input[placeholder="520"]').first();
  if (await csLi.count() > 0) await csLi.fill('71.5');
  const csWi = window.locator('input[placeholder="2345"]');
  if (await csWi.count() > 0) await csWi.fill('8100');
  const csHi = window.locator('input[placeholder="375"]').first();
  if (await csHi.count() > 0) await csHi.fill('44.5');
  cs.examFilled = await screenshot(window, 'cs-08-examination-filled', 'Formulář vyšetření s naměřenými hodnotami');

  // Czech reference charts
  console.log('Capturing Czech reference charts...');
  await navigateTo(window, '#/charts');
  await window.waitForTimeout(500);
  cs.refCharts = await screenshot(window, 'cs-14-ref-charts', 'Referenční růstové grafy');

  // Czech new patient form
  console.log('Capturing Czech new patient form...');
  await navigateTo(window, '#/patients/new');
  cs.newPatientForm = await screenshot(window, 'cs-05-new-patient', 'Formulář nového pacienta');

  console.log('Closing app...');
  await electronApp.close();

  console.log('\nGenerating documentation...');
  generateMarkdown(s);
  generateHTML(s);
  generateCzechMarkdown(cs, s);
  generateCzechHTML(cs, s);
  generateIndexHTML();
  console.log('Done! Files written to docs/');
}

function generateMarkdown(s) {
  const img = (shot) => shot ? `\n![${shot.description}](${shot.file})\n` : '';

  const md = `# Auxology — User Guide

Auxology is a desktop application designed for neonatologists and paediatric clinicians who need to monitor the growth of prematurely born children. The application is built around Czech reference auxological data — percentile growth charts derived from a study of 1,781 premature children (5,676 examinations) at the Centre of Comprehensive Care, KDDL VFN Prague, between 2001 and 2015.

All data is stored locally on your computer. There is no cloud component — the application works entirely offline. It runs on both macOS and Windows.

The interface is available in **Czech** and **English**. You can switch between the two at any time, and your preference is remembered across sessions.

**Download:** [macOS (DMG)](${DMG_URL}) · [Windows (EXE)](${EXE_URL}) · [All releases](${RELEASE_URL})

---

## Getting Started

### Creating an Account

When you launch Auxology for the first time, you are presented with the login screen. Since the application stores data locally, your account exists only on your machine — it is not shared with anyone.

Click **Create account** to set up a username and password. Once registered, you are redirected back to the login screen where you can sign in with your new credentials.
${img(s.loginCs)}
To switch the interface language before logging in, use the **EN/CZ** toggle in the top-right corner of the login page. Inside the application, the same toggle is available at the bottom of the sidebar navigation.
${img(s.loginEn)}
### The Dashboard

After signing in, you land on the dashboard. The top row contains **four stat cards** (total patients, examinations in the last 7 / 30 days, and a count of patients needing attention). Below them is a prominent **search bar** and the recent-patients table, with a **"Needs attention"** panel on the right listing patients who haven't been examined in over 30 days. If everybody is current, a green check confirms "All caught up".

Search is **live** — results refresh as you type, no Enter or button click required.

The search bar understands four types of input:

- **Name or surname** (with or without diacritics, e.g. "novak", "Nováková").
- **Full birth number** including the slash, e.g. \`260212/2457\`.
- **Partial birth number** — the first six digits (the date of birth encoded in the birth number) are sufficient.
- **Date of birth** in \`1.4.2025\`, \`01.04.2025\` or \`1. 4. 2025\` format — the application converts the date and finds all children born on that day (handling the +50 month offset for girls and other technical variants).

Results appear in a table that shows each patient's ID, name, gender, birth number, date of birth, gestational age at birth, and birth weight. Clicking a patient's name takes you to their detail page. Clicking the info icon on the right opens a preview panel with a timeline of examinations and quick-action links.
${img(s.dashboardPreview)}
---

## Working with Patients

### Registering a New Patient

Click **New patient** on the dashboard to open the registration form. Four fields are required:

1. **Birth number** (rodné číslo) — the Czech national identification number. The application automatically computes the date of birth and validates the checksum. For female patients, the month is encoded with +50 as per the Czech standard.
2. **Gender** — Girl or Boy.
3. **Birth weight** — in grams. The maximum is 2500 g (the threshold for prematurity).
4. **Gestational week at birth** — the week of gestation when the child was born (maximum 37).

You can optionally provide the child's name, planned due date, birth length, head circumference at birth, and free-text notes. The form also includes sections for mother and father details — personal data, anthropometric measurements, contact information, and address.
${img(s.newPatientFilled)}
After saving, you are taken directly to the new patient's detail page.

### The Patient Detail Page

The patient detail page is the main workspace for a single child. The left column shows **four stat boxes** with the most important facts — gestational age at birth, birth weight, corrected age, and calendar age. Below them are sparkline charts of the latest length, weight, and head circumference, then a single row of actions (New examination, Edit, Delete). Less common dates (calculated and planned due date, current gestational age) live behind a **"More dates and age info"** toggle.

The right column shows the **examination history** as a compact timeline — each examination is one row with the date, corrected age, and the three measurements inline. Edit / delete icons appear on hover.

The **parent information card** is hidden entirely if neither parent has any data on record; otherwise it is collapsed by default and skips empty fields when expanded.
${img(s.patientGrowth)}
---

## Tracking Growth Over Time

The core purpose of Auxology is to track how a premature child grows relative to reference data. This is done by recording examinations at each clinical visit and reviewing the resulting charts and statistics.

### Recording an Examination

From the patient detail page, click **New examination**. The form asks for:

- **Examination date** — pre-filled with today's date (no time).
- **Body length** — in centimetres (decimal point or comma accepted; stored internally in millimetres for precision).
- **Body weight** — in grams.
- **Head circumference** — in centimetres.
- **Notes** — free text for clinical observations.

A subtle **hint** next to each input field shows the most recent measured value (e.g. "last 52.0 cm"). When no examination yet exists, the birth measurement is shown instead. Pressing **Enter** in the form does not submit it — moving between fields is done with Tab, and the form is saved only by the button at the bottom right.

A **live preview** below the form shows four growth charts that update with every keystroke. The clinician sees immediately where the new measurement will fall against the reference percentile bands, before saving.
${img(s.examFilled)}
### Growth Charts

Once at least one examination is recorded, the patient detail page shows four growth charts that plot the child's measurements against reference percentile curves. The percentile lines shown are the 2nd, 5th, 50th, 95th, and 98th — computed using the LMS quantile regression method.

The four charts are:

- **Body length** vs. corrected age
- **Body weight** vs. corrected age
- **Head circumference** vs. corrected age
- **Weight for length** (weight plotted against body length rather than age)

The reference curves are selected automatically based on the child's gender and whether their birth weight was above or below 1500 g. The child's own data points are connected by a coloured line (blue for boys, red for girls), making it easy to see at a glance whether growth is following, crossing, or deviating from the expected percentile bands.

Clicking any chart opens it in a full-screen view for closer inspection or discussion with colleagues.
${img(s.growthCharts)}
### Tabulated Data

Below the charts, a summary table lists every examination chronologically. For each visit, the table shows:

| Column | Description |
|---|---|
| **Date** | When the examination took place |
| **Corrected age** | Age adjusted for prematurity |
| **Weight [g]** | Measured body weight |
| **Weight P** | Weight percentile relative to the reference population |
| **Weight SDS** | Weight standard deviation score (Z-score) |
| **Length [cm]** | Measured body length |
| **Length P / SDS** | Length percentile and Z-score |
| **Head circ. [cm]** | Measured head circumference |
| **Head circ. P / SDS** | Head circumference percentile and Z-score |
| **Weight-for-length P / SDS** | How the child's weight relates to their length |

Percentiles and Z-scores are computed against the appropriate reference dataset (gender × weight category). A Z-score of 0 corresponds to the 50th percentile; values below −2 or above +2 indicate measurements outside the normal range and may warrant clinical attention.
${img(s.growthTable)}
---

## Reference Charts

The **Charts** section, accessible from the sidebar, displays the reference percentile curves without any patient data overlaid. This is useful for printing blank charts, for educational purposes, or for comparing against measurements taken outside the application.

Four tabs let you switch between the reference populations:

- Boys with birth weight below 1500 g
- Girls with birth weight below 1500 g
- Boys with birth weight above 1500 g
- Girls with birth weight above 1500 g

Each tab shows full-size charts for body length, body weight, weight-for-length, and head circumference.
${img(s.refCharts)}
---

## Doctor Profile

The **Profile** section lets you enter your professional details: title prefix (e.g. RNDr., MUDr.), first name, surname, title suffix (e.g. Ph.D.), and workplace. This information is displayed in the sidebar so you can confirm which account is active.
${img(s.doctorProfile)}
---

## Backup & Upgrades

The application stores data entirely on your computer. There is no cloud backup or sync — if the computer is lost, replaced, or reinstalled, the data goes with it. Two practical ways to keep a safety copy:

### Manual export from the app

On the dashboard, the **Export** button (top right) downloads a single \`auxology-export.json\` file containing your complete database — patients, examinations, and parent data. Save it somewhere outside the app's storage: a shared drive, OneDrive, or an external disk. A weekly cadence is a reasonable default; do the export before any larger change (import of many patients, upgrade of the app).

If something happens to your installation, email that JSON to the author and the data will be restored. The app does not yet have a self-service Import button — if this becomes important, let me know and I'll add it.

### Folder-level backup (for hospital IT)

The underlying database lives in the operating system user profile:

- **Windows:** \`C:\\Users\\<user>\\AppData\\Roaming\\auxology\\IndexedDB\\\`
- **macOS:** \`~/Library/Application Support/auxology/IndexedDB/\`

The whole \`IndexedDB\` folder is the complete database. Hospital IT can include this path in the standard user-profile backup (Windows Backup, roaming profiles, Time Machine, OneDrive Known Folder Move). Auxology should be closed during the backup window — the LevelDB file can be locked by a running process, which makes a backup inconsistent. A scheduled nightly backup when nobody is signed in is ideal.

### Upgrading to a new version

Installing a newer release does **not** touch the database. The installer replaces only the application binaries in \`/Applications/\` (macOS) or \`Program Files\\Auxology\\\` (Windows); your data in the profile folder above stays intact. The new version reads the existing IndexedDB, checks the stored schema version, and runs a migration only if the structure changed between releases.

Recommended upgrade routine:

1. Open Auxology and click **Export** on the dashboard; save the JSON somewhere safe.
2. Close Auxology.
3. Install the new version (drag and drop the \`.app\` on macOS, run the \`.exe\` on Windows).
4. Launch the new version and confirm the patient list is still there.
5. If anything looks wrong, send me the JSON from step 1.

During the **uninstall** of a specific version, the installer leaves the data folder in place by default. The database is only deleted by manually removing \`~/Library/Application Support/auxology/\` (macOS) or \`%APPDATA%\\auxology\\\` (Windows), or by ticking a "remove user data" option if one is presented during uninstall.

---

## Additional Information

### Data and Privacy

All patient data is stored in a local IndexedDB database within your browser/Electron instance. Nothing is transmitted over the network. If you need to transfer data to another machine, use the **Export** function on the dashboard.

### Auto-Logout

For security, the application automatically logs you out after **60 minutes** of inactivity. **10 minutes before expiry**, a yellow banner appears at the top with a countdown (e.g. "You will be logged out in 9:42") and a **"Stay signed in"** button that resets the timer.

### Statistical Background

The reference data is based on a longitudinal study of premature children in the Czech Republic:

| | |
|---|---|
| **Sample size** | 1,781 children (846 girls, 935 boys) |
| **Examinations** | 5,676 total |
| **Age range** | 37th to 109th week of gestational age |
| **Institution** | Centre of Comprehensive Care, KDDL VFN Prague |
| **Period** | 2001–2015 |
| **Method** | LMS quantile regression |
| **Percentiles** | 2nd, 5th, 50th, 95th, 98th |
| **Measures** | Body length, body weight, head circumference, weight-for-length |
| **Weight categories** | Below 1500 g / above 1500 g at birth |
`;

  writeFileSync(path.join(root, 'docs', 'user-guide.md'), md);
  console.log('  Written: docs/user-guide.md');
}

function generateHTML(s) {
  const img = (shot) => shot ? `
      <figure>
        <img src="${shot.file}" alt="${shot.description}" loading="lazy" />
        <figcaption>${shot.description}</figcaption>
      </figure>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auxology — User Guide</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.75; font-size: 16px; }
    .hero { background: linear-gradient(135deg, #2f4050 0%, #1c84c6 100%); color: white; padding: 5rem 2rem; text-align: center; }
    .hero h1 { font-size: 2.8rem; margin-bottom: 0.75rem; font-weight: 700; }
    .hero p { font-size: 1.15rem; opacity: 0.9; max-width: 550px; margin: 0 auto; }
    .lang-switch { position: absolute; top: 1.5rem; right: 2rem; }
    .lang-switch a { color: white; text-decoration: none; opacity: 0.8; font-size: 0.9rem; padding: 0.4rem 0.8rem; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; }
    .lang-switch a:hover { opacity: 1; background: rgba(255,255,255,0.1); }
    .container { max-width: 780px; margin: 0 auto; padding: 3rem 2rem; }
    h2 { color: #2f4050; margin: 3rem 0 1.25rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; font-size: 1.5rem; }
    h3 { color: #1c84c6; margin: 2rem 0 0.75rem; font-size: 1.2rem; }
    p { margin-bottom: 1rem; }
    ul, ol { padding-left: 1.75rem; margin-bottom: 1.25rem; }
    li { margin-bottom: 0.5rem; }
    strong { color: #2f4050; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 3rem 0; }
    figure { margin: 2rem 0; border: 1px solid #e2e5e9; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    figure img { width: 100%; display: block; }
    figcaption { padding: 0.6rem 1rem; background: #f8fafc; font-size: 0.85rem; color: #6b7280; text-align: center; border-top: 1px solid #e2e5e9; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0 1.5rem; font-size: 0.95rem; }
    th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
    th { font-weight: 600; color: #2f4050; background: #f8fafc; }
    .tech table td:first-child { font-weight: 600; white-space: nowrap; width: 180px; color: #2f4050; }
    footer { text-align: center; padding: 2.5rem; color: #9ca3af; font-size: 0.85rem; border-top: 1px solid #e5e7eb; margin-top: 3rem; }
  </style>
</head>
<body>
  <div class="hero" style="position: relative;">
    <div class="lang-switch"><a href="user-guide-cs.html">Česky</a></div>
    <img src="../public/img/login-hero.png" alt="" aria-hidden="true" style="width: 140px; height: 140px; margin: 0 auto 1.25rem; display: block; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));" />
    <h1>Auxology</h1>
    <p>User Guide</p>
  </div>

  <div class="container">
    <p>Auxology is a desktop application designed for neonatologists and paediatric clinicians who need to monitor the growth of prematurely born children. The application is built around Czech reference auxological data — percentile growth charts derived from a study of 1,781 premature children (5,676 examinations) at the Centre of Comprehensive Care, KDDL VFN Prague, between 2001 and 2015.</p>

    <p>All data is stored locally on your computer. There is no cloud component — the application works entirely offline. It runs on both macOS and Windows.</p>

    <p>The interface is available in <strong>Czech</strong> and <strong>English</strong>. You can switch between the two at any time, and your preference is remembered across sessions.</p>

    <p class="download-links"><strong>Download:</strong> <a href="${DMG_URL}">macOS (DMG)</a> · <a href="${EXE_URL}">Windows (EXE)</a> · <a href="${RELEASE_URL}">All releases</a></p>

    <hr />

    <h2>Getting Started</h2>

    <h3>Creating an Account</h3>

    <p>When you launch Auxology for the first time, you are presented with the login screen. Since the application stores data locally, your account exists only on your machine — it is not shared with anyone.</p>

    <p>Click <strong>Create account</strong> to set up a username and password. Once registered, you are redirected back to the login screen where you can sign in with your new credentials.</p>

    ${img(s.loginCs)}

    <p>To switch the interface language before logging in, use the <strong>EN/CZ</strong> toggle in the top-right corner of the login page. Inside the application, the same toggle is available at the bottom of the sidebar navigation.</p>

    ${img(s.loginEn)}

    <h3>The Dashboard</h3>

    <p>After signing in, you land on the dashboard. The top row contains <strong>four stat cards</strong> (total patients, examinations in the last 7 / 30 days, and a count of patients needing attention). Below them is a prominent <strong>search bar</strong> and the recent-patients table, with a <strong>&ldquo;Needs attention&rdquo;</strong> panel on the right listing patients who haven't been examined in over 30 days. If everybody is current, a green check confirms &ldquo;All caught up&rdquo;.</p>

    <p>Search is <strong>live</strong> &mdash; results refresh as you type, no Enter or button click required.</p>

    <p>The search bar understands four types of input:</p>
    <ul>
      <li><strong>Name or surname</strong> (with or without diacritics, e.g. &ldquo;novak&rdquo;, &ldquo;Nov&aacute;kov&aacute;&rdquo;).</li>
      <li><strong>Full birth number</strong> including the slash, e.g. <code>260212/2457</code>.</li>
      <li><strong>Partial birth number</strong> &mdash; the first six digits (the date of birth encoded in the birth number) are sufficient.</li>
      <li><strong>Date of birth</strong> in <code>1.4.2025</code>, <code>01.04.2025</code> or <code>1. 4. 2025</code> format &mdash; the application converts the date and finds all children born on that day (handling the +50 month offset for girls and other technical variants).</li>
    </ul>
    <p>Results appear in a table that shows each patient's ID, name, gender, birth number, date of birth, gestational age at birth, and birth weight. Clicking a patient's name takes you to their detail page. Clicking the info icon on the right opens a preview panel with a timeline of examinations and quick-action links.</p>

    ${img(s.dashboardPreview)}

    <hr />

    <h2>Working with Patients</h2>

    <h3>Registering a New Patient</h3>

    <p>Click <strong>New patient</strong> on the dashboard to open the registration form. Four fields are required:</p>

    <ol>
      <li><strong>Birth number</strong> (rodné číslo) — the Czech national identification number. The application automatically computes the date of birth and validates the checksum. For female patients, the month is encoded with +50 as per the Czech standard.</li>
      <li><strong>Gender</strong> — Girl or Boy.</li>
      <li><strong>Birth weight</strong> — in grams. The maximum is 2500 g (the threshold for prematurity).</li>
      <li><strong>Gestational week at birth</strong> — the week of gestation when the child was born (maximum 37).</li>
    </ol>

    <p>You can optionally provide the child's name, planned due date, birth length, head circumference at birth, and free-text notes. The form also includes sections for mother and father details — personal data, anthropometric measurements, contact information, and address.</p>

    ${img(s.newPatientFilled)}

    <h3>The Patient Detail Page</h3>

    <p>The patient detail page is the main workspace for a single child. The left column shows <strong>four stat boxes</strong> with the most important facts &mdash; gestational age at birth, birth weight, corrected age, and calendar age. Below them are sparkline charts of the latest length, weight, and head circumference, then a single row of actions (New examination, Edit, Delete). Less common dates (calculated and planned due date, current gestational age) live behind a <strong>&ldquo;More dates and age info&rdquo;</strong> toggle.</p>

    <p>The right column shows the <strong>examination history</strong> as a compact timeline &mdash; each examination is one row with the date, corrected age, and the three measurements inline. Edit / delete icons appear on hover.</p>

    <p>The <strong>parent information card</strong> is hidden entirely if neither parent has any data on record; otherwise it is collapsed by default and skips empty fields when expanded.</p>

    ${img(s.patientGrowth)}

    <hr />

    <h2>Tracking Growth Over Time</h2>

    <p>The core purpose of Auxology is to track how a premature child grows relative to reference data. This is done by recording examinations at each clinical visit and reviewing the resulting charts and statistics.</p>

    <h3>Recording an Examination</h3>

    <p>From the patient detail page, click <strong>New examination</strong>. The form asks for the examination date (pre-filled with today, no time), body length and head circumference in centimetres (decimal point or comma accepted; stored internally in millimetres for precision), body weight in grams, and optional notes.</p>

    <p>Pressing <strong>Enter</strong> in the form does not submit it &mdash; moving between fields is done with Tab, and the form is saved only by the button at the bottom right.</p>

    <p>A subtle <strong>hint</strong> next to each input field shows the most recent measured value (e.g. &ldquo;last 52.0 cm&rdquo;). When no examination yet exists, the birth measurement is shown instead.</p>

    <p>A <strong>live preview</strong> below the form shows four growth charts that update with every keystroke. The clinician sees immediately where the new measurement will fall against the reference percentile bands, before saving.</p>

    ${img(s.examFilled)}

    <h3>Growth Charts</h3>

    <p>Once at least one examination is recorded, the patient detail page shows four growth charts that plot the child's measurements against reference percentile curves. The percentile lines shown are the 2nd, 5th, 50th, 95th, and 98th — computed using the LMS quantile regression method.</p>

    <p>The four charts are: body length vs. corrected age, body weight vs. corrected age, head circumference vs. corrected age, and weight for length (weight plotted against body length rather than age).</p>

    <p>The reference curves are selected automatically based on the child's gender and whether their birth weight was above or below 1500 g. The child's own data points are connected by a coloured line (blue for boys, red for girls), making it easy to see at a glance whether growth is following, crossing, or deviating from the expected percentile bands. Clicking any chart opens it in a full-screen view for closer inspection.</p>

    ${img(s.growthCharts)}

    <h3>Tabulated Data</h3>

    <p>Below the charts, a summary table lists every examination chronologically. For each visit, the table shows the date, corrected age, and for each of the three measurements (weight, length, head circumference) both the raw value and the computed <strong>percentile</strong> and <strong>SDS/Z-score</strong>. A separate column shows the weight-for-length percentile and Z-score.</p>

    <p>A Z-score of 0 corresponds to the 50th percentile. Values below −2 or above +2 indicate measurements outside the normal range and may warrant clinical attention. This tabulated view gives clinicians a concise numerical summary to complement the visual growth charts.</p>

    ${img(s.growthTable)}

    <hr />

    <h2>Reference Charts</h2>

    <p>The <strong>Charts</strong> section, accessible from the sidebar, displays the reference percentile curves without any patient data overlaid. This is useful for printing blank charts, for educational purposes, or for comparing against measurements taken outside the application.</p>

    <p>Four tabs let you switch between the reference populations: boys below 1500 g, girls below 1500 g, boys above 1500 g, and girls above 1500 g. Each tab shows full-size charts for body length, body weight, weight-for-length, and head circumference.</p>

    ${img(s.refCharts)}

    <hr />

    <h2>Doctor Profile</h2>

    <p>The <strong>Profile</strong> section lets you enter your professional details: title prefix (e.g. RNDr., MUDr.), first name, surname, title suffix (e.g. Ph.D.), and workplace. This information is displayed in the sidebar so you can confirm which account is active.</p>

    ${img(s.doctorProfile)}

    <hr />

    <h2>Backup &amp; Upgrades</h2>

    <p>The application stores data entirely on your computer. There is no cloud backup or sync — if the computer is lost, replaced, or reinstalled, the data goes with it. Two practical ways to keep a safety copy:</p>

    <h3>Manual export from the app</h3>

    <p>On the dashboard, the <strong>Export</strong> button (top right) downloads a single <code>auxology-export.json</code> file containing your complete database — patients, examinations, and parent data. Save it somewhere outside the app's storage: a shared drive, OneDrive, or an external disk. A weekly cadence is a reasonable default; do the export before any larger change (import of many patients, upgrade of the app).</p>

    <p>If something happens to your installation, email that JSON to the author and the data will be restored. The app does not yet have a self-service Import button — if this becomes important, let me know and I'll add it.</p>

    <h3>Folder-level backup (for hospital IT)</h3>

    <p>The underlying database lives in the operating system user profile:</p>

    <ul>
      <li><strong>Windows:</strong> <code>C:\\Users\\&lt;user&gt;\\AppData\\Roaming\\auxology\\IndexedDB\\</code></li>
      <li><strong>macOS:</strong> <code>~/Library/Application Support/auxology/IndexedDB/</code></li>
    </ul>

    <p>The whole <code>IndexedDB</code> folder is the complete database. Hospital IT can include this path in the standard user-profile backup (Windows Backup, roaming profiles, Time Machine, OneDrive Known Folder Move). Auxology should be closed during the backup window — the LevelDB file can be locked by a running process, which makes a backup inconsistent. A scheduled nightly backup when nobody is signed in is ideal.</p>

    <h3>Upgrading to a new version</h3>

    <p>Installing a newer release does <strong>not</strong> touch the database. The installer replaces only the application binaries in <code>/Applications/</code> (macOS) or <code>Program Files\\Auxology\\</code> (Windows); your data in the profile folder above stays intact. The new version reads the existing IndexedDB, checks the stored schema version, and runs a migration only if the structure changed between releases.</p>

    <p>Recommended upgrade routine:</p>

    <ol>
      <li>Open Auxology and click <strong>Export</strong> on the dashboard; save the JSON somewhere safe.</li>
      <li>Close Auxology.</li>
      <li>Install the new version (drag and drop the <code>.app</code> on macOS, run the <code>.exe</code> on Windows).</li>
      <li>Launch the new version and confirm the patient list is still there.</li>
      <li>If anything looks wrong, send me the JSON from step 1.</li>
    </ol>

    <p>During the <strong>uninstall</strong> of a specific version, the installer leaves the data folder in place by default. The database is only deleted by manually removing <code>~/Library/Application Support/auxology/</code> (macOS) or <code>%APPDATA%\\auxology\\</code> (Windows), or by ticking a "remove user data" option if one is presented during uninstall.</p>

    <hr />

    <h2>Additional Information</h2>

    <h3>Data and Privacy</h3>

    <p>All patient data is stored in a local IndexedDB database within your browser/Electron instance. Nothing is transmitted over the network. If you need to transfer data to another machine, use the <strong>Export</strong> function on the dashboard.</p>

    <h3>Auto-Logout</h3>

    <p>For security, the application automatically logs you out after <strong>60 minutes</strong> of inactivity. <strong>10 minutes before expiry</strong>, a yellow banner appears at the top with a countdown (e.g. &ldquo;You will be logged out in 9:42&rdquo;) and a <strong>&ldquo;Stay signed in&rdquo;</strong> button that resets the timer.</p>

    <h3>Statistical Background</h3>

    <div class="tech">
      <table>
        <tr><td>Sample size</td><td>1,781 children (846 girls, 935 boys)</td></tr>
        <tr><td>Examinations</td><td>5,676 total</td></tr>
        <tr><td>Age range</td><td>37th to 109th week of gestational age</td></tr>
        <tr><td>Institution</td><td>Centre of Comprehensive Care, KDDL VFN Prague</td></tr>
        <tr><td>Period</td><td>2001–2015</td></tr>
        <tr><td>Method</td><td>LMS quantile regression</td></tr>
        <tr><td>Percentiles</td><td>2nd, 5th, 50th, 95th, 98th</td></tr>
        <tr><td>Measures</td><td>Body length, body weight, head circumference, weight-for-length</td></tr>
        <tr><td>Weight categories</td><td>Below 1500 g / above 1500 g at birth</td></tr>
      </table>
    </div>
  </div>

  <footer>
    <p>&copy; 2016–2026 RNDr. Jiří Helmich &middot; Supported by a grant from Norway</p>
  </footer>
</body>
</html>`;

  writeFileSync(path.join(root, 'docs', 'user-guide.html'), html);
  console.log('  Written: docs/user-guide.html');
}

function generateCzechMarkdown(cs, en) {
  const img = (shot) => shot ? `\n![${shot.description}](${shot.file})\n` : '';

  const md = `# Auxologie — Uživatelská příručka

Auxologie je desktopová aplikace určená pro neonatology a pediatrické lékaře, kteří potřebují sledovat růst předčasně narozených dětí. Aplikace je postavena na českých referenčních auxologických datech — percentilových růstových grafech odvozených ze studie 1 781 nedonošených dětí (5 676 vyšetření) v Centru komplexní péče, KDDL VFN Praha, v období 2001–2015.

Všechna data jsou uložena lokálně ve vašem počítači. Aplikace neobsahuje žádnou cloudovou komponentu — funguje zcela offline. Běží na macOS i Windows.

Rozhraní je dostupné v **češtině** a **angličtině**. Mezi jazyky lze přepínat kdykoli a vaše preference se zapamatuje.

**Stáhnout:** [macOS (DMG)](${DMG_URL}) · [Windows (EXE)](${EXE_URL}) · [Všechny verze](${RELEASE_URL})

---

## Začínáme

### Vytvoření účtu

Při prvním spuštění aplikace se zobrazí přihlašovací obrazovka. Protože aplikace ukládá data lokálně, váš účet existuje pouze na vašem počítači — není sdílen s nikým.

Klikněte na **Vytvořit účet** pro nastavení uživatelského jména a hesla. Po registraci budete přesměrováni zpět na přihlašovací obrazovku.
${img(en.loginCs)}
Pro přepnutí jazyka rozhraní před přihlášením použijte přepínač **EN/CZ** v pravém horním rohu přihlašovací stránky. Uvnitř aplikace je stejný přepínač dostupný v dolní části postranního menu.

### Přehled pacientů

Po přihlášení se zobrazí přehled. Nahoře jsou **čtyři statistické karty** (počet pacientů celkem, vyšetření za 7 / 30 dní, počet pacientů vyžadujících pozornost), pod nimi prominentní **vyhledávací pole** a tabulka nedávných pacientů. Vpravo je panel **„Vyžaduje pozornost"** — pacienti, kteří nebyli vyšetřeni přes 30 dní, seřazení podle nejdéle čekajících. Pokud není koho upozorňovat, zobrazí se zelený check „Vše v pořádku".

Vyhledávání je **živé** — výsledky se ukazují s krátkou prodlevou při psaní, není potřeba klikat na tlačítko.

Vyhledávací pole rozumí čtyřem typům vstupu:

- **Jméno nebo příjmení** (s diakritikou i bez ní, např. „novak", „Nováková").
- **Rodné číslo v plném tvaru** včetně lomítka, např. \`260212/2457\`.
- **Část rodného čísla** — stačí prvních 6 číslic (datum narození zakódované v r.č.).
- **Datum narození** ve tvaru \`1.4.2025\`, \`01.04.2025\` nebo \`1. 4. 2025\` — aplikace si datum převede a najde všechny děti narozené ten den (s ohledem na +50 měsíc u dívek).

Výsledky se zobrazí v tabulce s ID, jménem, pohlavím, rodným číslem, datem narození, gestačním stářím při narození a porodní hmotností. Kliknutím na jméno pacienta přejdete na jeho detail. Kliknutím na ikonu info se otevře panel náhledu s časovou osou vyšetření.
${img(cs.dashboardPreview)}
---

## Práce s pacienty

### Registrace nového pacienta

Klikněte na **Nový pacient** pro otevření registračního formuláře. Čtyři pole jsou povinná:

1. **Rodné číslo** — české národní identifikační číslo. Aplikace automaticky vypočítá datum narození a ověří kontrolní součet. U žen je měsíc kódován s +50 dle českého standardu.
2. **Pohlaví** — Dívka nebo Chlapec.
3. **Porodní hmotnost** — v gramech. Maximum je 2500 g (práh nedonošenosti).
4. **Gestační týden při narození** — týden gestace, kdy se dítě narodilo (maximum 37).

Volitelně můžete zadat jméno dítěte, plánovaný termín porodu, porodní délku, obvod hlavy při narození a poznámky. Formulář obsahuje také oddíly pro údaje o matce a otci.
${img(cs.newPatientForm)}
### Detail pacienta

Detail pacienta je hlavní pracovní prostor pro jednotlivé dítě. Levý sloupec ukazuje **čtyři statistické boxy** s nejdůležitějšími fakty — gestační týden při porodu, porodní hmotnost, korigovaný věk a kalendářní věk. Pod nimi jsou sparkline grafy posledních hodnot a v jednom řádku akce (Nové vyšetření, Upravit, Smazat). Méně časté údaje (kalkulovaný a plánovaný termín porodu, aktuální gestační věk) jsou skryté pod tlačítkem **„Další údaje o věku a termínu"**.

Pravý sloupec ukazuje **historii vyšetření** jako kompaktní timeline — každé vyšetření jako jeden řádek s datem, korigovaným věkem a třemi naměřenými hodnotami. Edit/smazat ikony se objeví při najetí myší.

Karta s **údaji o rodičích** se zobrazí jen tehdy, když má alespoň jeden z nich vyplněná data; standardně je sklopená a uvnitř se nezobrazují prázdná pole.
${img(cs.patientGrowth)}
---

## Sledování růstu v čase

Hlavním účelem aplikace Auxologie je sledovat, jak předčasně narozené dítě roste ve srovnání s referenčními daty. To se provádí zaznamenáváním vyšetření při každé klinické návštěvě a prohlížením výsledných grafů a statistik.

### Záznam vyšetření

Na stránce detailu pacienta klikněte na **Nové vyšetření**. Formulář požaduje datum vyšetření, délku těla a obvod hlavy v centimetrech (s desetinnou čárkou nebo tečkou), hmotnost v gramech a volitelné poznámky.

Vedle každého vstupního pole se zobrazuje **subtilní hint** s poslední naměřenou hodnotou (např. „naposledy 52.0 cm"). Pokud ještě žádné vyšetření neexistuje, ukáže se porodní hodnota. Klávesa **Enter** ve formuláři neodesílá — mezi poli se přechází tabulátorem a pro uložení slouží tlačítko vpravo dole.

**Živý náhled** pod formulářem ukazuje čtyři růstové grafy, které se aktualizují s každým úhozem klávesy. Doktor okamžitě vidí, kde nová hodnota padne v percentilových pásmech, ještě před uložením.

Pokud existuje předchozí vyšetření, jeho hodnoty se zobrazí nad vstupními poli pro rychlou referenci.
${img(cs.examFilled)}
### Růstové grafy

Po zaznamenání alespoň jednoho vyšetření se na stránce detailu pacienta zobrazí čtyři růstové grafy, které vykreslují měření dítěte proti referenčním percentilovým křivkám. Zobrazené percentilové linie jsou 2., 5., 50., 95. a 98. — vypočtené pomocí metody kvantilové regrese LMS.

Čtyři grafy jsou:

- **Délka těla** vs. korigovaný věk
- **Hmotnost** vs. korigovaný věk
- **Obvod hlavy** vs. korigovaný věk
- **Hmotnost k délce** (hmotnost vynesená proti délce těla místo věku)

Referenční křivky jsou vybrány automaticky na základě pohlaví dítěte a zda jeho porodní hmotnost byla nad nebo pod 1500 g. Datové body dítěte jsou spojeny barevnou linií (modrá pro chlapce, červená pro dívky).
${img(cs.growthCharts)}
### Tabulková data

Pod grafy je souhrnná tabulka se všemi vyšetřeními v chronologickém pořadí. Pro každou návštěvu tabulka ukazuje datum, korigovaný věk a pro každé ze tří měření (hmotnost, délka, obvod hlavy) jak naměřenou hodnotu, tak vypočtený **percentil** a **SDS/Z-skóre**. Samostatný sloupec ukazuje percentil a Z-skóre hmotnosti k délce.

Z-skóre 0 odpovídá 50. percentilu. Hodnoty pod −2 nebo nad +2 indikují měření mimo normální rozsah a mohou vyžadovat klinickou pozornost.
${img(cs.growthTable)}
---

## Referenční grafy

Sekce **Grafy**, přístupná z postranního menu, zobrazuje referenční percentilové křivky bez překrytí daty pacienta. To je užitečné pro tisk prázdných grafů, pro vzdělávací účely nebo pro porovnání s měřeními provedenými mimo aplikaci.

Čtyři záložky umožňují přepínat mezi referenčními populacemi:

- Chlapci s porodní hmotností pod 1500 g
- Dívky s porodní hmotností pod 1500 g
- Chlapci s porodní hmotností nad 1500 g
- Dívky s porodní hmotností nad 1500 g
${img(cs.refCharts)}
---

## Profil lékaře

Sekce **Profil** umožňuje zadat vaše profesní údaje: titul před jménem (např. RNDr., MUDr.), jméno, příjmení, titul za jménem (např. Ph.D.) a pracoviště. Tyto informace se zobrazují v postranním menu.
${img(cs.doctorProfile)}
---

## Zálohování a aktualizace

Aplikace ukládá data výhradně na vašem počítači. Neexistuje cloudová záloha ani synchronizace — pokud se počítač ztratí, rozbije nebo přeinstaluje, mizí s ním i data. Dva praktické způsoby, jak mít bezpečnostní kopii:

### Ruční export z aplikace

Na úvodní obrazovce je vpravo nahoře tlačítko **Export**. Klepnutím se stáhne soubor \`auxology-export.json\` s kompletní databází — pacienti, vyšetření, údaje o rodičích. Uložte ho někam mimo aplikaci: sdílený disk, OneDrive, externí disk. Týdenní rytmus je rozumné minimum; export určitě udělejte před větší změnou (import více pacientů, aktualizace aplikace).

Pokud by se cokoli stalo s vaší instalací, pošlete mi ten JSON e-mailem a data obnovíme. Aplikace zatím nemá tlačítko **Import** pro svépomocnou obnovu — pokud to bude potřeba, napište mi a doplním ho.

### Zálohování celé složky (pro IT nemocnice)

Databáze leží v uživatelském profilu operačního systému:

- **Windows:** \`C:\\Users\\<uživatel>\\AppData\\Roaming\\auxology\\IndexedDB\\\`
- **macOS:** \`~/Library/Application Support/auxology/IndexedDB/\`

Celá složka \`IndexedDB\` je kompletní databáze. IT oddělení může tuto cestu zahrnout do standardní zálohy uživatelských profilů (Windows Backup, roaming profily, Time Machine, OneDrive Known Folder Move). V okamžiku zálohy by aplikace měla být zavřená — soubor LevelDB může být uzamčen běžící aplikací a záloha by pak byla nekonzistentní. Ideální je plánovaná noční záloha mimo pracovní dobu.

### Aktualizace na novou verzi

Instalace novější verze se **nedotkne** databáze. Instalátor nahrazuje jen binárky aplikace v \`/Applications/\` (macOS) nebo \`Program Files\\Auxology\\\` (Windows); vaše data v uvedené profilové složce zůstanou beze změny. Nová verze otevře existující IndexedDB, ověří uložené číslo verze schématu a migraci spustí jen tehdy, když se struktura mezi verzemi změnila.

Doporučený postup aktualizace:

1. Otevřít Auxology a kliknout **Export** na úvodní stránce; uložit JSON někam bokem.
2. Zavřít Auxology.
3. Nainstalovat novou verzi (drag-and-drop \`.app\` na macOS, spustit \`.exe\` na Windows).
4. Spustit novou verzi a ověřit, že je seznam pacientů pořád vidět.
5. Kdyby cokoli nesedělo, pošlete mi JSON uložený v kroku 1.

Při **odinstalaci** konkrétní verze instalátor defaultně datovou složku ponechá. Databáze se smaže až ručním odstraněním \`~/Library/Application Support/auxology/\` (macOS) nebo \`%APPDATA%\\auxology\\\` (Windows), případně zaškrtnutím volby „odstranit uživatelská data", pokud je při odinstalaci nabídnuta.

---

## Další informace

### Data a soukromí

Všechna data pacientů jsou uložena v lokální databázi IndexedDB ve vaší instanci prohlížeče/Electronu. Nic se nepřenáší po síti. Pokud potřebujete přenést data na jiný počítač, použijte funkci **Export** na přehledu pacientů.

### Automatické odhlášení

Z bezpečnostních důvodů vás aplikace automaticky odhlásí po **60 minutách** nečinnosti. **10 minut před vypršením** se v horní části aplikace objeví žlutý pruh s odpočtem (např. „Pro nečinnost budete za 9:42 odhlášeni") a tlačítkem **„Zůstat přihlášen"**, kterým se odpočet zruší.

### Statistické pozadí

Referenční data jsou založena na longitudinální studii nedonošených dětí v České republice:

| | |
|---|---|
| **Velikost vzorku** | 1 781 dětí (846 dívek, 935 chlapců) |
| **Vyšetření** | 5 676 celkem |
| **Věkový rozsah** | 37. až 109. týden gestačního stáří |
| **Instituce** | Centrum komplexní péče, KDDL VFN Praha |
| **Období** | 2001–2015 |
| **Metoda** | Kvantilová regrese LMS |
| **Percentily** | 2., 5., 50., 95., 98. |
| **Měření** | Délka těla, hmotnost, obvod hlavy, hmotnost k délce |
| **Hmotnostní kategorie** | Pod 1500 g / nad 1500 g při narození |
`;

  writeFileSync(path.join(root, 'docs', 'user-guide-cs.md'), md);
  console.log('  Written: docs/user-guide-cs.md');
}

function generateCzechHTML(cs, en) {
  const img = (shot) => shot ? `
      <figure>
        <img src="${shot.file}" alt="${shot.description}" loading="lazy" />
        <figcaption>${shot.description}</figcaption>
      </figure>` : '';

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auxologie — Uživatelská příručka</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.75; font-size: 16px; }
    .hero { background: linear-gradient(135deg, #2f4050 0%, #1c84c6 100%); color: white; padding: 5rem 2rem; text-align: center; }
    .hero h1 { font-size: 2.8rem; margin-bottom: 0.75rem; font-weight: 700; }
    .hero p { font-size: 1.15rem; opacity: 0.9; max-width: 550px; margin: 0 auto; }
    .lang-switch { position: absolute; top: 1.5rem; right: 2rem; }
    .lang-switch a { color: white; text-decoration: none; opacity: 0.8; font-size: 0.9rem; padding: 0.4rem 0.8rem; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; }
    .lang-switch a:hover { opacity: 1; background: rgba(255,255,255,0.1); }
    .container { max-width: 780px; margin: 0 auto; padding: 3rem 2rem; }
    h2 { color: #2f4050; margin: 3rem 0 1.25rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; font-size: 1.5rem; }
    h3 { color: #1c84c6; margin: 2rem 0 0.75rem; font-size: 1.2rem; }
    p { margin-bottom: 1rem; }
    ul, ol { padding-left: 1.75rem; margin-bottom: 1.25rem; }
    li { margin-bottom: 0.5rem; }
    strong { color: #2f4050; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 3rem 0; }
    figure { margin: 2rem 0; border: 1px solid #e2e5e9; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    figure img { width: 100%; display: block; }
    figcaption { padding: 0.6rem 1rem; background: #f8fafc; font-size: 0.85rem; color: #6b7280; text-align: center; border-top: 1px solid #e2e5e9; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0 1.5rem; font-size: 0.95rem; }
    th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
    th { font-weight: 600; color: #2f4050; background: #f8fafc; }
    .tech table td:first-child { font-weight: 600; white-space: nowrap; width: 180px; color: #2f4050; }
    footer { text-align: center; padding: 2.5rem; color: #9ca3af; font-size: 0.85rem; border-top: 1px solid #e5e7eb; margin-top: 3rem; }
  </style>
</head>
<body>
  <div class="hero" style="position: relative;">
    <div class="lang-switch"><a href="user-guide.html">English</a></div>
    <img src="../public/img/login-hero.png" alt="" aria-hidden="true" style="width: 140px; height: 140px; margin: 0 auto 1.25rem; display: block; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));" />
    <h1>Auxologie</h1>
    <p>Uživatelská příručka</p>
  </div>

  <div class="container">
    <p>Auxologie je desktopová aplikace určená pro neonatology a pediatrické lékaře, kteří potřebují sledovat růst předčasně narozených dětí. Aplikace je postavena na českých referenčních auxologických datech — percentilových růstových grafech odvozených ze studie 1 781 nedonošených dětí (5 676 vyšetření) v Centru komplexní péče, KDDL VFN Praha, v období 2001–2015.</p>

    <p>Všechna data jsou uložena lokálně ve vašem počítači. Aplikace neobsahuje žádnou cloudovou komponentu — funguje zcela offline. Běží na macOS i Windows.</p>

    <p>Rozhraní je dostupné v <strong>češtině</strong> a <strong>angličtině</strong>. Mezi jazyky lze přepínat kdykoli a vaše preference se zapamatuje.</p>

    <p class="download-links"><strong>Stáhnout:</strong> <a href="${DMG_URL}">macOS (DMG)</a> · <a href="${EXE_URL}">Windows (EXE)</a> · <a href="${RELEASE_URL}">Všechny verze</a></p>

    <hr />

    <h2>Začínáme</h2>

    <h3>Vytvoření účtu</h3>

    <p>Při prvním spuštění aplikace se zobrazí přihlašovací obrazovka. Protože aplikace ukládá data lokálně, váš účet existuje pouze na vašem počítači — není sdílen s nikým.</p>

    <p>Klikněte na <strong>Vytvořit účet</strong> pro nastavení uživatelského jména a hesla. Po registraci budete přesměrováni zpět na přihlašovací obrazovku.</p>

    ${img(en.loginCs)}

    <p>Pro přepnutí jazyka rozhraní před přihlášením použijte přepínač <strong>EN/CZ</strong> v pravém horním rohu přihlašovací stránky. Uvnitř aplikace je stejný přepínač dostupný v dolní části postranního menu.</p>

    <h3>Přehled pacientů</h3>

    <p>Po přihlášení se zobrazí přehled. Nahoře jsou <strong>čtyři statistické karty</strong> (počet pacientů celkem, vyšetření za 7 / 30 dní, počet pacientů vyžadujících pozornost), pod nimi prominentní <strong>vyhledávací pole</strong> a tabulka nedávných pacientů. Vpravo je panel <strong>&bdquo;Vyžaduje pozornost&ldquo;</strong> &mdash; pacienti, kteří nebyli vyšetřeni přes 30 dní, seřazení podle nejdéle čekajících. Pokud není koho upozorňovat, zobrazí se zelený check &bdquo;Vše v pořádku&ldquo;.</p>

    <p>Vyhledávání je <strong>živé</strong> &mdash; výsledky se ukazují s krátkou prodlevou při psaní, není potřeba klikat na tlačítko.</p>

    <p>Vyhledávací pole rozumí čtyřem typům vstupu:</p>
    <ul>
      <li><strong>Jméno nebo příjmení</strong> (s diakritikou i bez ní, např. &bdquo;novak&ldquo;, &bdquo;Nov&aacute;kov&aacute;&ldquo;).</li>
      <li><strong>Rodné číslo v plném tvaru</strong> včetně lomítka, např. <code>260212/2457</code>.</li>
      <li><strong>Část rodného čísla</strong> &mdash; stačí prvních 6 číslic (datum narození zakódované v r.č.).</li>
      <li><strong>Datum narození</strong> ve tvaru <code>1.4.2025</code>, <code>01.04.2025</code> nebo <code>1. 4. 2025</code> &mdash; aplikace si datum převede a najde všechny děti narozené ten den (s ohledem na +50 měsíc u dívek).</li>
    </ul>
    <p>Výsledky se zobrazí v tabulce s ID, jménem, pohlavím, rodným číslem, datem narození, gestačním stářím při narození a porodní hmotností.</p>

    ${img(cs.dashboardPreview)}

    <hr />

    <h2>Práce s pacienty</h2>

    <h3>Registrace nového pacienta</h3>

    <p>Klikněte na <strong>Nový pacient</strong> pro otevření registračního formuláře. Čtyři pole jsou povinná:</p>

    <ol>
      <li><strong>Rodné číslo</strong> — české národní identifikační číslo. Aplikace automaticky vypočítá datum narození a ověří kontrolní součet.</li>
      <li><strong>Pohlaví</strong> — Dívka nebo Chlapec.</li>
      <li><strong>Porodní hmotnost</strong> — v gramech. Maximum je 2500 g.</li>
      <li><strong>Gestační týden při narození</strong> — týden gestace (maximum 37).</li>
    </ol>

    <p>Volitelně můžete zadat jméno dítěte, plánovaný termín porodu, porodní délku, obvod hlavy při narození a poznámky. Formulář obsahuje také oddíly pro údaje o matce a otci.</p>

    ${img(cs.newPatientForm)}

    <h3>Detail pacienta</h3>

    <p>Detail pacienta je hlavní pracovní prostor pro jednotlivé dítě. Levý sloupec ukazuje <strong>čtyři statistické boxy</strong> s nejdůležitějšími fakty &mdash; gestační týden při porodu, porodní hmotnost, korigovaný věk a kalendářní věk. Pod nimi jsou sparkline grafy posledních hodnot a v jednom řádku akce (Nové vyšetření, Upravit, Smazat). Méně časté údaje (kalkulovaný a plánovaný termín porodu, aktuální gestační věk) jsou skryté pod tlačítkem <strong>&bdquo;Další údaje o věku a termínu&ldquo;</strong>.</p>

    <p>Pravý sloupec ukazuje <strong>historii vyšetření</strong> jako kompaktní timeline &mdash; každé vyšetření jako jeden řádek s datem, korigovaným věkem a třemi naměřenými hodnotami. Edit/smazat ikony se objeví při najetí myší.</p>

    <p>Karta s <strong>údaji o rodičích</strong> se zobrazí jen tehdy, když má alespoň jeden z nich vyplněná data; standardně je sklopená a uvnitř se nezobrazují prázdná pole.</p>

    ${img(cs.patientGrowth)}

    <hr />

    <h2>Sledování růstu v čase</h2>

    <p>Hlavním účelem aplikace Auxologie je sledovat, jak předčasně narozené dítě roste ve srovnání s referenčními daty.</p>

    <h3>Záznam vyšetření</h3>

    <p>Na stránce detailu pacienta klikněte na <strong>Nové vyšetření</strong>. Formulář požaduje datum vyšetření, délku těla a obvod hlavy v centimetrech (s desetinnou čárkou nebo tečkou), hmotnost v gramech a volitelné poznámky.</p>

    <p>Vedle každého vstupního pole se zobrazuje <strong>subtilní hint</strong> s poslední naměřenou hodnotou (např. &bdquo;naposledy 52.0 cm&ldquo;). Pokud ještě žádné vyšetření neexistuje, ukáže se porodní hodnota. Klávesa <strong>Enter</strong> ve formuláři neodesílá &mdash; mezi poli se přechází tabulátorem a pro uložení slouží tlačítko vpravo dole.</p>

    <p><strong>Živý náhled</strong> pod formulářem ukazuje čtyři růstové grafy, které se aktualizují s každým úhozem klávesy. Doktor okamžitě vidí, kde nová hodnota padne v percentilových pásmech, ještě před uložením.</p>

    ${img(cs.examFilled)}

    <h3>Růstové grafy</h3>

    <p>Po zaznamenání alespoň jednoho vyšetření se zobrazí čtyři růstové grafy vykreslující měření dítěte proti referenčním percentilovým křivkám. Zobrazené percentilové linie jsou 2., 5., 50., 95. a 98. — vypočtené pomocí metody kvantilové regrese LMS.</p>

    <p>Čtyři grafy jsou: délka těla vs. korigovaný věk, hmotnost vs. korigovaný věk, obvod hlavy vs. korigovaný věk a hmotnost k délce.</p>

    <p>Referenční křivky jsou vybrány automaticky na základě pohlaví dítěte a zda jeho porodní hmotnost byla nad nebo pod 1500 g. Datové body dítěte jsou spojeny barevnou linií (modrá pro chlapce, červená pro dívky).</p>

    ${img(cs.growthCharts)}

    <h3>Tabulková data</h3>

    <p>Pod grafy je souhrnná tabulka se všemi vyšetřeními. Pro každou návštěvu tabulka ukazuje datum, korigovaný věk a pro každé měření naměřenou hodnotu, <strong>percentil</strong> a <strong>SDS/Z-skóre</strong>.</p>

    <p>Z-skóre 0 odpovídá 50. percentilu. Hodnoty pod −2 nebo nad +2 indikují měření mimo normální rozsah a mohou vyžadovat klinickou pozornost.</p>

    ${img(cs.growthTable)}

    <hr />

    <h2>Referenční grafy</h2>

    <p>Sekce <strong>Grafy</strong>, přístupná z postranního menu, zobrazuje referenční percentilové křivky bez překrytí daty pacienta.</p>

    <p>Čtyři záložky umožňují přepínat mezi referenčními populacemi: chlapci pod 1500 g, dívky pod 1500 g, chlapci nad 1500 g a dívky nad 1500 g.</p>

    ${img(cs.refCharts)}

    <hr />

    <h2>Profil lékaře</h2>

    <p>Sekce <strong>Profil</strong> umožňuje zadat vaše profesní údaje: titul před jménem, jméno, příjmení, titul za jménem a pracoviště.</p>

    ${img(cs.doctorProfile)}

    <hr />

    <h2>Zálohování a aktualizace</h2>

    <p>Aplikace ukládá data výhradně na vašem počítači. Neexistuje cloudová záloha ani synchronizace — pokud se počítač ztratí, rozbije nebo přeinstaluje, mizí s ním i data. Dva praktické způsoby, jak mít bezpečnostní kopii:</p>

    <h3>Ruční export z aplikace</h3>

    <p>Na úvodní obrazovce je vpravo nahoře tlačítko <strong>Export</strong>. Klepnutím se stáhne soubor <code>auxology-export.json</code> s kompletní databází — pacienti, vyšetření, údaje o rodičích. Uložte ho někam mimo aplikaci: sdílený disk, OneDrive, externí disk. Týdenní rytmus je rozumné minimum; export určitě udělejte před větší změnou (import více pacientů, aktualizace aplikace).</p>

    <p>Pokud by se cokoli stalo s vaší instalací, pošlete mi ten JSON e-mailem a data obnovíme. Aplikace zatím nemá tlačítko <strong>Import</strong> pro svépomocnou obnovu — pokud to bude potřeba, napište mi a doplním ho.</p>

    <h3>Zálohování celé složky (pro IT nemocnice)</h3>

    <p>Databáze leží v uživatelském profilu operačního systému:</p>

    <ul>
      <li><strong>Windows:</strong> <code>C:\\Users\\&lt;uživatel&gt;\\AppData\\Roaming\\auxology\\IndexedDB\\</code></li>
      <li><strong>macOS:</strong> <code>~/Library/Application Support/auxology/IndexedDB/</code></li>
    </ul>

    <p>Celá složka <code>IndexedDB</code> je kompletní databáze. IT oddělení může tuto cestu zahrnout do standardní zálohy uživatelských profilů (Windows Backup, roaming profily, Time Machine, OneDrive Known Folder Move). V okamžiku zálohy by aplikace měla být zavřená — soubor LevelDB může být uzamčen běžící aplikací a záloha by pak byla nekonzistentní. Ideální je plánovaná noční záloha mimo pracovní dobu.</p>

    <h3>Aktualizace na novou verzi</h3>

    <p>Instalace novější verze se <strong>nedotkne</strong> databáze. Instalátor nahrazuje jen binárky aplikace v <code>/Applications/</code> (macOS) nebo <code>Program Files\\Auxology\\</code> (Windows); vaše data v uvedené profilové složce zůstanou beze změny. Nová verze otevře existující IndexedDB, ověří uložené číslo verze schématu a migraci spustí jen tehdy, když se struktura mezi verzemi změnila.</p>

    <p>Doporučený postup aktualizace:</p>

    <ol>
      <li>Otevřít Auxology a kliknout <strong>Export</strong> na úvodní stránce; uložit JSON někam bokem.</li>
      <li>Zavřít Auxology.</li>
      <li>Nainstalovat novou verzi (drag-and-drop <code>.app</code> na macOS, spustit <code>.exe</code> na Windows).</li>
      <li>Spustit novou verzi a ověřit, že je seznam pacientů pořád vidět.</li>
      <li>Kdyby cokoli nesedělo, pošlete mi JSON uložený v kroku 1.</li>
    </ol>

    <p>Při <strong>odinstalaci</strong> konkrétní verze instalátor defaultně datovou složku ponechá. Databáze se smaže až ručním odstraněním <code>~/Library/Application Support/auxology/</code> (macOS) nebo <code>%APPDATA%\\auxology\\</code> (Windows), případně zaškrtnutím volby „odstranit uživatelská data", pokud je při odinstalaci nabídnuta.</p>

    <hr />

    <h2>Další informace</h2>

    <h3>Data a soukromí</h3>

    <p>Všechna data pacientů jsou uložena v lokální databázi IndexedDB. Nic se nepřenáší po síti. Pro přenos dat na jiný počítač použijte funkci <strong>Export</strong>.</p>

    <h3>Automatické odhlášení</h3>

    <p>Z bezpečnostních důvodů vás aplikace automaticky odhlásí po <strong>60 minutách</strong> nečinnosti. <strong>10 minut před vypršením</strong> se v horní části aplikace objeví žlutý pruh s odpočtem (např. &bdquo;Pro nečinnost budete za 9:42 odhlášeni&ldquo;) a tlačítkem <strong>&bdquo;Zůstat přihlášen&ldquo;</strong>, kterým se odpočet zruší.</p>

    <h3>Statistické pozadí</h3>

    <div class="tech">
      <table>
        <tr><td>Velikost vzorku</td><td>1 781 dětí (846 dívek, 935 chlapců)</td></tr>
        <tr><td>Vyšetření</td><td>5 676 celkem</td></tr>
        <tr><td>Věkový rozsah</td><td>37. až 109. týden gestačního stáří</td></tr>
        <tr><td>Instituce</td><td>Centrum komplexní péče, KDDL VFN Praha</td></tr>
        <tr><td>Období</td><td>2001–2015</td></tr>
        <tr><td>Metoda</td><td>Kvantilová regrese LMS</td></tr>
        <tr><td>Percentily</td><td>2., 5., 50., 95., 98.</td></tr>
        <tr><td>Měření</td><td>Délka těla, hmotnost, obvod hlavy, hmotnost k délce</td></tr>
        <tr><td>Hmotnostní kategorie</td><td>Pod 1500 g / nad 1500 g při narození</td></tr>
      </table>
    </div>
  </div>

  <footer>
    <p>&copy; 2016–2026 RNDr. Jiří Helmich &middot; Podpořeno grantem z Norska</p>
  </footer>
</body>
</html>`;

  writeFileSync(path.join(root, 'docs', 'user-guide-cs.html'), html);
  console.log('  Written: docs/user-guide-cs.html');
}

function generateIndexHTML() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auxology — Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f7fa; }
    .card { text-align: center; max-width: 420px; padding: 3rem 2rem; }
    h1 { font-size: 2.5rem; color: #2f4050; margin-bottom: 0.5rem; }
    p { color: #6b7280; margin-bottom: 2rem; line-height: 1.6; }
    .links { display: flex; gap: 1rem; justify-content: center; }
    a { display: inline-block; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: transform 0.15s, box-shadow 0.15s; }
    a:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .en { background: #1c84c6; color: white; }
    .cs { background: #2f4050; color: white; }
    .sub { margin-top: 1.5rem; font-size: 0.85rem; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Auxology</h1>
    <p>Growth monitoring for prematurely born children<br>Sledování růstu předčasně narozených dětí</p>
    <div class="links">
      <a href="user-guide.html" class="en">English</a>
      <a href="user-guide-cs.html" class="cs">Česky</a>
    </div>
    <p class="sub">&copy; 2016–2026 RNDr. Jiří Helmich</p>
  </div>
</body>
</html>`;

  writeFileSync(path.join(root, 'docs', 'index.html'), html);
  console.log('  Written: docs/index.html');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
