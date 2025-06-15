@echo off
REM Batch script to run back.py from the current directory
gitingest . --exclude-pattern "digest.txt"

IF EXIST back.py (
    python back.py
) ELSE (
    echo Error: back.py not found in the current directory.
)
