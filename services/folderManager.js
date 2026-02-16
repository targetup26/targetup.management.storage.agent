const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let basePath = process.env.STORAGE_PATH || 'C:\\TargetStorage';

function setBasePath(newPath) {
    if (!newPath) return;
    basePath = path.normalize(newPath);
    logger.info(`Storage basePath updated to: ${basePath}`);
    return basePath;
}

function ensureFolderExists(department, employee) {
    const folderPath = path.join(basePath, department, employee);

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        logger.info('Folder created', { path: folderPath });
    }

    return folderPath;
}

function validatePath(filepath) {
    // If filepath is already absolute and starts with basePath, just normalize it
    if (path.isAbsolute(filepath) && filepath.startsWith(basePath)) {
        return path.normalize(filepath);
    }

    // Otherwise, treat it as relative to basePath and combine them
    const fullPath = path.join(basePath, filepath);
    const normalizedPath = path.normalize(fullPath);

    // Security check: ensure the resulting path is still inside the basePath
    if (!normalizedPath.startsWith(basePath)) {
        logger.error('Path traversal detected', { filepath, normalizedPath });
        throw new Error('Invalid file path - path traversal detected');
    }

    return normalizedPath;
}

module.exports = {
    ensureFolderExists,
    validatePath,
    setBasePath
};
