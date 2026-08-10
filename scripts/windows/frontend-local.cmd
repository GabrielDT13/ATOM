@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0frontend-local.ps1" %*
