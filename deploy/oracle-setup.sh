#!/usr/bin/env bash
# One-shot setup for a fresh Oracle Cloud Ampere (ARM) Always Free VM (Ubuntu).
# Run on the VM as: curl -fsSL <raw-url-to-this-file> | bash -s -- <git-repo-url>
# or: scp this repo up and run ./deploy/oracle-setup.sh <git-repo-url>
set -euo pipefail

REPO_URL="${1:?usage: oracle-setup.sh <git-repo-url>}"
APP_DIR="$HOME/financeiro"

# Docker + compose plugin
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# Oracle's Ubuntu images ship iptables rules that drop everything but SSH by default.
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  IP=$(curl -s ifconfig.me)
  IP_DASHED=$(echo "$IP" | tr '.' '-')
  sed -i "s/{VM_PUBLIC_IP_DASHED}/$IP_DASHED/" Caddyfile
  cat > .env.prod <<EOF
JWT_SECRET=$(openssl rand -hex 32)
CORS_ALLOWED_ORIGINS=*
# Banco: Neon (https://console.neon.tech). Copie a connection string do branch "production".
SPRING_DATASOURCE_URL=jdbc:postgresql://SEU-HOST.neon.tech/neondb?sslmode=require
DB_USER=neondb_owner
DB_PASSWORD=
EOF
  echo "Gerado .env.prod e configurado Caddyfile para https://${IP_DASHED}.sslip.io"
  echo "Edite .env.prod e preencha SPRING_DATASOURCE_URL/DB_USER/DB_PASSWORD do Neon antes de continuar."
  exit 0
fi

sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "Pronto. App em https://$(grep -o '[0-9-]*\.sslip\.io' Caddyfile)"
echo "Lembre de abrir as portas 80/443 no Security List/NSG do VCN no console da Oracle."
