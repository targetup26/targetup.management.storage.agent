const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
}

async function build() {
    console.log('🏗️  Starting TargetStorage V2 Build...');

    const ASSETS_DIR = path.join(__dirname, 'assets');
    const DIST_DIR = path.join(__dirname, 'dist');
    const AGENT_EXE = path.join(DIST_DIR, 'target-storage-agent.exe');
    const TARGET_AGENT_ASSET = path.join(ASSETS_DIR, 'TargetStorageAgent.exe');

    // 1. Build Agent
    console.log('\n📦 Step 1: Compiling Agent Binary...');
    run('npx pkg server.js --config package.json --targets node18-win-x64 --output dist/target-storage-agent');

    // 2. Move Agent to Assets
    console.log('\n🚚 Step 2: moving Agent to installer assets...');
    if (fs.existsSync(AGENT_EXE)) {
        fs.copyFileSync(AGENT_EXE, TARGET_AGENT_ASSET);
        console.log(`Copied ${AGENT_EXE} to ${TARGET_AGENT_ASSET}`);
    } else {
        console.error('❌ Agent binary not found!');
        process.exit(1);
    }

    // 3. Check NSSM
    const NSSM_PATH = path.join(ASSETS_DIR, 'nssm.exe');
    if (!fs.existsSync(NSSM_PATH)) {
        console.warn('\n⚠️  WARNING: nssm.exe not found in assets folder!');
        console.warn('The installer will fail at runtime if nssm.exe is missing.');
        console.warn(`Please generate or download nssm.exe and place it in: ${NSSM_PATH}`);
    }

    // 4. Build Installer
    console.log('\n💿 Step 3: Compiling Installer...');
    // We modify package.json temporarily or just point pkg to installer.js
    // Actually, we can just run pkg on installer.js with the same config, 
    // but we need to ensure assets are included. 
    // The package.json "bin" entries might confuse pkg if we run it blindly.
    // Let's run specific command for installer.

    run('npx pkg installer.js --config package.json --targets node18-win-x64 --output dist/TargetStorageInstaller');

    console.log('\n✅ BUILD COMPLETE');
    console.log('Artifacts:');
    console.log(` - ${path.join(DIST_DIR, 'TargetStorageInstaller.exe')}`);
}

build();
