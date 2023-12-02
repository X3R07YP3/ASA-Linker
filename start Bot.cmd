@echo off
color 9
echo do not close
:Restart
start "ASA-Linker" /wait node index.js
color C
echo The bot has been closed due to a failure.
color
goto Restart
