# OPERIS — prepara API local (PostgreSQL + Prisma + seed)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== OPERIS — Setup da API ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Criado backend/.env a partir de .env.example" -ForegroundColor Yellow
}

Write-Host "Testando PostgreSQL em localhost:5432..." -ForegroundColor Gray
$pgOk = $false
try {
  $tcp = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
  $pgOk = $tcp.TcpTestSucceeded
} catch { $pgOk = $false }

if (-not $pgOk) {
  Write-Host ""
  Write-Host "ERRO: PostgreSQL nao esta rodando na porta 5432." -ForegroundColor Red
  Write-Host "Siga: docs\INSTALAR-POSTGRES-WINDOWS.md" -ForegroundColor Yellow
  exit 1
}

Write-Host "Gerando Prisma Client..." -ForegroundColor Gray
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Aplicando migrations..." -ForegroundColor Gray
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Executando seed..." -ForegroundColor Gray
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "OK! Inicie a API com: npm run dev" -ForegroundColor Green
Write-Host "Health: http://localhost:3003/health" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3002/login" -ForegroundColor Green
