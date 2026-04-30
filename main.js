'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');

const iconPath = path.join(
    __dirname,
    'public',
    'img',
    process.platform === 'win32' ? 'favicon.ico' : 'icon.png'
);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'Auxology',
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
