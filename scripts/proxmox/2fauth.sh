#!/usr/bin/env bash
set -euo pipefail

# =========================
# User-configurable settings
# =========================
CTID="${CTID:-132}"
HOSTNAME="${HOSTNAME:-2fauth}"
BRIDGE="${BRIDGE:-vmbr0}"
STORAGE="${STORAGE:-sLot2}"                 # e.g. local-lvm, local-zfs, etc.
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}" # usually "local"
DISK_GB="${DISK_GB:-4}"
CORES="${CORES:-1}"
RAM_MB="${RAM_MB:-1024}"
UNPRIVILEGED="${UNPRIVILEGED:-1}"           # 1 = unprivileged
START_ON_BOOT="${START_ON_BOOT:-1}"

# Network (DHCP default)
NET_MODE="${NET_MODE:-dhcp}"                # dhcp | static
IP="${IP:-}"                                # static only, e.g. 192.168.1.80/24
GW="${GW:-}"                                # static only, e.g. 192.168.1.1
DNS="${DNS:-1.1.1.1}"

# Debian template
DEB_VER="${DEB_VER:-13}"
# =========================

err() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || err "Missing required command: $1"; }

need pct
need pveam
need pvesm
need awk
need sed
need grep
need curl
need openssl
need tar

if pct status "$CTID" >/dev/null 2>&1; then
  err "CTID $CTID already exists. Pick another CTID (export CTID=###) or remove it."
fi

echo "[1/7] Checking storage..."
if ! pvesm status | awk '{print $1}' | grep -qx "$STORAGE"; then
  err "Storage '$STORAGE' not found. Set STORAGE=... to a valid Proxmox storage name."
fi

echo "[2/7] Ensuring Debian template is available..."
pveam update >/dev/null
TEMPLATE="$(pveam available --section system | awk '$2 ~ /^debian-'"$DEB_VER"'-standard_/ {print $2}' | sort -V | tail -n 1)"
if [[ -z "${TEMPLATE:-}" ]]; then
  err "Could not find a Debian $DEB_VER LXC template via pveam."
fi

if [[ ! -f "/var/lib/vz/template/cache/${TEMPLATE}" ]]; then
  echo "Downloading template: $TEMPLATE"
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"
fi

NET0="name=eth0,bridge=${BRIDGE},firewall=1"
if [[ "$NET_MODE" == "dhcp" ]]; then
  NET0="${NET0},ip=dhcp"
elif [[ "$NET_MODE" == "static" ]]; then
  [[ -n "$IP" && -n "$GW" ]] || err "Static mode requires IP=... and GW=..."
  NET0="${NET0},ip=${IP},gw=${GW}"
else
  err "NET_MODE must be 'dhcp' or 'static'"
fi

echo "[3/7] Creating container CT ${CTID}..."
pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" \
  --memory "$RAM_MB" \
  --swap 0 \
  --rootfs "${STORAGE}:${DISK_GB}" \
  --net0 "$NET0" \
  --unprivileged "$UNPRIVILEGED" \
  --features "keyctl=1,nesting=1" \
  --onboot "$START_ON_BOOT" \
  --timezone host \
  --nameserver "$DNS" \
  --ostype debian >/dev/null

echo "[4/7] Starting container..."
pct start "$CTID"
sleep 3

echo "[5/7] Installing OS packages in CT..."
pct exec "$CTID" -- bash -lc "set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y dist-upgrade

apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git unzip tar openssl \
  nginx mariadb-server mariadb-client \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-xml php8.4-mbstring php8.4-curl php8.4-zip php8.4-gd php8.4-bcmath php8.4-intl

if ! command -v composer >/dev/null 2>&1; then
  curl -fsSL https://getcomposer.org/installer -o /tmp/composer-setup.php
  php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
fi

systemctl enable --now mariadb
systemctl enable --now nginx
systemctl enable --now php8.4-fpm
"

echo "[6/7] Deploying 2FAuth..."
DB_NAME="2fauth_db"
DB_USER="2fauth"
DB_PASS="$(openssl rand -base64 18 | tr -d '=+/ ' | cut -c1-24)"

