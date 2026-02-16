const fs = require('fs');
const path = require('path');
const os = require('os');

// Unified Path Logic
// If running in pkg (production exe), use the executable's directory.
// If running in dev (node), use C:\TargetStorage\config for testing.

let CONFIG_DIR;

if (process.pkg) {
    // We are inside the EXE. Config should be next to the EXE.
    CONFIG_DIR = path.dirname(process.execPath);
} else {
    // Dev mode
    CONFIG_DIR = 'C:\\TargetStorage\\config';
}

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Ensure directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    try {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    } catch (e) {
        console.error('Failed to create config dir', e);
    }
}

const DEFAULTS = {
    agentPort: 3002,
    storagePath: 'C:\\TargetStorage',
    serverId: 'Server-01'
};

function load() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const data = JSON.parse(raw);
            return { ...DEFAULTS, ...data };
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return DEFAULTS;
}

function save(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
}

module.exports = {
    load,
    save,
    getConfigPath: () => CONFIG_FILE,
    getDefaults: () => DEFAULTS
};
