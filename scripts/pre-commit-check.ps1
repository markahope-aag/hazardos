# HazardOS Pre-Commit Check Script
# Run this before committing code to ensure all quality checks pass

Write-Host "🔍 Running HazardOS pre-commit checks..." -ForegroundColor Cyan

# TypeScript Check
Write-Host "`n1️⃣ Running TypeScript check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript check failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ TypeScript check passed!" -ForegroundColor Green

# Linting
Write-Host "`n2️⃣ Running ESLint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Linting failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Linting passed!" -ForegroundColor Green

# Build Test
Write-Host "`n3️⃣ Running build test..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build test passed!" -ForegroundColor Green

Write-Host "`n🎉 All pre-commit checks passed! Ready to commit." -ForegroundColor Green
Write-Host "📝 Don't forget to update documentation if needed." -ForegroundColor Cyan