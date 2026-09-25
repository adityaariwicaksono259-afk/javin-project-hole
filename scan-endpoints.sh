#!/data/data/com.termux/files/usr/bin/bash
# Scan semua endpoint — kategorikan by format response
EP_FILE="$HOME/javin-cf/public/endpoints.json"
BASE="https://jvin.pages.dev/api/proxy"
OUT="$HOME/javin-scan.txt"
TMP_EP="$HOME/.javin-scan-eps.txt"
TMP_RESP="$HOME/.javin-scan-resp.bin"

python3 << PYEOF > "$TMP_EP"
import json
with open("$EP_FILE") as f:
    data = json.load(f)
eps = data if isinstance(data, list) else (data.get('endpoints') or data.get('data') or [])
for e in eps:
    cid = e.get('catalogId') or ''
    name = e.get('name') or ''
    folder = e.get('folder') or ''
    params = e.get('params') or []
    pr = ','.join(p.get('n','') for p in params)
    print(f"{cid}|{name}|{folder}|{pr}")
PYEOF

echo "════════════════════════════════════" | tee "$OUT"
echo " JAVIN ENDPOINT SCAN — $(date '+%Y-%m-%d %H:%M')" | tee -a "$OUT"
echo "════════════════════════════════════" | tee -a "$OUT"

IDX=0
OK_IMG=0; OK_JSON=0; OK_TEXT=0; ERR=0; TMO=0; SKIP=0

while IFS='|' read -r cid name folder pr; do
  IDX=$((IDX+1))
  if [ -z "$pr" ]; then
    echo "[$IDX] SKIP|$cid|$name|$folder|no-param" | tee -a "$OUT"
    SKIP=$((SKIP+1)); continue
  fi

  P1=$(echo "$pr" | cut -d',' -f1)
  case "$P1" in
    url|link) VAL="https://vt.tiktok.com/ZSbJ1McuT/" ;;
    q|query|search|kata|name|nama|username|user|s) VAL="naruto" ;;
    text|pesan|prompt) VAL="halo" ;;
    image|img|photo) VAL="https://i.pravatar.cc/300" ;;
    city|kota) VAL="jakarta" ;;
    source|target|lang|from|to) VAL="en" ;;
    surah|ayat) VAL="1" ;;
    *) VAL="test" ;;
  esac

  ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$VAL")
  URL="$BASE?id=$cid&$P1=$ENC&uid=scan-$(date +%s%N | tail -c 8)"

  RES=$(curl -s -m 12 -o "$TMP_RESP" -w "%{http_code}|%{content_type}" "$URL" 2>/dev/null)
  CODE=$(echo "$RES" | cut -d'|' -f1)
  CT=$(echo "$RES" | cut -d'|' -f2)

  if [ -z "$CODE" ] || [ "$CODE" = "000" ]; then
    echo "[$IDX] TMO|$cid|$name|$folder|timeout" | tee -a "$OUT"
    TMO=$((TMO+1)); continue
  fi
  if [ "$CODE" != "200" ]; then
    PREV=$(head -c 60 "$TMP_RESP" | tr '\n' ' ')
    echo "[$IDX] ERR|$cid|$name|$folder|HTTP$CODE:$PREV" | tee -a "$OUT"
    ERR=$((ERR+1)); continue
  fi

  FIRST=$(head -c 1 "$TMP_RESP")
  if [ "$FIRST" = "{" ] || [ "$FIRST" = "[" ]; then
    PREV=$(head -c 200 "$TMP_RESP" | tr '\n' ' ' | tr -s ' ')
    echo "[$IDX] JSON|$cid|$name|$folder|$PREV" | tee -a "$OUT"
    OK_JSON=$((OK_JSON+1))
  elif echo "$CT" | grep -qi "image\|video\|audio"; then
    echo "[$IDX] MEDIA|$cid|$name|$folder|$CT" | tee -a "$OUT"
    OK_IMG=$((OK_IMG+1))
  else
    PREV=$(head -c 80 "$TMP_RESP" | tr '\n' ' ')
    echo "[$IDX] TEXT|$cid|$name|$folder|$CT|$PREV" | tee -a "$OUT"
    OK_TEXT=$((OK_TEXT+1))
  fi
  sleep 0.3
done < "$TMP_EP"

echo "" | tee -a "$OUT"
echo "════════════════════════════════════" | tee -a "$OUT"
echo " RINGKASAN" | tee -a "$OUT"
echo "  JSON   : $OK_JSON" | tee -a "$OUT"
echo "  MEDIA  : $OK_IMG (img/video/audio)" | tee -a "$OUT"
echo "  TEXT   : $OK_TEXT" | tee -a "$OUT"
echo "  ERROR  : $ERR" | tee -a "$OUT"
echo "  TIMEOUT: $TMO" | tee -a "$OUT"
echo "  SKIP   : $SKIP" | tee -a "$OUT"
echo "════════════════════════════════════" | tee -a "$OUT"
echo "Report: $OUT"

rm -f "$TMP_EP" "$TMP_RESP"
