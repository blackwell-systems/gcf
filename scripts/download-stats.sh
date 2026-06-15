#!/usr/bin/env bash
# Queries PyPI, npm, GitHub releases for cumulative download stats across
# the entire GCF ecosystem. Generates assets/downloads-badge.json for
# shields.io endpoint badge and assets/download-stats.svg card.
#
# Run: bash scripts/download-stats.sh
# CI: schedule every 12 hours
set -euo pipefail

NPM_PKG="@blackwell-systems/gcf"
NPM_N8N_PKG="n8n-nodes-gcf"
NPM_PROXY_PKG="@blackwell-systems/gcf-proxy"
NPM_TREESITTER_PKG="tree-sitter-gcf"
PYPI_PKG="gcf-python"
PYPI_PROXY_PKG="gcf-proxy"
GCF_GO_REPO="blackwell-systems/gcf-go"
GCF_PROXY_REPO="blackwell-systems/gcf-proxy"
OUT="${1:-assets/download-stats.svg}"
CACHE="${OUT%.svg}.cache"

# ── Fetch all-time totals ───────────────────────────────────────────
UA="gcf-stats/1.0 (https://github.com/blackwell-systems/gcf)"

npm_total=$(curl -sf --max-time 10 "https://api.npmjs.org/downloads/point/2000-01-01:2030-01-01/${NPM_PKG}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['downloads'])" 2>/dev/null || echo "?")

npm_n8n_total=$(curl -sf --max-time 10 "https://api.npmjs.org/downloads/point/2000-01-01:2030-01-01/${NPM_N8N_PKG}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['downloads'])" 2>/dev/null || echo "?")

npm_proxy_total=$(curl -sf --max-time 10 "https://api.npmjs.org/downloads/point/2000-01-01:2030-01-01/${NPM_PROXY_PKG}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['downloads'])" 2>/dev/null || echo "?")

npm_treesitter_total=$(curl -sf --max-time 10 "https://api.npmjs.org/downloads/point/2000-01-01:2030-01-01/${NPM_TREESITTER_PKG}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['downloads'])" 2>/dev/null || echo "?")

pypi_total=$(curl -sf -A "$UA" --max-time 10 "https://pypistats.org/api/packages/${PYPI_PKG}/overall" \
  | python3 -c "import json,sys; print(sum(r['downloads'] for r in json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "?")

pypi_proxy_total=$(curl -sf -A "$UA" --max-time 10 "https://pypistats.org/api/packages/${PYPI_PROXY_PKG}/overall" \
  | python3 -c "import json,sys; print(sum(r['downloads'] for r in json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "?")

gh_go_total=$(gh api "repos/${GCF_GO_REPO}/releases" --jq '[.[].assets[].download_count] | add // 0' 2>/dev/null || echo "?")

gh_proxy_total=$(gh api "repos/${GCF_PROXY_REPO}/releases" --jq '[.[].assets[].download_count] | add // 0' 2>/dev/null || echo "?")

crates_total=$(curl -sf -A "$UA" --max-time 10 "https://crates.io/api/v1/crates/gcf" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['crate']['downloads'])" 2>/dev/null || echo "?")

vscode_total=$(curl -sf --max-time 10 "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json;api-version=6.0-preview.1" \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"blackwell-systems.gcf-vscode"}]}],"flags":914}' \
  | python3 -c "
import json,sys
data=json.load(sys.stdin)
for ext in data.get('results',[])[0].get('extensions',[]):
    for stat in ext.get('statistics',[]):
        if stat['statisticName']=='install':
            print(int(stat['value']))
            sys.exit()
print(0)
" 2>/dev/null || echo "?")

# ── High-water mark: never regress displayed totals ────────────────
read_cache() {
  local key="$1"
  if [[ -f "$CACHE" ]]; then
    grep "^${key}=" "$CACHE" 2>/dev/null | cut -d= -f2
  fi
}

