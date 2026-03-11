const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const checkDiskSpace = require('check-disk-space').default;
require('dotenv').config();

const logger = require('./services/logger');
const authValidator = require('./services/authValidator');
const fileHandler = require('./services/fileHandler');
const folderManager = require('./services/folderManager');

const configService = require('./services/configService');
const config = configService.load();

const app = express();
// Env vars override config file, config file overrides defaults
const PORT = process.env.AGENT_PORT || config.agentPort || 3001;
const STORAGE_PATH = process.env.STORAGE_PATH || config.storagePath || 'C:\\TargetStorage';
const SERVER_ID = process.env.SERVER_ID || config.serverId || 'Unknown';

// Sync folderManager with the loaded STORAGE_PATH
folderManager.setBasePath(STORAGE_PATH);

// Ensure JWT Secret is available to authValidator
if (!process.env.JWT_SECRET && config.jwtSecret) {
    process.env.JWT_SECRET = config.jwtSecret;
}

// Ensure storage root exists immediately
if (!fs.existsSync(STORAGE_PATH)) {
    try {
        fs.mkdirSync(STORAGE_PATH, { recursive: true });
        console.log(`✅ Created storage directory: ${STORAGE_PATH}`);
    } catch (err) {
        console.error(`❌ Failed to create storage directory: ${err.message}`);
    }
}

let server;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50gb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50gb' }));

// Logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Health check endpoint
// Health Check & Disk Stats
app.get('/agent/health', async (req, res) => {
    try {
        // Use global STORAGE_PATH defined at top
        const diskSpace = await checkDiskSpace(STORAGE_PATH);

        res.json({
            status: 'online',
            uptime: process.uptime(),
            server_id: SERVER_ID,
            storage_path: STORAGE_PATH,
            disk_usage: {
                total: diskSpace.size,
                free: diskSpace.free,
                used: diskSpace.size - diskSpace.free,
                percent: ((diskSpace.size - diskSpace.free) / diskSpace.size * 100).toFixed(1)
            }
        });
    } catch (error) {
        console.error('Health Check Error:', error); // Log to console for debugging
        logger.error('Health check failed', { error: error.message });

        // Return partial info even if disk check fails
        res.json({
            status: 'online', // Server is technically running
            uptime: process.uptime(),
            storage_path: STORAGE_PATH,
            error: 'Disk check failed: ' + error.message
        });
    }
});

// Configure multer for handling multipart/form-data
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Infinity }
});

// File upload endpoint (Modified for Multipart Stream)
app.post('/agent/upload', authValidator.validateJWT, upload.single('file'), async (req, res) => {
    try {
        const { department, employee, filename, rel_path } = req.body;
        const filedata = req.file ? req.file.buffer : null;

        if (!filename || !filedata) {
            return res.status(400).json({ error: 'Missing required fields (filename, file)' });
        }

        let folderPath;
        if (rel_path) {
            // Use explicit relative path (supports hierarchical folder structure)
            folderPath = folderManager.validatePath(rel_path);
            const fs = require('fs');
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        } else {
            if (!department || !employee) {
                return res.status(400).json({ error: 'Missing required fields (department, employee)' });
            }
            folderPath = folderManager.ensureFolderExists(department, employee);
        }

        // Save file
        const result = await fileHandler.saveFile(folderPath, filename, filedata);

        logger.info('File uploaded successfully', {
            folderPath,
            filename,
            size: result.size
        });

        res.json({
            success: true,
            path: result.path,
            size: result.size
        });
    } catch (error) {
        logger.error('File upload failed', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Upload failed', message: error.message });
    }
});

// File download endpoint (Modified for Binary Stream)
app.get('/agent/download', authValidator.validateJWT, async (req, res) => {
    try {
        const { filepath } = req.query;

        if (!filepath) {
            return res.status(400).json({ error: 'Missing filepath parameter' });
        }

        // Convert relative path to absolute path using folderManager
        const absolutePath = folderManager.validatePath(filepath);

        // Validate path existence and safely resolve it
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        logger.info('File download started', { absolutePath });

        // Use res.sendFile for efficient streaming
        res.sendFile(absolutePath);

    } catch (error) {
        logger.error('File download failed', {
            error: error.message,
            filepath: req.query.filepath
        });
        res.status(500).json({ error: 'Download failed', message: error.message });
    }
});

// --- [NEW] Create Physical Folder Endpoint ---
app.post('/agent/create-folder', authValidator.validateJWT, async (req, res) => {
    try {
        const { rel_path } = req.body; // e.g. "Engineering/John Doe/Projects"
        if (!rel_path) {
            return res.status(400).json({ error: 'rel_path is required' });
        }

        const absolutePath = folderManager.validatePath(rel_path);
        const fs = require('fs');
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
            logger.info('Physical folder created', { absolutePath });
        }

        res.json({ success: true, path: absolutePath });
    } catch (error) {
        logger.error('Create folder failed', { error: error.message });
        res.status(500).json({ error: 'Failed to create folder', message: error.message });
    }
});

