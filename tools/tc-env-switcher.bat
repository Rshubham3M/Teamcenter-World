@echo off
:: ====================================================================
:: Teamcenter Environment Switcher Script
:: Description: Quickly swap environment variables (TC_ROOT, TC_DATA) 
::              and load the corresponding shell profiles.
:: ====================================================================

title Teamcenter Environment Switcher

echo ===================================================
echo   TEAMCENTER ENVIRONMENT SWAPPER
echo ===================================================
echo.
echo Please select the environment to load:
echo [1] DEV  - Development Environment (Local)
echo [2] QA   - Quality Assurance Environment
echo [3] PROD - Production Environment (Read-Only Warning)
echo.

set /p choice="Enter choice (1-3): "

if "%choice%"=="1" goto DEV
if "%choice%"=="2" goto QA
if "%choice%"=="3" goto PROD
echo Invalid Choice. Exiting.
goto END

:DEV
set TC_ROOT=C:\Siemens\Teamcenter14\TC_ROOT
set TC_DATA=C:\Siemens\Teamcenter14\TC_DATA
set TC_ENV_NAME=DEV
goto SET_ENV

:QA
set TC_ROOT=\\qa-server\Siemens\TC_ROOT
set TC_DATA=\\qa-server\Siemens\TC_DATA
set TC_ENV_NAME=QA
goto SET_ENV

:PROD
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo WARNING: YOU ARE CONNECTING TO THE PRODUCTION SERVER
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo.
set /p confirm="Are you sure you want to proceed? (Y/N): "
if /i not "%confirm%"=="Y" goto END
set TC_ROOT=\\prod-server\Siemens\TC_ROOT
set TC_DATA=\\prod-server\Siemens\TC_DATA
set TC_ENV_NAME=PROD
goto SET_ENV

:SET_ENV
echo.
echo Setting Teamcenter Environment to [%TC_ENV_NAME%]...
echo TC_ROOT: %TC_ROOT%
echo TC_DATA: %TC_DATA%
echo.

if not exist "%TC_DATA%\tc_profilevars.bat" (
    echo [ERROR] tc_profilevars.bat not found at %TC_DATA%\tc_profilevars.bat
    echo Please check your paths and server connections.
    pause
    goto END
)

:: Call profile variables to load environments
call "%TC_DATA%\tc_profilevars.bat"

echo.
echo ===================================================
echo Teamcenter [%TC_ENV_NAME%] successfully loaded!
echo Active Schema: %TC_ENV_NAME%
echo Ready to run Teamcenter command-line utilities.
echo ===================================================
echo.
cmd /k

:END
pause
