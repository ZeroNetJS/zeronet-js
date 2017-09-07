@echo off

npm i&& for /D %%i in (zeronet-*) do (cd "%%i"&& mklink /D node_modules ..\node_modules&& cd ..)

goto :eof
