@echo off

set fname=%~dpn0

node "%fname%.js" >"%fname%.log" 2>&1
