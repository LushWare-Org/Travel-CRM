# Quick Start Script for Trip Sky Way Server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Trip Sky Way - Server Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
Write-Host "⚠ Please ensure MongoDB is installed and running" -ForegroundColor Yellow
Write-Host ""

# Check if .env exists
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠ .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file. Please configure it before running the server!" -ForegroundColor Yellow
}
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Create necessary directories
Write-Host "Creating upload directories..." -ForegroundColor Yellow
$directories = @(
    "uploads/images",
    "uploads/documents",
    "uploads/invoices",
    "uploads/itineraries"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✓ Created $dir" -ForegroundColor Green
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure your .env file with database and API keys" -ForegroundColor White
Write-Host "2. Make sure MongoDB is running" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host ""
Write-Host "Quick commands:" -ForegroundColor Yellow
Write-Host "  npm run dev    - Start development server" -ForegroundColor White
Write-Host "  npm start      - Start production server" -ForegroundColor White
Write-Host "  npm test       - Run tests" -ForegroundColor White
Write-Host "  npm run lint   - Check code quality" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  README.md                  - Project overview" -ForegroundColor White
Write-Host "  SETUP.md                   - Detailed setup guide" -ForegroundColor White
Write-Host "  TODO.md                    - Development roadmap" -ForegroundColor White
Write-Host "  INITIALIZATION_COMPLETE.md - What's been done" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Cyan