// --- [NEW] Rename File or Directory Endpoint ---
app.post('/agent/rename', authValidator.validateJWT, async (req, res) => {
    try {
        const { old_path, new_path } = req.body;
        if (!old_path || !new_path) {
            return res.status(400).json({ error: 'old_path and new_path are required' });
        }

        const absoluteOld = folderManager.validatePath(old_path);
        const absoluteNew = folderManager.validatePath(new_path);
        const fs = require('fs');

        if (!fs.existsSync(absoluteOld)) {
            return res.status(404).json({ error: 'Source path not found' });
        }

        fs.renameSync(absoluteOld, absoluteNew);
        logger.info('Renamed on disk', { from: absoluteOld, to: absoluteNew });
        res.json({ success: true });
    } catch (error) {
        logger.error('Rename failed', { error: error.message });
        res.status(500).json({ error: 'Rename failed', message: error.message });
    }
});

// File delete endpoint
app.delete('/agent/delete', authValidator.validateJWT, async (req, res) => {
    try {
        const { filepath } = req.body;

        if (!filepath) {
            return res.status(400).json({ error: 'Missing filepath parameter' });
        }

        const absolutePath = folderManager.validatePath(filepath);
        await fileHandler.deleteFile(absolutePath);

        logger.info('File deleted', { absolutePath });

        res.json({ success: true });
    } catch (error) {
        logger.error('File deletion failed', {
            error: error.message,
            filepath: req.body.filepath
        });
        res.status(500).json({ error: 'Deletion failed', message: error.message });
    }
});

// Video thumbnail endpoint
app.get('/agent/thumbnail', authValidator.validateJWT, async (req, res) => {
    try {
        const { filepath } = req.query;

        if (!filepath) {
            return res.status(400).json({ error: 'Missing filepath parameter' });
        }

        const thumbnail = await fileHandler.generateThumbnail(filepath);

        res.json({
            success: true,
            data: thumbnail
        });
    } catch (error) {
        logger.error('Thumbnail generation failed', {
            error: error.message,
            filepath: req.query.filepath
        });
        res.status(500).json({ error: 'Thumbnail generation failed', message: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack
    });
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
function start() {
    server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Storage Agent started on port ${PORT}`);
        console.log(`🚀 Storage Agent running on http://0.0.0.0:${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${PORT} is in use. Storage Agent Service is likely running.`);
            console.log('ℹ️  UI will connect to the existing service.');
        } else {
            console.error('❌ Server error:', err);
        }
    });
}

// Stop server
function stop() {
    if (server) {
        server.close(() => {
            logger.info('Storage Agent stopped');
        });
    }
}

// Auto-start if run directly
if (require.main === module) {
    start();
}

module.exports = { start, stop, app };
