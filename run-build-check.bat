@echo off
cd /d "%~dp0Backend"
echo Building solution...
dotnet build NubeEra-ms.slnx 2>&1 > "%~dp0build_errors.log"
echo Exit code: %ERRORLEVEL% >> "%~dp0build_errors.log"
echo Build complete. Output saved to build_errors.log
pause
