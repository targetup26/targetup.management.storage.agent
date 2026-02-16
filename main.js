const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const server = require('./server');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 650,
        frame: false, // Custom frame
        transparent: true, // Transparent background for rounded corners
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // Load monitoring UI
    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Enable auto-launch on startup
    app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: [
            '--process-start-args', `"--hidden"` // Optional: start hidden if desired, but user wants to see it
        ]
    });

    createWindow();

    // Start HTTP server
    server.start();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Restart handler from Settings UI
ipcMain.on('restart-agent', () => {
    app.relaunch();
    app.exit(0);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        server.stop();
        app.quit();
    }
});
