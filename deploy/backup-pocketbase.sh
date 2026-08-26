#!/usr/bin/env bash
# 每日备份 PocketBase：SQLite 一致性快照 + 上传文件目录打包，保留最近 N 天。
# crontab 示例： 15 4 * * * /opt/monostich/backup-pocketbase.sh >> /var/log/pb-backup.log 2>&1
set -euo pipefail

PB_DATA="${PB_DATA:-/opt/monostich/pb/pb_data}"
DEST="${DEST:-/var/backups/monostich/pocketbase}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F_%H%M)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# SQLite 在线一致性备份（不锁库）
sqlite3 "$PB_DATA/data.db" ".backup '$TMP/data.db'"

# 上传的附件与内置备份目录
tar -C "$(dirname "$PB_DATA")" -czf "$TMP/storage.tgz" "$(basename "$PB_DATA")/storage"

mkdir -p "$DEST"
tar -C "$TMP" -czf "$DEST/pb_$STAMP.tgz" .
find "$DEST" -name 'pb_*.tgz' -mtime +"$KEEP_DAYS" -delete
echo "[$(date '+%F %T')] 备份完成: $DEST/pb_$STAMP.tgz ($(du -h "$DEST/pb_$STAMP.tgz" | cut -f1))"
