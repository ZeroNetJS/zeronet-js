@echo off

npm i&& for /D %%i in (zeronet-*) do (cd "%%i"&& rd /s /q node_modules&& npm i&& cd ..)

goto :eof
