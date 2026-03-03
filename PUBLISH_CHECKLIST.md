# Publishing Checklist

Use this checklist before publishing to npm.

**CI:** A GitHub Actions workflow (`.github/workflows/deploy-npm.yml`) can publish automatically when you create a GitHub Release, or manually via *Actions → Deploy to npm → Run workflow*. It builds WASM in Docker, runs tests and verification, then publishes. Requires repository secret `DEPLOY_TO_NPM` (npm token with Publish scope).

---

## Pre-Publishing Checklist

### Code & Build
- [ ] All code changes committed to git
- [ ] Version updated in `package.json`
- [ ] WASM files built (`wasm/valhalla.wasm` exists)
- [ ] Package built successfully (`npm run build`)
- [ ] WASM files copied to `dist/` directory
- [ ] `dist/valhalla.wasm` exists and is valid
- [ ] `dist/valhalla.js` exists and is valid

### Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] Verification script passes (`node scripts/verify-wasm.js`)
- [ ] `prepublishOnly` hook works (`npm run prepublishOnly`)

### Documentation
- [ ] README.md is up to date
- [ ] README includes auto-detection examples
- [ ] README includes troubleshooting section
- [ ] CHANGELOG.md updated (if maintained)

### npm Configuration
- [ ] Logged into npm (`npm whoami`)
- [ ] Have publish access to `@jansoft` scope
- [ ] `.npmrc` configured correctly
- [ ] `package.json` has correct name, version, description

### Verification
- [ ] Dry run successful (`npm publish --dry-run`)
- [ ] Files array in `package.json` includes `dist`
- [ ] Exports field includes WASM files
- [ ] No sensitive data in package

---

## Publishing Steps

1. [ ] Update version: `npm version minor` (or patch/major)
2. [ ] Build WASM: `npm run build:wasm` (if not done)
3. [ ] Build package: `npm run build`
4. [ ] Verify: `npm run prepublishOnly`
5. [ ] Dry run: `npm publish --dry-run`
6. [ ] Publish: `npm publish --access public`
7. [ ] Verify on npm website
8. [ ] Update janpams project

---

## Post-Publishing

- [ ] Package visible on npm
- [ ] Version correct on npm
- [ ] Files include WASM in dist/
- [ ] Install in janpams: `npm install @jansoft/mbujkanji-valhalla-wasm@latest`
- [ ] Test in janpams app
- [ ] Update code to use auto-detection
- [ ] Verify routing works

---

## Quick Command Reference

```bash
# Full publish flow
npm version minor
npm run build:wasm
npm run build
npm run prepublishOnly
npm publish --dry-run
npm publish --access public

# In janpams
cd C:\Projects\janpams
npm install @jansoft/mbujkanji-valhalla-wasm@latest
```
