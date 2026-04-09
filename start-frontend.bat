@echo off
cd /d %~dp0frontend
if not exist .env.local copy .env.local.example .env.local
npm install
npm run dev
