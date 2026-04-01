#!/bin/bash
# ==================================================
# Ru-Bric Video Creator — VPS Setup Script (Linode)
# ==================================================
# Run this on a fresh Ubuntu 22.04+ Linode instance
#
# Usage:
#   1. Create a Linode (Ubuntu 22.04, Shared CPU, 2GB RAM minimum)
#   2. SSH into it: ssh root@YOUR_LINODE_IP
#   3. Upload this script and run:
#      bash setup.sh video.rubricplumbing.com
# ==================================================

set -e

DOMAIN=${1:-"video.rubricplumbing.com"}
APP_DIR="/opt/rubric-video"

echo ""
echo "=========================================="
echo "  Ru-Bric Video Creator — VPS Setup"
echo "  Domain: $DOMAIN"
echo "=========================================="
echo ""

# ---- 1. System updates & dependencies ----
echo ">>> Installing system dependencies..."
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl git nginx certbot python3-certbot-nginx \
  docker.io docker-compose-v2 ufw

# ---- 2. Firewall ----
echo ">>> Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ---- 3. Start Docker ----
systemctl enable docker
systemctl start docker

# ---- 4. Clone the app ----
echo ">>> Cloning Ru-Bric Video Creator..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin claude/plumbing-video-app-nNFSr
else
  git clone -b claude/plumbing-video-app-nNFSr https://github.com/Palad10/github-slideshow.git "$APP_DIR"
  cd "$APP_DIR"
fi

# ---- 5. Create .env file ----
echo ">>> Creating environment config..."
JWT_SECRET=$(openssl rand -hex 32)
cat > .env <<EOF
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
PORT=3000
DB_PATH=/app/data/rubric.db
UPLOADS_DIR=/app/uploads
EOF

# ---- 6. Build & start with Docker ----
echo ">>> Building and starting the app (this takes a few minutes)..."
mkdir -p uploads data
docker compose up -d --build

# ---- 7. Configure Nginx ----
echo ">>> Configuring Nginx for $DOMAIN..."
cat > /etc/nginx/sites-available/rubric-video <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 500M;

    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/rubric-video /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ---- 8. SSL Certificate ----
echo ">>> Getting SSL certificate from Let's Encrypt..."
echo ""
echo "  IMPORTANT: Before this step, make sure your DNS is set up:"
echo "  Add an A record: $DOMAIN -> $(curl -s ifconfig.me)"
echo ""
read -p "  Is your DNS pointed to this server? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$(echo "$DOMAIN" | awk -F. '{print $(NF-1)"."$NF}')
  echo ">>> SSL configured!"
else
  echo ">>> Skipping SSL for now. Run this later:"
  echo "    certbot --nginx -d $DOMAIN"
fi

# ---- 9. Auto-update script ----
cat > /opt/rubric-update.sh <<'UPDATE'
#!/bin/bash
cd /opt/rubric-video
git pull origin claude/plumbing-video-app-nNFSr
docker compose up -d --build
echo "Updated at $(date)"
UPDATE
chmod +x /opt/rubric-update.sh

# ---- Done! ----
echo ""
echo "=========================================="
echo "  SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "  Your app is running at:"
echo "    http://$DOMAIN"
echo ""
echo "  Default login:"
echo "    Name: Boss"
echo "    PIN:  1234"
echo ""
echo "  To update the app later:"
echo "    /opt/rubric-update.sh"
echo ""
echo "  To view logs:"
echo "    docker compose -f $APP_DIR/docker-compose.yml logs -f"
echo ""
echo "=========================================="
