#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

PKG_DIR="node_modules/@spatialwalk/avatarkit/dist"
[[ -d "$PKG_DIR" ]] || { echo "❌ @spatialwalk/avatarkit not installed. Run npm install first."; exit 1; }

# Find the wasm in the package — should be exactly one
mapfile -t wasms < <(find "$PKG_DIR" -maxdepth 1 -name "*.wasm" -type f)
if (( ${#wasms[@]} == 0 )); then
  echo "❌ No .wasm in $PKG_DIR — package layout changed; investigate manually."
  exit 1
fi
if (( ${#wasms[@]} > 1 )); then
  echo "⚠️  Multiple wasms found:"; printf '  %s\n' "${wasms[@]}"
  echo "Pick one manually."; exit 1
fi
SRC="${wasms[0]}"
NAME="$(basename "$SRC")"
echo "Source WASM: $NAME ($(wc -c < "$SRC") bytes)"

# Sync public/
mkdir -p public/spatialreal
rm -f public/spatialreal/*.wasm
cp "$SRC" "public/spatialreal/$NAME"
echo "✅ copied to public/spatialreal/$NAME"

# Patch SpatialRealAvatar.tsx
TS="src/components/agent/SpatialRealAvatar.tsx"
[[ -f "$TS" ]] || { echo "❌ $TS missing"; exit 1; }
node - "$TS" "$NAME" <<'NODE'
const fs = require('fs');
const [, , file, name] = process.argv;
let s = fs.readFileSync(file, 'utf8');
const before = s;
s = s.replace(/const WASM_FILENAME = '[^']+';/, `const WASM_FILENAME = '${name}';`);
s = s.replace(/const WASM_PUBLIC_URL = '[^']+';/, `const WASM_PUBLIC_URL = '/spatialreal/${name}';`);
if (s === before) { console.error('❌ constants not found in', file); process.exit(1); }
fs.writeFileSync(file, s);
console.log('✅ updated constants in', file);
NODE

# Patch next.config.ts
NC="next.config.ts"
node - "$NC" "$NAME" <<'NODE'
const fs = require('fs');
const [, , file, name] = process.argv;
let s = fs.readFileSync(file, 'utf8');
const before = s;
s = s.replace(/avatar_core_wasm-[A-Za-z0-9_-]+\.wasm/g, name);
if (s === before) { console.error('❌ no wasm refs found in', file); process.exit(1); }
fs.writeFileSync(file, s);
console.log('✅ updated wasm refs in', file);
NODE

echo
echo "Done. Restart 'npm run dev' so next.config.ts reloads."
