# Test branch – deploy for install-from-GitHub

The **test** branch is intended for consumers (e.g. JanPAMS) to install this package from GitHub before the fix is published to npm:

```bash
pnpm add github:janitdevelopers/mbukanji-valhalla-wasm#test
```

For that to work, the branch must include **built artifacts** (`dist/` and `wasm/valhalla.wasm`, `wasm/valhalla.js`), which are normally gitignored.

## One-time setup: populate the test branch with built files

**Maintainer:** run this once (or after any change you want to test from GitHub).

### Windows (PowerShell)

```powershell
git checkout test
./scripts/prepare-test-branch.ps1
git commit -m "chore(test): add built dist and wasm for install-from-GitHub"
git push -u origin test
```

### Linux / macOS

```bash
git checkout test
chmod +x scripts/prepare-test-branch.sh
./scripts/prepare-test-branch.sh
git commit -m "chore(test): add built dist and wasm for install-from-GitHub"
git push -u origin test
```

**Requirements:** Docker (for `build:wasm`). The script runs `pnpm run build:wasm` then `pnpm run build`, then stages `dist/` and `wasm/valhalla.*` with `git add -f` so they are committed despite `.gitignore`.

## Using the test branch in JanPAMS

In `apps/core/mbukanji-maps/package.json` and `packages/core/package.json`:

```json
"@jansoft/mbujkanji-valhalla-wasm": "github:janitdevelopers/mbukanji-valhalla-wasm#test"
```

Then:

```bash
pnpm install
# Clear Vite cache so the new package is used
rm -rf apps/core/mbukanji-maps/node_modules/.vite
pnpm run dev   # from apps/core/mbukanji-maps
```

## After publishing to npm

Once the fix (e.g. 87 `.a` link fix) is published to npm (e.g. `0.1.2`), switch back to:

```json
"@jansoft/mbujkanji-valhalla-wasm": "^0.1.2"
```

and you can stop committing built files to the test branch.
