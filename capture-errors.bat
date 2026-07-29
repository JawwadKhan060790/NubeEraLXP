@echo off
cd /d "%~dp0Backend"
dotnet build NubeEra.Infrastructure/NubeEra.Infrastructure.csproj > "%~dp0build_errors.log" 2>&1
echo --- Infrastructure exit: %ERRORLEVEL% >> "%~dp0build_errors.log"
dotnet build NubeEra.API/NubeEra.API.csproj >> "%~dp0build_errors.log" 2>&1
echo --- API exit: %ERRORLEVEL% >> "%~dp0build_errors.log"
pause
