# OSMORA AI - Deployment Guide

Panduan lengkap untuk deploy OSMORA AI ke berbagai platform hosting.

---

## 🚀 Opsi Deployment

### 1. **Manus Platform** (Recommended - Paling Mudah)
- ✅ Gratis domain `.manus.space`
- ✅ Custom domain support
- ✅ Database included
- ✅ SSL otomatis
- ✅ Auto scaling
- ⏱️ Setup: 2 menit

### 2. **VPS/Cloud Hosting** (Full Control)
- DigitalOcean, Linode, AWS, Google Cloud, Azure
- ✅ Full control
- ✅ Custom domain
- ⚠️ Setup lebih kompleks
- ⏱️ Setup: 30-60 menit

### 3. **Shared Hosting** (NOT Recommended)
- ❌ Tidak support Node.js
- ❌ Hanya PHP/WordPress
- ❌ Tidak cocok untuk aplikasi ini

---

## 📱 Deployment Option 1: Manus Platform (Recommended)

### Step 1: Publish dari Management UI
1. Buka Management UI (klik "View" di project card)
2. Klik tombol **"Publish"** di top-right
3. Pilih visibility (Public/Private)
4. Klik **"Publish Now"**

### Step 2: Dapatkan Domain
- **Default:** `your-project.manus.space`
- **Custom:** Bind domain Anda sendiri di Settings → Domains

### Step 3: Bind Custom Domain (Optional)
1. Buka Management UI → Settings → Domains
2. Klik "Add Custom Domain"
3. Enter domain Anda (e.g., `osmora.com`)
4. Update DNS records sesuai instruksi
5. Tunggu SSL certificate auto-generate

### Selesai! 🎉
- Database sudah termasuk
- SSL otomatis
- Auto-scaling
- Monitoring built-in

---

## 🖥️ Deployment Option 2: VPS/Cloud Hosting

### Prerequisites
- Server dengan Ubuntu 22.04+
- SSH access
- Domain (optional)
- Minimal 2GB RAM, 20GB storage

### Step 1: Server Setup

```bash
# SSH ke server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install MySQL
apt install -y mysql-server

# Install Nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

### Step 2: Database Setup

```bash
# Start MySQL
systemctl start mysql

# Login ke MySQL
mysql -u root

# Create database & user
CREATE DATABASE osmora_ai;
CREATE USER 'osmora'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON osmora_ai.* TO 'osmora'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Clone & Setup Project

```bash
# Create app directory
mkdir -p /var/www/osmora-ai
cd /var/www/osmora-ai

# Clone project (atau upload files)
git clone https://github.com/your-repo/osmora-ai.git .

# Install dependencies
pnpm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=mysql://osmora:strong_password_here@localhost:3306/osmora_ai
JWT_SECRET=your_strong_random_secret_here
VITE_APP_ID=your_app_id
OWNER_OPEN_ID=your_owner_id
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_APP_TITLE=OSMORA AI
VITE_APP_LOGO=/osmora-logo.svg
NODE_ENV=production
PORT=3000
EOF

# Setup database
pnpm db:push

# Build production
pnpm build
```

### Step 4: Setup PM2 (Process Manager)

```bash
# Start app dengan PM2
pm2 start "pnpm start" --name "osmora-ai"

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup
# Copy & run the command output

# Check status
pm2 status
pm2 logs osmora-ai
```

### Step 5: Setup Nginx Reverse Proxy

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/osmora-ai << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/osmora-ai /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### Step 6: Setup SSL (Let's Encrypt)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Update Nginx config untuk HTTPS
cat > /etc/nginx/sites-available/osmora-ai << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Reload Nginx
systemctl reload nginx

# Setup auto-renewal
certbot renew --dry-run
```

### Step 7: Update DNS

1. Buka registrar domain Anda
2. Update A record ke IP server Anda
3. Tunggu DNS propagate (5-30 menit)
4. Test: `https://your-domain.com`

### Selesai! 🎉

```bash
# Check app status
pm2 status

# View logs
pm2 logs osmora-ai

# Restart jika perlu
pm2 restart osmora-ai
```

---

## 🔄 Continuous Deployment (Auto-Update)

### Setup GitHub Actions (Optional)

```bash
# Create .github/workflows/deploy.yml
mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Deploy
        run: |
          # Add your deployment script here
          # e.g., SSH to server and pull latest code
EOF
```

---

## 📊 Monitoring & Maintenance

### Check App Status
```bash
# PM2 status
pm2 status

# View logs
pm2 logs osmora-ai

# Monitor resources
pm2 monit
```

### Database Backup
```bash
# Backup database
mysqldump -u osmora -p osmora_ai > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u osmora -p osmora_ai < backup_20240101.sql
```

### Update Application
```bash
cd /var/www/osmora-ai

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Run migrations
pnpm db:push

# Build
pnpm build

# Restart app
pm2 restart osmora-ai
```

---

## 🔒 Security Checklist

- [ ] Change MySQL root password
- [ ] Use strong JWT_SECRET
- [ ] Enable SSL/HTTPS
- [ ] Setup firewall (UFW)
- [ ] Disable SSH password login (use keys)
- [ ] Regular backups
- [ ] Monitor logs for errors
- [ ] Update system regularly
- [ ] Use environment variables for secrets
- [ ] Never commit .env to git

### Setup Firewall
```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow 22

# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Check status
ufw status
```

---

## 🐛 Troubleshooting

### App not starting
```bash
# Check logs
pm2 logs osmora-ai

# Restart
pm2 restart osmora-ai

# Check port
lsof -i :3000
```

### Database connection error
```bash
# Check MySQL status
systemctl status mysql

# Check credentials in .env
cat .env | grep DATABASE_URL

# Test connection
mysql -u osmora -p -h localhost osmora_ai
```

### SSL certificate error
```bash
# Check certificate
certbot certificates

# Renew manually
certbot renew --force-renewal

# Check Nginx config
nginx -t
```

### High memory usage
```bash
# Check process memory
pm2 monit

# Restart app
pm2 restart osmora-ai

# Check for memory leaks in logs
pm2 logs osmora-ai | grep -i error
```

---

## 📞 Support

- **Manus Docs:** https://docs.manus.im
- **Node.js Docs:** https://nodejs.org/docs
- **PM2 Docs:** https://pm2.keymetrics.io
- **Nginx Docs:** https://nginx.org/en/docs/
- **MySQL Docs:** https://dev.mysql.com/doc/

---

## 📝 Deployment Checklist

### Before Deployment
- [ ] All tests passing
- [ ] Code committed to git
- [ ] .env.example updated
- [ ] README updated
- [ ] Database migrations tested

### During Deployment
- [ ] Server prepared
- [ ] Database created
- [ ] .env configured
- [ ] Dependencies installed
- [ ] Database migrations run
- [ ] Build successful
- [ ] App starting without errors

### After Deployment
- [ ] Website accessible
- [ ] Login working
- [ ] Pricing page working
- [ ] Payment modal working
- [ ] Database connected
- [ ] SSL certificate valid
- [ ] Monitoring setup
- [ ] Backups configured

---

**Last Updated:** 2024
**Version:** 1.0
