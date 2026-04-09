@echo off
cd /d %~dp0backend
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
if not exist .env copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
