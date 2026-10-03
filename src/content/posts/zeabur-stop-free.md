---
title: Zeabur已经停止向免费计划提供免费共享集群
published: 2026-03-29
description: 'Zeabur已经停止向免费计划提供免费共享集群！这意味着将无法继续白嫖免费的云容器'
tags: [云函数]
category: '白嫖'
series: 'CDN'
draft: false
---

## Zeabur是什么

Zeabur 是一个可以帮助你部署服务的平台，无论你使用什么编程语言或开发框架，你都只需要通过几个简单的按钮进行部署。

## 发生了什么

Zeabur之前提供的免费计划每月有5刀的免费额度可以用来部署Docker容器到腾讯云硅谷和字节跳动雅加达的共享集群。但是现在Zeabur已经停止向免费计划提供免费共享集群，这意味着将无法继续白嫖免费的云容器。
 
 在Zeabur的https://zeabur.com/changelogs/phasing-out-shared-cluster  这篇公告中，Zeabur表示会继续维持已经部署在免费共享集群上的服务，即使我们不选择迁移。
 ![](../../assets/images/posts/zeaburstopfree.PNG)

 但是随后在Zeabur的论坛中，Zeabur员工表示sjc1共享集群（腾讯云硅谷集群）已经转为付费集群，不再向用户免费提供。原文：https://zeabur.com/forum/posts/69b8c29b61b2cfff7ee08784

 ![](../../assets/images/posts/zeaburstopfree2.PNG)

 也就是说Zeabur会继续维持已经部署在免费共享集群上的服务，但是用户需要支付费用升级计划才能继续使用。(我的理解)

 我的两个服务（Openlist和UptimeKuma）都已于2026/3/8日被停止，要想重启服务需要升级到付费计划。

 # 怎么办
 现在最大的问题是应该怎样把数据提取出来，要想通过文件管理提取数据需要先运行项目，但这样需要付费计划。如果想通过备份的方式提取数据，也需要先升级到付费计划。（说白了都要交钱）

 # 替代方案

 1.老实交钱，升级计划。
 
 2.把服务换到其它平台，如ClawCloudRun。虽然ClawCloudRun要求每30天登录一次控制台，但是Github有很多个自动登录控制台的项目，可以试下。自动续期方式详见 https://blog.wudarensheng.top/posts/clawcloudrun-free-docker/

 自动续期脚本仓库
 
 ::github{repo="Kystor/auto-login-clawcloud"}

