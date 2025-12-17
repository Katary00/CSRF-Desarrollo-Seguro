@echo off
echo ========================================
echo  DEFENSAS CONTRA CSRF - Menu Principal
echo ========================================
echo.
echo Selecciona que demos quieres ejecutar:
echo.
echo 1. Demostrar el ATAQUE (vulnerable + atacante)
echo 2. Defensa 1: Token Anti-CSRF
echo 3. Defensa 2A: SameSite=Strict
echo 4. Defensa 2B: SameSite=Lax (Recomendado)
echo 5. Defensa 2C: SameSite=None
echo 6. Defensa 3: Verificacion de Headers
echo 7. EJECUTAR TODAS LAS DEFENSAS (3 ventanas)
echo 8. Salir
echo.
set /p opcion="Ingresa tu opcion (1-8): "

if "%opcion%"=="1" goto ataque
if "%opcion%"=="2" goto token
if "%opcion%"=="3" goto strict
if "%opcion%"=="4" goto lax
if "%opcion%"=="5" goto none
if "%opcion%"=="6" goto headers
if "%opcion%"=="7" goto todas
if "%opcion%"=="8" goto fin

:ataque
echo.
echo Iniciando DEMO DEL ATAQUE...
echo Terminal 1: Aplicacion Vulnerable (puerto 3000)
echo Terminal 2: Sitio Atacante (puerto 3001)
echo.
start cmd /k "npm run start:vulnerable"
timeout /t 2 /nobreak >nul
start cmd /k "npm run start:attacker"
echo.
echo URLs:
echo - Vulnerable: http://localhost:3000
echo - Atacante: http://localhost:3001
echo.
echo Credenciales: ana / contrasena
echo.
pause
goto menu

:token
echo.
echo Iniciando Defensa 1: Token Anti-CSRF...
start cmd /k "npm run defense:token"
echo.
echo URL: http://localhost:3010
echo Credenciales: ana / contrasena
echo.
pause
goto menu

:strict
echo.
echo Iniciando Defensa 2A: SameSite=Strict...
start cmd /k "npm run defense:strict"
echo.
echo URL: http://localhost:3020
echo Credenciales: ana / contrasena
echo.
pause
goto menu

:lax
echo.
echo Iniciando Defensa 2B: SameSite=Lax (RECOMENDADO)...
start cmd /k "npm run defense:lax"
echo.
echo URL: http://localhost:3021
echo Credenciales: ana / contrasena
echo.
pause
goto menu

:none
echo.
echo Iniciando Defensa 2C: SameSite=None (VULNERABLE)...
start cmd /k "npm run defense:none"
echo.
echo URL: http://localhost:3022
echo Credenciales: ana / contrasena
echo.
pause
goto menu

:headers
echo.
echo Iniciando Defensa 3: Verificacion de Headers...
start cmd /k "npm run defense:headers"
echo.
echo URL: http://localhost:3030
echo Credenciales: ana / contrasena
echo.
pause
goto menu

:todas
echo.
echo Iniciando TODAS LAS DEFENSAS...
echo Esto abrira 3 ventanas de terminal
echo.
start cmd /k "npm run defense:token"
timeout /t 2 /nobreak >nul
start cmd /k "npm run defense:lax"
timeout /t 2 /nobreak >nul
start cmd /k "npm run defense:headers"
echo.
echo URLs abiertas:
echo - Token CSRF: http://localhost:3010
echo - SameSite Lax: http://localhost:3021
echo - Headers: http://localhost:3030
echo.
pause
goto menu

:menu
cls
echo.
echo ========================================
echo  Presiona cualquier tecla para volver al menu
echo  o cierra esta ventana para salir
echo ========================================
pause >nul
cls
goto inicio

:inicio
cls
echo ========================================
echo  DEFENSAS CONTRA CSRF - Menu Principal
echo ========================================
echo.
echo Selecciona que demos quieres ejecutar:
echo.
echo 1. Demostrar el ATAQUE (vulnerable + atacante)
echo 2. Defensa 1: Token Anti-CSRF
echo 3. Defensa 2A: SameSite=Strict
echo 4. Defensa 2B: SameSite=Lax (Recomendado)
echo 5. Defensa 2C: SameSite=None
echo 6. Defensa 3: Verificacion de Headers
echo 7. EJECUTAR TODAS LAS DEFENSAS (3 ventanas)
echo 8. Salir
echo.
set /p opcion="Ingresa tu opcion (1-8): "

if "%opcion%"=="1" goto ataque
if "%opcion%"=="2" goto token
if "%opcion%"=="3" goto strict
if "%opcion%"=="4" goto lax
if "%opcion%"=="5" goto none
if "%opcion%"=="6" goto headers
if "%opcion%"=="7" goto todas
if "%opcion%"=="8" goto fin
goto inicio

:fin
echo.
echo Gracias por usar el demo de CSRF!
echo.
pause
