# Production Deployment Guide — Humers Infratech Portal

This document outlines the step-by-step procedures to deploy the **Humers Infratech Document Portal** to production.

---

## 🔒 Production Enhancements Already Configured

The application has been hardened with the following enterprise production standards:
- **HTTP Security Headers (`helmet`)**: Defends against XSS, clickjacking, MIME-type sniffing.
- **DDoS & Brute-Force Rate Limiting (`express-rate-limit`)**: Limits public queries to 120 req/15min and admin login to 10 attempts/15min.
- **Production Session Persistence (`session-file-store`)**: Sessions are safely stored on disk in `data/sessions/`, preventing memory leaks and keeping admins logged in across server restarts.
- **Gzip & Brotli HTTP Compression (`compression`)**: Minimizes payload sizes for fast document searches over mobile data.
- **Healthcheck Endpoint (`/api/health`)**: Ready for cloud load balancers, Docker, and uptime monitoring.
- **Container Isolation (`Dockerfile`)**: Runs as a non-privileged `node` user in an Alpine-based lightweight container.
- **Environment Management (`dotenv`)**: Secure configuration through `.env` with no hardcoded credentials.

---

## Option 1: One-Click Cloud Deployment (Render.com - Recommended)

Render provides free/low-cost managed hosting with automatic SSL and zero server maintenance:

1. **Push your code to GitHub or GitLab**:
   ```bash
   git init
   git add .
   git commit -m "Production release for Humers Infratech"
   git remote add origin <your-git-repo-url>
   git push -u origin main
   ```
2. **Create a Web Service on [Render.com](https://render.com)**:
   - Click **New +** → **Web Service** → Select your repository.
   - Render automatically detects `render.yaml` or you can configure manually:
     - **Runtime**: `Node`
     - **Build Command**: `npm ci --omit=dev`
     - **Start Command**: `npm start`
3. **Add Persistent Disk**:
   - In your Render service settings, add a **Disk**:
     - **Name**: `humers-uploads`
     - **Mount Path**: `/opt/render/project/src/uploads`
     - **Size**: 1GB (or as needed)
4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: *(Generate a random 32+ character string)*
   - `COOKIE_SECURE`: `true`

---

## Option 2: Docker Compose (VPS / DigitalOcean / AWS / Linode)

To deploy on any virtual private server (Ubuntu/Debian/CentOS) with Docker installed:

1. **Upload or clone the project folder to your server**:
   ```bash
   cd /var/www/humers-web-doc
   ```
2. **Review your `.env` settings**:
   ```bash
   cp .env.example .env
   nano .env
   ```
3. **Build and launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```
4. **Check status**:
   ```bash
   docker compose ps
   curl http://localhost:3000/api/health
   ```
   *The data and uploaded documents will be safely persisted in `./data` and `./uploads` on the host machine.*

---

## Option 3: Linux VPS with PM2 and Nginx (Custom Domain + SSL)

### Step 1: Install Dependencies
```bash
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### Step 2: Set Up Application
```bash
cd /var/www/humers-web-doc
npm ci --omit=dev
cp .env.example .env
```
Edit `.env` to set:
```ini
NODE_ENV=production
PORT=3000
COOKIE_SECURE=true
SESSION_SECRET=your_super_strong_random_secret_here
```

### Step 3: Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 4: Configure Nginx & SSL
1. Copy the provided `nginx.conf`:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/humers-infratech
   sudo ln -s /etc/nginx/sites-available/humers-infratech /etc/nginx/sites-enabled/
   ```
2. Edit `/etc/nginx/sites-available/humers-infratech` and replace `yourcompanydomain.com` with your actual domain (e.g. `humersinfratech.com`).
3. Test and restart Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. Issue a free SSL Certificate with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d humersinfratech.com -d www.humersinfratech.com
   ```

---

## Option 4: On-Premises Windows Server (Local Sikar Office Setup)

If running directly on a dedicated Windows PC or local server inside your office:

1. **Install PM2 for Windows**:
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   pm2-startup install
   ```
2. **Start the Production Process**:
   ```powershell
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```
3. To access from other computers on the office Wi-Fi / Local Network:
   - Find server local IP (`ipconfig` → e.g. `192.168.1.50`).
   - Allow port 3000 in Windows Defender Firewall:
     ```powershell
     New-NetFirewallRule -DisplayName "Humers Portal Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
     ```
   - Other office devices can access via: `http://192.168.1.50:3000`.

---

## 🛡️ Post-Deployment Security Checklist

- [ ] Changed default admin password from `admin123` via `/admin` dashboard.
- [ ] Set a unique, high-entropy `SESSION_SECRET` in `.env`.
- [ ] Enabled `COOKIE_SECURE=true` once domain is serving over HTTPS.
- [ ] Backed up the `data/` and `uploads/` directories regularly (can be scheduled with a daily cron/task).
