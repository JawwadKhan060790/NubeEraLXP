@echo off
cd /d "%~dp0Backend"
echo Running dotnet ef database update...
dotnet ef database update --project NubeEra.Infrastructure --startup-project NubeEra.API --context AppDbContext --verbose > "%~dp0migration_output.log" 2>&1
echo Exit code: %ERRORLEVEL% >> "%~dp0migration_output.log"
echo Done. See migration_output.log
pause
