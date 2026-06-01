#!/bin/bash
# OPERIS — Setup inicial do VPS (Ubuntu/Debian)
# Execute como root ou com sudo: sudo bash setup-vps.sh
set -euo pipefail

echo ""
echo "================================================"
echo "  OPERIS — Setup do VPS"
echo "================================================"
echo ""

# 1. Atualizar pacotes
echo "[1/4] Atualizando pacotes..."
apt-get update -q && apt-get upgrade -y -q

# 2. Instalar Docker
echo "[2/4] Instalando Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  # Adicionar usuario atual ao grupo docker (nao root)
  SUDO_USER_HOME=$(getent passwd "${SUDO_USER:-$USER}" | cut -d: -f6)
  usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
  echo "  Docker instalado. Faca logout/login para usar sem sudo."
else
  echo "  Docker ja instalado."
fi

# 3. Configurar firewall (ufw)
echo "[3/4] Configurando firewall (ufw)..."
apt-get install -y -q ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (Operis)'
ufw --force enable
ufw status verbose

# 4. Gerar senhas seguras de exemplo
echo "[4/4] Gerando valores seguros para o .env..."
echo ""
echo "  Cole estes valores no seu .env:"
echo ""
printf "  POSTGRES_PASSWORD=%s\n" "$(openssl rand -base64 24 | tr -d '=+/')"
printf "  JWT_SECRET=%s\n"        "$(openssl rand -base64 32 | tr -d '=+/')"
echo ""
echo "================================================"
echo "  PRONTO! Proximos passos:"
echo ""
echo "  1. cp .env.example .env"
echo "  2. nano .env  (preencher VPS_IP e os valores acima)"
echo "  3. docker compose up -d --build"
echo ""
echo "  App disponivel em: http://$(curl -s ifconfig.me)"
echo "================================================"
echo ""
