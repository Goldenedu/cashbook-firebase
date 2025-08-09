const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'icon.png'), // Add your app icon
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Don't show until ready
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  // Create application menu
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'CashBook',
      submenu: [
        {
          label: 'About CashBook',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // Handle preferences
            mainWindow.webContents.send('open-preferences');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Entry',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-entry');
          }
        },
        {
          label: 'Import CSV',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('import-csv');
          }
        },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('export-data');
          }
        },
        { type: 'separator' },
        {
          label: 'Sync with Firebase',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('sync-firebase');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('navigate-to', 'dashboard');
          }
        },
        {
          label: 'Cash Book',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('navigate-to', 'cash');
          }
        },
        {
          label: 'Bank Book',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('navigate-to', 'bank');
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template[0].label = app.getName();
    template[0].submenu.unshift({
      label: 'About ' + app.getName(),
      role: 'about'
    });
    
    // Window menu
    template[3].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Zoom',
        role: 'zoom'
      },
      { type: 'separator' },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for communication with renderer process
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('platform', () => {
  return process.platform;
});

// Handle app updates (if you implement auto-updater)
ipcMain.handle('check-for-updates', () => {
  // Implement update checking logic here
  return { hasUpdate: false };
});
