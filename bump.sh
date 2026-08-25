#!/bin/bash
# 静的ファイルの版番号を上げる。
# GitHub Pages は CSS/JS を10分キャッシュするので、直したら必ずこれを実行してから push すること。
# 実行するだけでよい（引数なし）。
set -e
cd "$(dirname "$0")"
NEW=$(date +%Y%m%d%H%M)
for f in index.html member.html admin.html; do
  perl -pi -e "s/(assets\/(?:css|js)\/[a-z]+\.(?:css|js))\?v=[0-9]+/\$1?v=$NEW/g" "$f"
done
echo "版番号を $NEW にしました"
grep -o 'v=[0-9]*' index.html | head -1
