@echo off

npm i&& for /D %%i in (zeronet-*) do (cd "%%i"&& npm i&& cd ..)

goto :eof
