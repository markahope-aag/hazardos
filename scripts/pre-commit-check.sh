#!/bin/bash
# HazardOS Pre-Commit Check Script
# Run this before committing code to ensure all quality checks pass

echo "🔍 Running HazardOS pre-commit checks..."

# TypeScript Check
echo ""
echo "1️⃣ Running TypeScript check..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript check failed!"
    exit 1
fi
echo "✅ TypeScript check passed!"

# Linting
echo ""
echo "2️⃣ Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed!"
    exit 1
fi
echo "✅ Linting passed!"

# Build Test
echo ""
echo "3️⃣ Running build test..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build test passed!"

echo ""
echo "🎉 All pre-commit checks passed! Ready to commit."
echo "📝 Don't forget to update documentation if needed."