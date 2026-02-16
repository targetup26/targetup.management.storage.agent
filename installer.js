const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const crypto = require('crypto');
// const axios = require('axios'); // Removed to avoid pkg bundling issues

// --- Configuration ---
const APP_NAME = 'TargetStorage';
const SERVICE_NAME = 'TargetStorageAgent';
const INSTALL_DIR = `C:\\Program Files\\${APP_NAME}`;
let DATA_DIR = `D:\\${APP_NAME}`;
const PORT = 3002;

// --- Logger ---
function log(msg, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${msg}`);
}

function fail(msg) {
    log(msg, 'ERROR');
    console.error('\n❌ INSTALLATION FAILED. Press any key to exit.');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 1));
}

// --- Steps ---

async function main() {
    console.log(`
    ==================================================
       🚀 TargetStorageAgent V2 - Enterprise Installer
    ==================================================
    `);

    // 1. Preflight
    log('Step 1/8: Preflight Checks...');
    try {
        execSync('net session', { stdio: 'ignore' }); // Check Admin
        log('Running as Administrator: OK');
    } catch {
        return fail('You must run this installer as Administrator.');
    }

    if (process.platform !== 'win32') {
        return fail('This installer is for Windows Server only.');
    }

    // 2. Legacy Cleanup
    log('Step 2/8: Cleaning up legacy agents...');
    try {
        // Stop/Delete New Service Name
        try { execSync(`sc stop ${SERVICE_NAME}`, { stdio: 'ignore' }); } catch { }
        try { execSync(`sc delete ${SERVICE_NAME}`, { stdio: 'ignore' }); } catch { }

        // Stop/Delete Old Service Name
        try { execSync(`sc stop "TargetStorage Agent"`, { stdio: 'ignore' }); } catch { }
        try { execSync(`sc delete "TargetStorage Agent"`, { stdio: 'ignore' }); } catch { }

        // Kill any stray node processes running the agent
        try { execSync('taskkill /f /im TargetStorageAgent.exe', { stdio: 'ignore' }); } catch { }

        log('Legacy services removed.');

        // Wait for handles to release
        await new Promise(r => setTimeout(r, 3000));

        // Nuke App Dir (Preserve Data Dir!)
        if (fs.existsSync(INSTALL_DIR)) {
            fs.rmSync(INSTALL_DIR, { recursive: true, force: true });
            log(`Cleaned ${INSTALL_DIR}`);
        }
    } catch (err) {
        log(`Cleanup warning: ${err.message}`, 'WARN');
    }

    // 3. Directory Setup
    log('Step 3/8: Setting up directories...');
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
    fs.mkdirSync(path.join(INSTALL_DIR, 'logs'), { recursive: true });

    // Path Discovery: Check for arguments or legacy data path
    const args = process.argv.slice(2);
    const pathArg = args.find(arg => arg.startsWith('--path='));

    let storageRoot;
    if (pathArg) {
        storageRoot = pathArg.split('=')[1].replace(/"/g, ''); // Remove quotes if present
        log(`User specified custom path: ${storageRoot}`);
    } else {
        const LEGACY_PATH = 'C:\\TargetStorage';
        if (fs.existsSync(LEGACY_PATH)) {
            const files = fs.readdirSync(LEGACY_PATH);
            if (files.length > 0) {
                log(`Found legacy data at ${LEGACY_PATH}. Preserving alignment.`);
                storageRoot = LEGACY_PATH;
            }
        }

        if (!storageRoot) {
            storageRoot = DATA_DIR; // Default to D:\TargetStorage
        }
    }

    if (!fs.existsSync(storageRoot)) {
        try {
            fs.mkdirSync(storageRoot, { recursive: true });
            log(`Created Data Root: ${storageRoot}`);
            // Create Subfolders
            ['HR', 'IT', 'EMPLOYEES'].forEach(sub => fs.mkdirSync(path.join(storageRoot, sub), { recursive: true }));
        } catch (dirErr) {
            return fail(`Failed to create storage directory ${storageRoot}: ${dirErr.message}`);
        }
    } else {
        log(`Using Data Root: ${storageRoot}`);
    }
    DATA_DIR = storageRoot; // Update DATA_DIR to reflect the chosen storage root

    // 4. Extract Assets
    // We assume the assets are bundled in the pkg snapshot
    log('Step 4/8: Extracting binaries...');
    try {
        // In pkg, assets can be read from path.join(__dirname, 'assets')
        // We need to copy them to INSTALL_DIR

        // Copy Agent
        fs.copyFileSync(path.join(__dirname, 'assets', 'TargetStorageAgent.exe'), path.join(INSTALL_DIR, 'TargetStorageAgent.exe'));
        // Copy NSSM
        fs.copyFileSync(path.join(__dirname, 'assets', 'nssm.exe'), path.join(INSTALL_DIR, 'nssm.exe'));

        log('Binaries extracted.');
    } catch (err) {
        return fail(`Failed to extract assets: ${err.message}`);
    }

    // 5. Config Generation
    log('Step 5/8: Generating Configuration...');
    const configPath = path.join(INSTALL_DIR, 'config.json');
    const config = {
        nodeId: crypto.randomUUID(),
        // CRITICAL: Synchronized with Backend Master Secret to allow Auth
        jwtSecret: 'targetup2025@!$$5hgrg642365423rjtgfDFGWdfiu34ui5n@$dfuh23j4t2nrkead6gfg',
        storagePath: DATA_DIR,
        agentPort: PORT
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log('Config generated.');

    // 6. Service Registration (NSSM)
    log('Step 6/8: Registering Windows Service...');
    const nssm = path.join(INSTALL_DIR, 'nssm.exe');
    const agentExe = path.join(INSTALL_DIR, 'TargetStorageAgent.exe');
    const logsDir = path.join(INSTALL_DIR, 'logs');

    try {
        execSync(`"${nssm}" install ${SERVICE_NAME} "${agentExe}"`);
        execSync(`"${nssm}" set ${SERVICE_NAME} AppDirectory "${INSTALL_DIR}"`);
        execSync(`"${nssm}" set ${SERVICE_NAME} Start SERVICE_AUTO_START`);
        execSync(`"${nssm}" set ${SERVICE_NAME} AppExit Default Restart`);
        execSync(`"${nssm}" set ${SERVICE_NAME} AppStdout "${path.join(logsDir, 'service.log')}"`);
        execSync(`"${nssm}" set ${SERVICE_NAME} AppStderr "${path.join(logsDir, 'error.log')}"`);

        // Attempt to start service (Ignore "Pending" errors, relying on Health Check)
        try {
            execSync(`"${nssm}" start ${SERVICE_NAME}`);
            log('Service registered and started.');
        } catch (startErr) {
            log(`Service Start Warning: ${startErr.message.trim()}. Proceeding to Health Validation...`, 'WARN');
        }
    } catch (err) {
        return fail(`Service registration configuration failed: ${err.message}`);
    }

    // 7. Firewall
    log('Step 7/8: Configuring Firewall...');
    try {
        execSync(`powershell -Command "New-NetFirewallRule -DisplayName '${SERVICE_NAME}' -Direction Inbound -LocalPort ${PORT} -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"`);
        log('Firewall rule added.');
    } catch (err) {
        log('Firewall configuration warning (check manually).', 'WARN');
    }

    // 8. Validation
    log('Step 8/8: Validating Health...');
    log('Waiting for service to initialize (5s)...');
    await new Promise(r => setTimeout(r, 5000));

    const http = require('http');

    // ... (inside validation step)
    try {
        await new Promise((resolve, reject) => {
            const req = http.get(`http://127.0.0.1:${PORT}/agent/health`, (res) => {
                if (res.statusCode === 200) {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            if (json.status === 'online') resolve();
                            else reject(new Error('Status not online'));
                        } catch (e) {
                            reject(e);
                        }
                    });
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
            req.on('error', reject);
            req.end();
        });
        log('✅ Health Check PASSED');
    } catch (err) {
        return fail(`Health check failed: ${err.message}. Check logs in ${logsDir}`);
    }

    console.log(`
    ==================================================
       ✅ TARGET STORAGE V2 INSTALLATION COMPLETE 
    ==================================================
       Node ID:   ${config.nodeId}
       Data Dir:  ${DATA_DIR}
       Status:    RUNNING
    ==================================================
    `);

    // Keep window open
    console.log('Press any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
}

main().catch(err => fail(`Unexpected error: ${err.message}`));
