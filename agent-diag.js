const http = require('http');
const os = require('os');
require('dotenv').config();

const PORT = process.env.AGENT_PORT || 3002;

console.log('🔍 TargetUp: Storage Agent Port Diagnostic');
console.log('------------------------------------------');
console.log(`Checking Port: ${PORT}`);

const server = http.createServer((req, res) => {
    res.end('Diagnostic OK');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ FAILED: Port ${PORT} is already in use by another application.`);
        console.log('💡 Suggestion: Check if the "TargetStorage Agent" service is already running.');
    } else {
        console.error(`❌ FAILED: Unexpected server error: ${err.message}`);
    }
    process.exit(1);
});

try {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ SUCCESS: Port ${PORT} is available and successfully bound to 0.0.0.0.`);
        console.log('\n--- Network Interfaces ---');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4') {
                    console.log(`[${name}] ${iface.address} -> http://${iface.address}:${PORT}/agent/health`);
                }
            }
        }
        console.log('\n💡 Final Check: If the URL above works locally but not from the Main API server, verify your Windows Firewall allows inbound TCP traffic on port ' + PORT);
        server.close();
        process.exit(0);
    });
} catch (e) {
    console.error('❌ CRITICAL: Failed to start server:', e.message);
    process.exit(1);
}
