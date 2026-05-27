'use strict';
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const iconPath = path.join(
    __dirname,
    'public',
    'img',
    process.platform === 'win32' ? 'favicon.ico' : 'icon.png'
);

// Migration: 3.x (Auxology) → 4.0 (ImaGrow) renamed the userData folder.
// On first launch, copy the legacy "Auxology" data into the new "ImaGrow"
// location so existing users do not lose their database.
function migrateLegacyUserData() {
    try {
        const newPath = app.getPath('userData'); // .../ImaGrow
        // Replace last segment "ImaGrow" with "Auxology" to find old data
        const parent = path.dirname(newPath);
        const oldPath = path.join(parent, 'Auxology');

        if (fs.existsSync(newPath) || !fs.existsSync(oldPath)) return;

        console.log('[migrate] Copying legacy userData from', oldPath, '→', newPath);
        fs.cpSync(oldPath, newPath, { recursive: true, errorOnExist: false });
        console.log('[migrate] Done. Legacy folder kept as backup.');
    } catch (err) {
        console.error('[migrate] Failed to migrate legacy userData:', err);
        dialog.showErrorBox(
            'Data migration failed',
            'ImaGrow could not migrate your previous Auxology data automatically.\n' +
            'Please contact the author (jiri@helmich.cz) with the error details below before continuing.\n\n' +
            String(err)
        );
    }
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'ImaGrow',
        icon: iconPath,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            acceptFirstMouse: true
        }
    });
    mainWindow.maximize();
    mainWindow.loadFile(path.join(__dirname, 'dist-renderer', 'index.html'));
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    migrateLegacyUserData();

    if (process.platform === 'darwin' && app.dock && typeof app.dock.setIcon === 'function') {
        try { app.dock.setIcon(iconPath); } catch { /* dev-only nicety */ }
    }
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
