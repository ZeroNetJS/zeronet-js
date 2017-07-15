REM @echo off

for %%i in (zeronet-*) do cd %%i ; npm i ; cd ..

npm i
