const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { validatePath } = require('./folderManager');

async function saveFile(folderPath, filename, filedata) {
    const filePath = path.join(folderPath, filename);

    // Validate path
    validatePath(filePath);

    // Write raw data (buffer)
    await fs.writeFile(filePath, filedata);

    const stats = await fs.stat(filePath);

    return {
        path: filePath,
        size: stats.size
    };
}

async function readFile(filepath) {
    // Validate path
    validatePath(filepath);

    // Return raw buffer
    return await fs.readFile(filepath);
}

async function deleteFile(filepath) {
    // Validate path
    validatePath(filepath);

    await fs.unlink(filepath);
}

async function generateThumbnail(filepath) {
    // Validate path
    validatePath(filepath);

    // Check if video file
    const ext = path.extname(filepath).toLowerCase();
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv'];

    if (!videoExtensions.includes(ext)) {
        throw new Error('Not a video file');
    }

    // For now, return placeholder
    // In production, use ffmpeg to generate thumbnail
    logger.warn('Video thumbnail generation not yet implemented', { filepath });

    return null;
}

module.exports = {
    saveFile,
    readFile,
    deleteFile,
    generateThumbnail
};
