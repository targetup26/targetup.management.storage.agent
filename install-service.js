const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'TargetStorage Agent',
    description: 'Distributed file storage agent for Target-Attendance system',
    script: path.join(__dirname, 'server.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: [
        {
            name: "NODE_ENV",
            value: "production"
        },
        {
            name: "AGENT_PORT",
            value: "3002"
        }
    ]
});

// Listen for the "install" event
svc.on('install', () => {
    console.log('✅ Service installed successfully!');
    console.log('Starting service...');
    svc.start();
});

svc.on('alreadyinstalled', () => {
    console.log('⚠️  Service is already installed.');
});

svc.on('start', () => {
    console.log('✅ Service started successfully!');
    console.log('\nService Details:');
    console.log(`  Name: ${svc.name}`);
    console.log(`  Description: ${svc.description}`);
    console.log('\nTo check status: sc query "TargetStorage Agent"');
    console.log('To stop: sc stop "TargetStorage Agent"');
    console.log('To start: sc start "TargetStorage Agent"');
});

svc.on('error', (err) => {
    console.error('❌ Service error:', err);
});

// Install the service
console.log('Installing TargetStorage Agent as Windows Service...\n');
svc.install();