use_or_cache() {
  local key="$1" val="$2"
  local prev
  prev=$(read_cache "$key")
  prev="${prev:-0}"
  if [[ "$val" != "?" && "$val" != "--" ]]; then
    if [[ "$prev" != "?" && "$prev" != "--" && "$prev" != "0" ]]; then
      if (( val >= prev )); then echo "$val"; else echo "$prev"; fi
    else
      echo "$val"
    fi
    return
  fi
  if [[ "$prev" != "0" && "$prev" != "--" && "$prev" != "?" ]]; then
    echo "$prev"
  else
    echo "$val"
  fi
}

npm_total=$(use_or_cache npm "$npm_total")
npm_n8n_total=$(use_or_cache npm_n8n "$npm_n8n_total")
npm_proxy_total=$(use_or_cache npm_proxy "$npm_proxy_total")
npm_treesitter_total=$(use_or_cache npm_treesitter "$npm_treesitter_total")
pypi_total=$(use_or_cache pypi "$pypi_total")
pypi_proxy_total=$(use_or_cache pypi_proxy "$pypi_proxy_total")
gh_go_total=$(use_or_cache gh_go "$gh_go_total")
gh_proxy_total=$(use_or_cache gh_proxy "$gh_proxy_total")
crates_total=$(use_or_cache crates "$crates_total")
vscode_total=$(use_or_cache vscode "$vscode_total")

cat > "$CACHE" << CACHEEOF
npm=${npm_total}
npm_n8n=${npm_n8n_total}
npm_proxy=${npm_proxy_total}
npm_treesitter=${npm_treesitter_total}
pypi=${pypi_total}
pypi_proxy=${pypi_proxy_total}
gh_go=${gh_go_total}
gh_proxy=${gh_proxy_total}
crates=${crates_total}
vscode=${vscode_total}
CACHEEOF

# ── Calculate cumulative total ──────────────────────────────────────
cumulative=0
for v in "$npm_total" "$npm_n8n_total" "$npm_proxy_total" "$npm_treesitter_total" "$pypi_total" "$pypi_proxy_total" "$gh_go_total" "$gh_proxy_total" "$crates_total" "$vscode_total"; do
  if [[ "$v" != "?" && "$v" != "--" ]]; then
    cumulative=$((cumulative + v))
  fi
done
if (( cumulative == 0 )); then cumulative="?"; fi

# Format numbers with commas
fmt() { printf "%'d" "$1" 2>/dev/null || echo "$1"; }

npm_fmt=$(fmt "$npm_total" 2>/dev/null || echo "$npm_total")
npm_n8n_fmt=$(fmt "$npm_n8n_total" 2>/dev/null || echo "$npm_n8n_total")
npm_proxy_fmt=$(fmt "$npm_proxy_total" 2>/dev/null || echo "$npm_proxy_total")
npm_treesitter_fmt=$(fmt "$npm_treesitter_total" 2>/dev/null || echo "$npm_treesitter_total")
pypi_proxy_fmt=$(fmt "$pypi_proxy_total" 2>/dev/null || echo "$pypi_proxy_total")
pypi_fmt=$(fmt "$pypi_total" 2>/dev/null || echo "$pypi_total")
gh_go_fmt=$(fmt "$gh_go_total" 2>/dev/null || echo "$gh_go_total")
gh_proxy_fmt=$(fmt "$gh_proxy_total" 2>/dev/null || echo "$gh_proxy_total")
crates_fmt=$(fmt "$crates_total" 2>/dev/null || echo "$crates_total")
vscode_fmt=$(fmt "$vscode_total" 2>/dev/null || echo "$vscode_total")
cumulative_fmt=$(fmt "$cumulative" 2>/dev/null || echo "$cumulative")

date_str=$(date +"%Y-%m-%d")

# ── Build rows dynamically ──────────────────────────────────────────
has_downloads() {
  local val="$1"
  [[ "$val" != "--" && "$val" != "0" ]]
}

