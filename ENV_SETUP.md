# OSMORA AI - Environment Variables Setup Guide

Panduan lengkap untuk mengatur environment variables di localhost dan production hosting.

## 📋 Daftar Environment Variables

### Database Configuration
```
DATABASE_URL=mysql://username:password@host:port/database
```
- **Localhost:** `mysql://root:password@localhost:3306/osmora_ai`
- **Production:** `mysql://user:password@db.example.com:3306/osmora_ai`

### Authentication & Security
```
JWT_SECRET=your_jwt_secret_key_here
```
- Gunakan string random yang kuat (minimal 32 karakter)
- Generate dengan: `openssl rand -base64 32`
- **PENTING:** Jangan pernah share atau commit ke git

### OAuth Configuration (Manus)
```
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Your Name
```
- Dapatkan dari: https://manus.im project settings

### Manus Built-in APIs
```
BUILT_IN_FORGE_API_KEY=your_forge_api_key
BUILT_IN_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
```
- `BUILT_IN_FORGE_API_KEY` = Server-side (RAHASIA, jangan expose)
- `VITE_FRONTEND_FORGE_API_KEY` = Frontend (aman untuk browser)

### Application Branding
```
VITE_APP_TITLE=OSMORA AI
VITE_APP_LOGO=/osmora-logo.svg
```
- Ubah melalui Management UI Settings (recommended)
- Atau set manual di file ini

### Analytics (Optional)
```
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

---

## 🚀 Setup untuk Localhost

### Step 1: Persiapan Database
```bash
# Pastikan MySQL running
mysql -u root -p

# Buat database
CREATE DATABASE osmora_ai;
EXIT;
```

### Step 2: Konfigurasi Environment Variables
```bash
# Buka file .env (atau buat baru jika belum ada)
# Set DATABASE_URL dengan kredensial lokal Anda
DATABASE_URL=mysql://root:your_password@localhost:3306/osmora_ai
JWT_SECRET=dev_secret_key_12345678901234567890
```

### Step 3: Dapatkan Manus Credentials
1. Buka https://manus.im
2. Login atau buat akun
3. Buat project baru
4. Copy credentials:
   - `VITE_APP_ID`
   - `OWNER_OPEN_ID`
   - `BUILT_IN_FORGE_API_KEY`
   - `VITE_FRONTEND_FORGE_API_KEY`

### Step 4: Install & Run
```bash
# Install dependencies
pnpm install

# Setup database (create tables)
pnpm db:push

# Start development server
pnpm dev

# Open browser
# http://localhost:3000
```

---

## 🌐 Setup untuk Production/Hosting

### Opsi 1: Manus Platform (Recommended)
Paling mudah - semua sudah termasuk:
1. Klik "Publish" di Management UI
2. Bind custom domain Anda
3. Database & SSL otomatis

### Opsi 2: VPS/Cloud Hosting (DigitalOcean, Heroku, Railway, Render)

#### Step 1: Siapkan Server
```bash
# SSH ke server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Clone project
git clone https://github.com/your-repo/osmora-ai.git
cd osmora-ai
```

#### Step 2: Setup Database
```bash
# Install MySQL (jika belum ada)
sudo apt-get install -y mysql-server

# Buat database
mysql -u root -p
CREATE DATABASE osmora_ai;
EXIT;
```

#### Step 3: Konfigurasi Environment
```bash
# Buat file .env
nano .env

# Isi dengan production values:
DATABASE_URL=mysql://user:password@localhost:3306/osmora_ai
JWT_SECRET=production_secret_key_very_strong_random_string_here
VITE_APP_ID=your_app_id
OWNER_OPEN_ID=your_owner_id
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_APP_TITLE=OSMORA AI
NODE_ENV=production
PORT=3000
```

#### Step 4: Build & Deploy
```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:push

# Build production
pnpm build

# Start server (dengan PM2 untuk keep-alive)
npm install -g pm2
pm2 start "pnpm start" --name "osmora-ai"
pm2 save
pm2 startup

# Setup Nginx reverse proxy (optional but recommended)
sudo apt-get install -y nginx
# Configure /etc/nginx/sites-available/osmora-ai
# Point to http://localhost:3000
```

#### Step 5: Setup Domain & SSL
```bash
# Install Certbot untuk SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot certonly --nginx -d yourdomain.com

# Update Nginx config untuk HTTPS
```

---

## 📝 Environment Variables Checklist

### Localhost
- [ ] DATABASE_URL (local MySQL)
- [ ] JWT_SECRET (dev secret)
- [ ] VITE_APP_ID (dari Manus)
- [ ] OWNER_OPEN_ID (dari Manus)
- [ ] BUILT_IN_FORGE_API_KEY (dari Manus)
- [ ] VITE_FRONTEND_FORGE_API_KEY (dari Manus)

### Production
- [ ] DATABASE_URL (production database)
- [ ] JWT_SECRET (strong random string)
- [ ] VITE_APP_ID (dari Manus)
- [ ] OWNER_OPEN_ID (dari Manus)
- [ ] BUILT_IN_FORGE_API_KEY (dari Manus)
- [ ] VITE_FRONTEND_FORGE_API_KEY (dari Manus)
- [ ] NODE_ENV=production
- [ ] SSL Certificate configured
- [ ] Domain DNS pointing to server

---

## 🔒 Security Best Practices

1. **Jangan commit .env ke git**
   ```bash
   # Pastikan .env ada di .gitignore
   echo ".env" >> .gitignore
   ```

2. **Gunakan strong secrets**
   ```bash
   # Generate random string
   openssl rand -base64 32
   ```

3. **Rotate secrets regularly**
   - Update JWT_SECRET setiap 3-6 bulan
   - Update API keys jika ada security concern

4. **Separate dev/prod secrets**
   - Jangan gunakan secret yang sama untuk dev dan production
   - Gunakan .env.local untuk development

5. **Keep API keys secret**
   - BUILT_IN_FORGE_API_KEY hanya di server
   - VITE_FRONTEND_FORGE_API_KEY aman di browser

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solusi:**
- Pastikan MySQL running: `sudo systemctl start mysql`
- Check DATABASE_URL format
- Verify database credentials

### JWT Secret Error
```
Error: JWT_SECRET not found
```
**Solusi:**
- Set JWT_SECRET di .env
- Restart server setelah mengubah .env

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Solusi:**
- Ubah PORT di .env: `PORT=3001`
- Atau kill process: `lsof -ti:3000 | xargs kill -9`

### OAuth Login Not Working
```
Error: Invalid VITE_APP_ID
```
**Solusi:**
- Verify VITE_APP_ID dari Manus project
- Check OAUTH_SERVER_URL correct
- Restart server

---

## 📞 Support

Jika ada masalah:
1. Check logs: `pnpm dev` (development) atau `pm2 logs` (production)
2. Verify semua environment variables sudah set
3. Pastikan database sudah dibuat dan migrations sudah jalan
4. Hubungi Manus support jika OAuth issue

---

## 🔗 Useful Links

- **Manus Platform:** https://manus.im
- **Node.js Setup:** https://nodejs.org
- **MySQL Setup:** https://dev.mysql.com/downloads/
- **PM2 Documentation:** https://pm2.keymetrics.io
- **Nginx Setup:** https://nginx.org
- **Let's Encrypt SSL:** https://letsencrypt.org
