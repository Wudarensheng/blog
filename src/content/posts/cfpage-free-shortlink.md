---
title: 基于Cloudflare Pages的纯静态短链
published: 2026-04-05
description: '基于Cloudflare Pages的纯静态短链，无需服务器和存储，即可实现短链功能'
tags: [云函数, 短链, Cloudflare , Cloudflare Pages, Cloudflare Worker, CDN]
category: '白嫖'
series: 'CDN'
draft: false
---

## 前言

众所周知，正常情况下，我们想要制作一个短链需要把数据存在KV或数据库中，但这样需要服务器和存储，且速度较慢。

虽然Cloudflare Worker这样的Serverless云函数访问速度快且免费，但仍然弥补不了向KV/数据库获取数据所造成的延迟。并且Worker还容易被人恶意刷访问次数导致服务宕机。

## 解决方案

既然动态的不行，那我们就来玩静态的。所以这个项目诞生了（灵感来源二叉树树大佬）

::github{repo="Wudarensheng/CloudflarePages-ShortLink-Quicklink"}

该项目通过将链接写进配置文件中，再在构建时按照文件构建出不同路径的静态HTML文件实现短链功能。并且还做了选择功能，访问一个短链路径可选择前往不同的链接。

最方便的是它静态的属性，只要一个静态网页托管服务就可以实现全球高速访问。

如果你的托管服务支持NodeJS，那么你可以把项目塞到Git仓库然后链接进行部署。

没有NodeJS也不用慌，在本地安装NodeJS构建完成上传即可。

整个构建速度非常快，在Cloudflare Pages上构建6个链接只需要18s。