pct exec "$CTID" -- bash -lc "set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export COMPOSER_ALLOW_SUPERUSER=1

# ---- FIXED: no backticks, avoid command-substitution issues ----
mysql -uroot <<'SQL'
CREATE DATABASE IF NOT EXISTS 2fauth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '2fauth'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON 2fauth_db.* TO '2fauth'@'localhost';
FLUSH PRIVILEGES;
SQL
# --------------------------------------------------------------

API_JSON=\$(curl -fsSL https://api.github.com/repos/Bubka/2FAuth/releases/latest)
TARBALL_URL=\$(echo \"\$API_JSON\" | grep -Eo '\"tarball_url\"\\s*:\\s*\"[^\"]+\"' | head -n1 | sed -E 's/.*\"(https:[^\"]+)\".*/\\1/')
[[ -n \"\$TARBALL_URL\" ]] || { echo 'Failed to find tarball_url'; exit 1; }

rm -rf /opt/2fauth
mkdir -p /opt/2fauth
curl -fsSL \"\$TARBALL_URL\" -o /tmp/2fauth.tar.gz
tar -xzf /tmp/2fauth.tar.gz -C /opt/2fauth --strip-components=1
rm -f /tmp/2fauth.tar.gz

cd /opt/2fauth
cp -f .env.example .env

sed -i -E \"s|^DB_CONNECTION=.*|DB_CONNECTION=mysql|\" .env
sed -i -E \"s|^DB_HOST=.*|DB_HOST=127.0.0.1|\" .env
sed -i -E \"s|^DB_PORT=.*|DB_PORT=3306|\" .env
sed -i -E \"s|^DB_DATABASE=.*|DB_DATABASE=2fauth_db|\" .env
sed -i -E \"s|^DB_USERNAME=.*|DB_USERNAME=2fauth|\" .env
sed -i -E \"s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|\" .env

# Prevent Composer audit from blocking dependency resolution due to advisories
composer config audit.block-insecure false

# Prefer lockfile install; fall back to update if needed
if ! composer install --no-dev --prefer-dist --no-interaction --no-plugins --no-scripts; then
  composer update -W --no-interaction --no-plugins --no-scripts
  composer install --no-dev --prefer-dist --no-interaction --no-plugins --no-scripts
fi

php artisan key:generate --force
php artisan migrate --force
php artisan passport:install -q -n
php artisan storage:link
php artisan config:cache

chown -R www-data:www-data /opt/2fauth
chmod -R 755 /opt/2fauth

cat >/etc/nginx/conf.d/2fauth.conf <<'EOF'
server {
  listen 80;
  root /opt/2fauth/public;
  index index.php;
  charset utf-8;

  location / {
    try_files \$uri \$uri/ /index.php?\$query_string;
  }

  location ~ \.php\$ {
    include fastcgi_params;
    fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
    fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
  }

  location ~ /\.(?!well-known).* {
    deny all;
  }
}
EOF

nginx -t
systemctl reload nginx
"

CT_IP="$(pct exec "$CTID" -- bash -lc "ip -4 -o addr show dev eth0 | awk '{print \$4}' | cut -d/ -f1 | head -n1" || true)"
if [[ -z "${CT_IP:-}" ]]; then
  echo "NOTE: Could not auto-detect CT IPv4. Check inside CT: ip a"
  CT_IP="(unknown)"
fi

if [[ "$CT_IP" != "(unknown)" ]]; then
  pct exec "$CTID" -- bash -lc "sed -i -E 's|^APP_URL=.*|APP_URL=http://${CT_IP}|' /opt/2fauth/.env && chown www-data:www-data /opt/2fauth/.env"
fi

echo "[7/7] Done."
echo "2FAuth should be reachable at: http://${CT_IP}"
echo
echo "MariaDB credentials (stored in /opt/2fauth/.env inside the CT):"
echo "  DB_NAME=${DB_NAME}"
echo "  DB_USER=${DB_USER}"
echo "  DB_PASS=${DB_PASS}"
