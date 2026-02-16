const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVICE_ID = 'TargetStorage Agent';
const GHOST_ID = 'targetstorageagent.exe'; // From user screenshot

console.log('🚀 TargetUp: Forced Service Purge Initialized');
console.log('-------------------------------------------');

function runCmd(cmd) {
    return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}

async function purge() {
    // 1. Try to stop both possible IDs
    console.log('Stopping services...');
    await runCmd(`sc stop "${SERVICE_ID}"`);
    await runCmd(`sc stop "${GHOST_ID}"`);

    // 2. Delete both possible IDs
    console.log('Deleting service entries from Windows Registry...');
    const del1 = await runCmd(`sc delete "${SERVICE_ID}"`);
    const del2 = await runCmd(`sc delete "${GHOST_ID}"`);

    if (!del1.error) console.log(`✅ Purged: ${SERVICE_ID}`);
    if (!del2.error) console.log(`✅ Purged: ${GHOST_ID}`);

    // 3. Instruction for daemon folder
    const daemonPath = path.join(__dirname, 'daemon');
    if (fs.existsSync(daemonPath)) {
        console.log(`\n⚠️  ACTION REQUIRED: Please manually delete the folder: ${daemonPath}`);
        console.log('This folder contains the stale service wrapper. It must be gone before re-installing.');
    }

    console.log('\n--- Status Check ---');
    console.log('If the Services window is still open, close and reopen it to see the changes.');
    console.log('Once the list is clear, you can run: node install-service.js');
}

purge();
