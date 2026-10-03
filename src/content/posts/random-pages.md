---
title: 使用Cloudflare Workers+Pages制作永久免费的随机图API!
published: 2026-02-02
description: '永久免费的随机图API!'
tags: [随机图, Pages, Workers, 云函数]
category: '白嫖'
series: '教程'
draft: false
---

## 准备工作

1.你的图片

2.一个Cloudflare账号

3.一个域名（必须托管在Cloudflare上）

## 正式开始

1.将你的图片**（格式必须统一）**放在单独的一个文件夹中，并创建一个用于批量重命名的bat脚本（**不要以管理员权限运行！！！）**，代码如下：

```bat
@echo off
setlocal enabledelayedexpansion

:: Check if running as administrator
net session >nul 2>&1
if !errorlevel! equ 0 (
    echo Error: This script should not be run as administrator.
    echo Please run without administrator privileges.
    pause
    exit /b 1
)

set "script_name=%~nx0"
set /a counter=1

echo Renaming files...
echo.

:: First, create a temporary directory to avoid naming conflicts
set "temp_dir=temp_rename_%random%"
mkdir "%temp_dir%"

:: Move all files (except script) to temp directory first
for %%f in (*) do (
    if /i not "%%f"=="%script_name%" (
        if not "%%f"=="%temp_dir%" (
            move "%%f" "%temp_dir%\%%f" >nul
        )
    )
)

:: Rename files from temp directory back with new names
for %%f in ("%temp_dir%\*") do (
    set "filename=%%~nxf"
    set "ext=%%~xf"
    if "!ext!"=="" set "ext="
    set "new_name=!counter!!ext!"
    
    move "%%f" "!new_name!" >nul
    if !errorlevel! equ 0 (
        echo Renamed: "!filename!" --^> "!new_name!"
        set /a counter+=1
    ) else (
        echo Error: Cannot rename "!filename!"
    )
)

:: Remove temporary directory
rmdir "%temp_dir%" /s /q >nul 2>&1

echo.
echo Operation completed. Total files processed: %counter%
pause
```

保存脚本并运行，就完成了图片的重命名。接着将你的图片添加到压缩包里，一会儿需要上传到Cloudflare。



2.登录到你的Cloudflare账号，找到侧边栏的Worker，创建一个pages，选择“上传资产”，名称尽量简短一点。接着将你的压缩包上传上去，点击部署，记住弹出来的那个  {你的pages名称}.pages.dev域名，一会儿要用。



3.再创建一个worker，选择从hello world开始，名称随意。部署完成后选择编辑代码，将里面的内容删完，接着粘贴以下代码：

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const randomNumber = Math.floor(Math.random() * 9) + 1;  //9改为实际的图片数量
  const imageUrl = `https://wdrs-page.pages.dev/${randomNumber}.png`;  //png改为实际的图片格式

  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      return new Response(response.body, {
        headers: { 'Content-Type': 'image/png' }  //这里一样的，改为实际的图片格式
      });
    }
    return new Response('Image not found', { status: 404 });
  } catch (error) {
    return new Response('Service unavailable', { status: 503 });
  }
}
```

按照代码右边的注释改完后，点击部署



4.给worker绑定一个自定义域名，就可以访问了！