rows=""
row_count=0
add_row() {
  local label="$1" value="$2"
  local y=$(( 74 + row_count * 22 ))
  rows+="
  <text x=\"24\" y=\"${y}\" fill=\"#94a3b8\" font-family=\"ui-monospace,monospace\" font-size=\"12\">${label}</text>
  <text x=\"296\" y=\"${y}\" fill=\"#e2e8f0\" font-family=\"ui-monospace,monospace\" font-size=\"13\" font-weight=\"600\" text-anchor=\"end\">${value}</text>"
  row_count=$((row_count + 1))
}

has_downloads "$npm_total"            && add_row "npm (gcf library)"        "$npm_fmt"
has_downloads "$npm_proxy_total"     && add_row "npm (gcf-proxy)"         "$npm_proxy_fmt"
has_downloads "$npm_n8n_total"       && add_row "npm (n8n-nodes-gcf)"     "$npm_n8n_fmt"
has_downloads "$npm_treesitter_total" && add_row "npm (tree-sitter-gcf)"  "$npm_treesitter_fmt"
has_downloads "$pypi_total"          && add_row "pypi (gcf-python)"       "$pypi_fmt"
has_downloads "$pypi_proxy_total"    && add_row "pypi (gcf-proxy)"        "$pypi_proxy_fmt"
has_downloads "$crates_total"        && add_row "crates.io (gcf)"         "$crates_fmt"
has_downloads "$vscode_total"        && add_row "vscode marketplace"       "$vscode_fmt"
has_downloads "$gh_go_total"         && add_row "github (gcf-go)"         "$gh_go_fmt"
has_downloads "$gh_proxy_total"      && add_row "github (gcf-proxy)"      "$gh_proxy_fmt"

svg_height=$(( 48 + row_count * 22 + 16 + 28 + 20 ))
divider_y=$(( 48 + row_count * 22 + 8 ))
total_y=$(( divider_y + 28 ))
stroke_height=$(( svg_height - 2 ))

# ── Generate SVG ─────────────────────────────────────────────────────
mkdir -p "$(dirname "$OUT")"
cat > "$OUT" << SVGEOF
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="${svg_height}" viewBox="0 0 320 ${svg_height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#00b8d4"/>
    </linearGradient>
  </defs>

  <rect width="320" height="${svg_height}" rx="12" fill="url(#bg)"/>
  <rect x="1" y="1" width="318" height="${stroke_height}" rx="11" fill="none" stroke="#334155" stroke-width="1"/>

  <text x="24" y="36" fill="#e2e8f0" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="600">GCF ecosystem downloads</text>
  <text x="296" y="36" fill="#64748b" font-family="system-ui,-apple-system,sans-serif" font-size="10" text-anchor="end">${date_str}</text>

  <line x1="24" y1="48" x2="296" y2="48" stroke="#334155" stroke-width="1"/>
${rows}

  <line x1="24" y1="${divider_y}" x2="296" y2="${divider_y}" stroke="#334155" stroke-width="1"/>

  <text x="24" y="${total_y}" fill="url(#accent)" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="700">${cumulative_fmt} total</text>
  <text x="296" y="${total_y}" fill="#64748b" font-family="system-ui,-apple-system,sans-serif" font-size="10" text-anchor="end">cumulative downloads</text>
</svg>
SVGEOF

# ── Generate shields.io endpoint badge JSON ──────────────────────────
BADGE_OUT="$(dirname "$OUT")/downloads-badge.json"
if [[ "$cumulative" != "?" ]]; then
  cat > "$BADGE_OUT" << BADGEEOF
{
  "schemaVersion": 1,
  "label": "downloads",
  "message": "${cumulative_fmt}",
  "color": "1e3a5f"
}
BADGEEOF
fi

echo "Generated ${OUT}"
echo "  npm-gcf: ${npm_total}  npm-proxy: ${npm_proxy_total}  npm-n8n: ${npm_n8n_total}  npm-treesitter: ${npm_treesitter_total}  pypi: ${pypi_total}  pypi-proxy: ${pypi_proxy_total}  crates: ${crates_total}  gh-go: ${gh_go_total}  gh-proxy: ${gh_proxy_total}  total: ${cumulative}"
