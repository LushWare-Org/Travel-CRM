#!/usr/bin/env pwsh

# Trip Sky Way - Management Portal Quick Start

Write-Host "🚀 Trip Sky Way - Management Portal Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$managementPath = $scriptPath

Write-Host ""
Write-Host "📁 Management Directory: $managementPath" -ForegroundColor Cyan

# Navigate to Management directory
Set-Location $managementPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✅ node_modules found" -ForegroundColor Green
}

# Check .env file
Write-Host ""
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating one..." -ForegroundColor Yellow
    @"
VITE_API_URL=http://localhost:5000/api/v1
REACT_APP_API_URL=http://localhost:5000/api/v1
VITE_USE_API=true
REACT_APP_ENV=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Get-Content ".env" | ForEach-Object { Write-Host "   $_" }

Write-Host ""
Write-Host "🎯 Important: Make sure the backend is running on http://localhost:5000" -ForegroundColor Yellow
Write-Host ""

# Start development server
Write-Host "▶️  Starting Management Portal..." -ForegroundColor Green
Write-Host "📱 The app will open at http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Default Credentials:" -ForegroundColor Yellow
Write-Host "   Email: admin@tripskyway.com" -ForegroundColor White
Write-Host "   Password: Admin@123456" -ForegroundColor White
Write-Host ""

npm run dev

