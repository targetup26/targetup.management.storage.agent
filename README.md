# Targetup - Storage Agent Microservice

A highly-available, distributed file storage service for the Targetup ecosystem. It offloads heavy I/O operations from the main backend and generates secure, expiring File Share Links. Uniquely, this microservice can be packaged and installed as a persistent **Windows Service**.

## 🚀 Technology Stack
* **Runtime**: Node.js
* **Framework**: Express
* **File Processing**: Multer (Stream handling), Archiver (Zip generation)
* **System Operations**: check-disk-space (Storage limit monitoring), node-windows (OS-level service mounting)
* **Security**: JSON Web Tokens (JWT validation natively independent of Core Backend)
* **Logging**: Winston, Winston-Daily-Rotate-File

---

## ⚙️ Environment Variables (`.env`)
Create a `.env` file in the root of the `storage-agent` directory.

```ini
# Server Setup
AGENT_PORT=3001
NODE_ENV=production

# Storage Location Setup (Absolute path is recommended for production)
STORAGE_PATH=C:\TargetStorage

# Security Config (Must match Core Backend)
JWT_SECRET=super_secret_jwt_key_here

# Identifier
SERVER_ID=StorageNode_01
```

---

## 🛠️ Installation & Setup

1. **Prerequisites**: Ensure you have Node.js (v18+) installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run the Development Server**:
   ```bash
   npm start
   ```
   The agent will run on `http://localhost:3001` and verify the `STORAGE_PATH` exists on startup.

4. **Install as a Windows Platform Service**:
   Run the following to integrate the app securely into the host OS's Service Control Manager (SCM):
   ```bash
   npm run install-service
   ```
   *(To remove the service later, run `npm run uninstall-service`)*

5. **Generate Packaged Executable (Electron-Builder)**:
   ```bash
   npm run build
   ```
   This generates standalone binaries in the `/dist` folder.

---

## 📁 Core Features
* `/agent/upload`: Consumes mapped streams of Multipart data and saves them hierarchically (`Department/Employee/File`).
* `/agent/download`: Authenticated byte-streaming for requested absolute paths.
* `/agent/thumbnail`: Background video screenshot engine utilizing built-in FFmpeg modules.
* `/agent/health`: Continually checks Physical Drive thresholds (Total/Free/Used Disk Space).
* `/agent/create-folder` & `/agent/rename`: Physical directory interactions triggered securely over JWT.
