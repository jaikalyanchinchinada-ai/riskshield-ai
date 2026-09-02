#!/usr/bin/env bash
# RiskShield AI — one-command local setup.
# Runs every step from the README's "Local Setup" section in order.
# Safe to re-run any time (the seed step wipes and regenerates demo data).
set -e

echo "==> Installing Node dependencies..."
npm install

echo "==> Installing Python ML dependencies..."
pip install -r ml/requirements.txt --break-system-packages || pip install -r ml/requirements.txt

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Applying database schema (npx prisma migrate dev)..."
npx prisma migrate dev --name init

echo "==> Generating synthetic dataset..."
npm run ml:generate-data

echo "==> Training the ML anomaly model..."
npm run ml:train

echo "==> Seeding the database..."
npm run seed

echo ""
echo "All set! Run 'npm run dev' and open http://localhost:3000"
