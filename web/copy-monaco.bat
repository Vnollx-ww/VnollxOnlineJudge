@echo off
echo 复制 Monaco Editor 到 public 目录...

if not exist "public\monaco" mkdir "public\monaco"

xcopy "node_modules\monaco-editor\min\vs" "public\monaco\vs" /E /I /Y > nul

if %errorlevel% equ 0 (
    echo ✅ Monaco Editor 已成功复制到 public/monaco/vs/
) else (
    echo ❌ 复制失败，请检查路径是否正确
)

pause
