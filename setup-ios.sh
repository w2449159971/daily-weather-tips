#!/bin/bash
# 在 Mac 上生成/更新 iOS 工程，并用 Xcode 安装到 iPhone
set -e
cd "$(dirname "$0")"

echo "→ 安装依赖…"
npm install

if [ ! -d ios/App ]; then
  echo "→ 首次创建 iOS 工程…"
  mkdir -p ios
  tar -xzf node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz -C ios
fi

echo "→ 同步网页资源到 App…"
npx cap sync ios

echo ""
echo "=========================================="
echo "  下一步（在 Xcode 中安装到 iPhone）"
echo "=========================================="
echo "1. 将自动打开 Xcode"
echo "2. 用数据线连接 iPhone 16 Pro，在手机上点「信任」"
echo "3. 顶部选择你的 iPhone 作为运行设备"
echo "4. 左侧选中 App → Signing & Capabilities"
echo "   - 勾选 Automatically manage signing"
echo "   - Team 选你的 Apple ID（免费账号即可）"
echo "5. 点击 ▶ 运行，首次在 iPhone：设置 → 通用 → VPN与设备管理 → 信任开发者"
echo ""
echo "免费 Apple ID 安装的 App 约 7 天需重新安装；"
echo "上架 App Store 需 Apple Developer 计划（¥688/年）。"
echo "=========================================="
echo ""

npx cap open ios
