REM @echo off

for /D %%i in (zeronet-*) do (call :install "%%i")

npm i

:install
 cd %1
 npm i
 cd ..
 GOTO :eof
