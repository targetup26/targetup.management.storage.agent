<div align="center">
  <img src="https://via.placeholder.com/150x150/0f172a/ef4444?text=TARGETUP" alt="Targetup Logo" />
  <h1>Targetup - Storage Vault Agent</h1>
  <p>An isolated, highly-available file streaming and distribution server operating seamlessly as a persistent Background Windows Service.</p>
</div>

<hr />

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Environment Configuration (ENV)](#environment-configuration-env)
4. [Installation & Windows Service Deployment](#installation--windows-service-deployment)
5. [Core Endpoints & Operations](#core-endpoints--operations)
6. [Security & Cross-Origin Auth](#security--cross-origin-auth)
7. [Health Monitoring](#health-monitoring)

---

## 🏗️ System Overview
The Storage Agent is a Node.js microservice tasked *solely* with offloading heavy I/O operations (file streams, large uploads, zipper distributions, memory checks) from the main backend. It stores actual physical byte data, receiving meta-instructions seamlessly from the Core API via Shared-Secret JWT encryptions.

---

## 🚀 Technology Stack
* **Framework**: Express (Node.js)
* **File Processing**: Multer (Memory-mapped parsing), Archiver (Flyweight ZIP compression)
* **OS-Level Mounting**: `node-windows` (Installs Node scripts as a native Windows System Service)
* **Metrics**: `check-disk-space` (Validates physical drive C: / D: thresholds)
* **Security**: System-to-System JWT Authorization, CORS (Whitelisting Backend IPs)
* **Logging System**: Winston & `winston-daily-rotate-file` (Archiving `.log` footprints automatically)

---

## ⚙️ Environment Configuration (`.env`)
Create a `.env` file in the root of the `storage-agent` directory.

```ini
# Server Setup
AGENT_PORT=3001
NODE_ENV=production

# Storage Location Setup (Absolute paths strongly recommended for OS stability)
STORAGE_PATH=C:\TargetStorage

# Security Config (Must be perfectly identical to the Core Backend)
JWT_SECRET=super_secret_jwt_key_here

# Telemetry
SERVER_ID=StorageNode_01
```

---

## 🛠️ Installation & Windows Service Deployment

1. **Clone & Install**:
   ```bash
   git clone https://github.com/targetup26/targetup.storage.agent.git
   cd targetup.storage.agent
   npm install
   ```
2. **Local Development Run**:
   ```bash
   npm start
   ```
   *The server validates if `STORAGE_PATH` exists on boot. If not, development crashes.*

### 🔥 Windows Platform Service Registration
To ensure maximum uptime and bypass user-session login dependencies, this microservice registers directly into the Windows `services.msc`:

1. Elevate your Command Prompt / Terminal as **Administrator**.
2. Mount the Service:
   ```bash
   npm run install-service
   ```
3. Control the Service:
   * The app will now automatically run on PC Booth under `Targetup_StorageAgent`.
   * To remove it later safely: `npm run uninstall-service`.

---

## 🗂️ Core Endpoints & Operations
The payload structure heavily restricts access via custom headers: `X-Agent-Auth`.

* **`POST /agent/upload`**: 
  Accepts massive Multipart Streams piped directly from the Backend Backend's multer outputs, writing bytes sequentially to the designated `STORAGE_PATH/Department/EmployeeID/Filename`.
* **`GET /agent/download`**:
  Fetches absolute paths and pipes byte buffers as active downloads to the requester.
* **`GET /agent/thumbnail`**:
  Silently triggers FFmpeg processing to parse `.mp4` / `.mov` and spit out optimized JPG thumbnail screens for the Frontend FileManager layout.
* **`POST /agent/create-folder` & `POST /agent/rename` / `DELETE /agent/delete`**:
  Native FS operations bypassing SQL entirely.

---

## 🔒 Security & Cross-Origin Auth
This service does **not** rely on User identities. It relies on Server-to-Server identities.
The `requireAgentAuth.js` middleware parses the `X-Agent-Auth` header, decoding the timestamped JWT. Only the Core Backend possesses the symmetric Secret Key derived from `.env`. If a malicious IP attempts direct access to the Storage Agent without the signed key, it immediately responds with `401 Unauthorized`.

---

## 🏥 Health Monitoring
* **`GET /agent/health`**:
  Vital heartbeat telemetry. Constantly pings the host OS drive executing binary checks on Used Space (`free`, `size`). If space dips below critical thresholds (e.g., 98% full), it warns the core system to throttle uploads automatically.
