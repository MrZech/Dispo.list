#!/usr/bin/env bash
set -euo pipefail

CTID="112"
HOSTNAME="dispolistVM"
STORAGE="local-zfs"
TEMPLATE_STORAGE="local"
DISK_SIZE="32"
MEMORY="4096"
CORES="2"
BRIDGE="vmbr0"
REPO_URL="https://github.com/MrZech/Dispo.list.git"

if ! command -v pct >/dev/null 2>&1; then
  echo "pct not found. Run this on the Proxmox host as root."
  exit 1
fi

pveam update >/dev/null
TEMPLATE="$(pveam available --section system | awk '/debian-12-standard/ {print $2}' | tail -n 1)"
if [[ -z "${TEMPLATE}" ]]; then
  echo "No Debian 12 template found in pveam."
  exit 1
fi

if ! pveam list "${TEMPLATE_STORAGE}" | awk '{print $1}' | grep -q "${TEMPLATE}"; then
  pveam download "${TEMPLATE_STORAGE}" "${TEMPLATE}"
fi

if pct status "${CTID}" >/dev/null 2>&1; then
  echo "CT ${CTID} already exists. Aborting."
  exit 1
fi

pct create "${CTID}" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" \
  --hostname "${HOSTNAME}" \
  --rootfs "${STORAGE}:${DISK_SIZE}" \
  --memory "${MEMORY}" \
  --cores "${CORES}" \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp" \
  --features "nesting=1,keyctl=1" \
  --unprivileged 0 \
  --onboot 1

pct start "${CTID}"

cat <<'EOF' | pct exec "${CTID}" -- env REPO_URL="${REPO_URL}" bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release git openssl

if command -v timedatectl >/dev/null 2>&1; then
  timedatectl set-timezone America/Chicago || true
fi

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

mkdir -p /opt
if [[ ! -d /opt/dispolist ]]; then
  git clone "${REPO_URL}" /opt/dispolist
fi

cd /opt/dispolist
git config --global --add safe.directory /opt/dispolist

if [[ ! -f /opt/dispolist/.env ]]; then
  POSTGRES_USER="dispolist"
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
  POSTGRES_DB="dispolist"
  SESSION_SECRET="$(openssl rand -hex 32)"
  APP_PORT="6000"
  cat > /opt/dispolist/.env <<ENV
APP_PORT=${APP_PORT}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
SESSION_SECRET=${SESSION_SECRET}
DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
AI_INTEGRATIONS_OPENAI_API_KEY=
AI_INTEGRATIONS_OPENAI_BASE_URL=
ENV
fi

docker compose up -d --build

cat > /usr/local/bin/dispolist-update <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
cd /opt/dispolist
git pull --rebase
docker compose up -d --build
SCRIPT
chmod +x /usr/local/bin/dispolist-update

cat > /etc/systemd/system/dispolist-update.service <<'SERVICE'
[Unit]
Description=Update DispoList from Git and restart containers

[Service]
Type=oneshot
ExecStart=/usr/local/bin/dispolist-update
WorkingDirectory=/opt/dispolist
SERVICE

cat > /etc/systemd/system/dispolist-update.timer <<'TIMER'
[Unit]
Description=Nightly DispoList update at 8PM Central

[Timer]
OnCalendar=*-*-* 20:00:00
Persistent=true

[Install]
WantedBy=timers.target
TIMER

systemctl daemon-reload
systemctl enable --now dispolist-update.timer
EOF

echo "Done. Container ${CTID} (${HOSTNAME}) is running with Docker and Portainer."
echo "App: http://<container-ip>:6000"
echo "Portainer: http://<container-ip>:9000"
