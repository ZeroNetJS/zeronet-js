REM @echo off

for /D %%i in (zeronet-*) do (call :install "%%i")



npm i

goto :eof

:install
cd %1
npm i
cd ..
goto :eof
