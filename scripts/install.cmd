REM @echo off

for /D %%i in (zeronet-*) do (cd "%%i"&& npm i&& cd "%%i")



npm i

goto :eof
