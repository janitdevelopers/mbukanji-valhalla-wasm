# Deploy readiness checklist

Complete every task in this list before publishing the package to npm (locally or via the GitHub workflow). Do not assume any step is done until you have run it and it passed.

---

## 1. WASM files available for the build

**Status:** Depends on your setup.

**Requirement:** The directory `wasm/` must contain `valhalla.wasm` and `valhalla.js` when you run `pnpm run build` (and when the deploy workflow runs). The build copies them into `dist/`.

**Current blocker:** In `.gitignore`, `wasm/*.wasm` and `wasm/*.js` are ignored. So:

- **Locally:** You can have the files in `wasm/` after a Docker build; they will not be committed.
- **In CI (Deploy to npm workflow):** After `actions/checkout`, `wasm/` will **not** contain those files, so the build step will fail with "No WASM files found to copy."

**You must do one of the following:**

- **Option A – Commit WASM (simplest for CI):**  
  1. Build WASM (Docker in `native/`), then copy the built `valhalla.wasm` and `valhalla.js` into the repo’s `wasm/` directory.  
  2. In `.gitignore`, remove or comment out the lines that ignore `wasm/*.wasm` and `wasm/*.js` (so these two files can be committed).  
  3. Commit and push `wasm/valhalla.wasm` and `wasm/valhalla.js`.  
  Then both local publish and the deploy workflow will see the files.

- **Option B – Build WASM in CI (implemented):**  
  The workflow **Deploy to npm** (`.github/workflows/deploy-npm.yml`) uses Option B: a **build-wasm** job builds WASM with Docker, uploads `valhalla.wasm` and `valhalla.js` as an artifact, then the **deploy** job downloads them into `wasm/` and runs build, verify, test, and publish. No need to commit WASM files; `.gitignore` can keep ignoring them.  
  **Note:** The Docker build takes roughly 30–45 minutes; the job has a 90-minute timeout.

**Check:** After your choice, run:

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
node scripts/verify-wasm.js
```

You must see both `valhalla.wasm` and `valhalla.js` reported as present and valid (and no errors). If you use CI, run the deploy workflow and confirm the “Build package” and “Verify WASM files” steps succeed.

---

## 2. Lockfile in sync with package.json

**Status:** Not done (known issue).

**Requirement:** `pnpm-lock.yaml` must match `package.json` so that `pnpm install --frozen-lockfile` succeeds in CI.

**Check:** Run:

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm install --frozen-lockfile
```

If you see `ERR_PNPM_OUTDATED_LOCKFILE` or “specifiers in the lockfile don't match specifiers in package.json”, the lockfile is out of date.

**Fix:** Run (from the repo root):

```powershell
pnpm install
```

Commit the updated `pnpm-lock.yaml`. Then run `pnpm install --frozen-lockfile` again and ensure it succeeds.

---

## 3. Dependencies installed and build succeeds

**Requirement:** With dependencies installed and WASM files in `wasm/`, the package build must complete and copy WASM into `dist/`.

**Steps:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm install
pnpm run build
```

**Check:**

- No errors from `tsup`.
- Directory `dist/` exists.
- `dist/` contains at least: `index.js`, `index.cjs`, `index.d.ts`, `valhalla.wasm`, `valhalla.js`.

If build fails with “No WASM files found to copy”, go back to **Task 1** and ensure `wasm/valhalla.wasm` and `wasm/valhalla.js` exist (and, for CI, are either committed or provided by a previous job).

---

## 4. WASM verification passes

**Requirement:** The script that runs before publish must pass.

**Step:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
node scripts/verify-wasm.js
```

**Check:** Output ends with “All WASM files verified successfully!” and the process exits with code 0. No “Verification failed” or “process.exit(1)”.

---

## 5. TypeScript typecheck passes

**Requirement:** No type errors.

**Step:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm run typecheck
```

**Check:** Command exits with code 0. Fix any reported type errors before deploying.

---

## 6. Lint passes

**Requirement:** ESLint passes for the source you ship.

**Step:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm run lint
```

**Check:** Command exits with code 0. Fix or explicitly allow any reported issues before deploying.

---

## 7. Tests pass

**Requirement:** The test suite must pass (same as in the deploy workflow).

**Step:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm run test:run
```

**Check:** All tests pass and the command exits with code 0.

---

## 8. Version and publish settings

**Requirement:** Version and access are correct for the release you want.

**Checks:**

- Open `package.json` and note `"version"` (e.g. `0.1.0`). Decide if you want a new version (e.g. `npm version patch` or `minor`/`major`) and run it if needed.
- Scoped package: `"name"` is `@jansoft/mbujkanji-valhalla-wasm`. Publishing must use `--access public` (the deploy workflow already does). For local publish, use:  
  `pnpm publish --access public`

---

## 9. Dry run (what would be published)

**Requirement:** Confirm the set of files and metadata that npm would publish.

**Step:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm run build
pnpm publish --dry-run
```

**Check:** In the output:

- `dist/` is included.
- `valhalla.wasm` and `valhalla.js` appear under the published files.
- `README.md` and `LICENSE` are included if that’s intended.
- No unintended files (e.g. `src/`, `native/`, `.github/`) are in the tarball.  
  (`.npmignore` already excludes many of these; confirm it matches your intent.)

---

## 10. GitHub: npm token secret (for deploy workflow only)

**Requirement:** If you use the “Deploy to npm” workflow, the repo must have an npm token stored as a secret.

**Steps:**

1. Create an npm access token: https://www.npmjs.com/settings/~/tokens → “Generate New Token” → choose “Automation” or “Publish”.
2. In the GitHub repo: **Settings → Secrets and variables → Actions**.
3. Add a repository secret:
   - **Name:** `DEPLOY_TO_NPM`
   - **Value:** the npm token.

**Check:** Run the “Deploy to npm” workflow manually (Actions → Deploy to npm → Run workflow). If the “Publish to npm” step fails with an auth error, the token is missing, wrong, or lacks publish access for `@jansoft/mbujkanji-valhalla-wasm`.

---

## 11. Actual publish (when everything above is done)

**Local publish:**

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm run build
node scripts/verify-wasm.js
pnpm publish --access public
```

(`prepublishOnly` will run `npm run build && node scripts/verify-wasm.js` before publish; you can rely on that instead of running build/verify manually, but they must succeed.)

**Publish via GitHub:**

- Create a release (or use “Run workflow” for “Deploy to npm”) after the checklist above is done. The workflow will run install, build, verify, tests, and publish.

---

## Quick reference: run all checks before publish

Run these in order (after `pnpm install` and with WASM files in `wasm/`):

```powershell
cd C:\Users\sonan\Projects\mbukanji-valhalla-wasm
pnpm run build
node scripts/verify-wasm.js
pnpm run typecheck
pnpm run lint
pnpm run test:run
pnpm publish --dry-run
```

If any command fails, fix the reported issue before publishing. When all pass, you can run `pnpm publish --access public` or trigger the deploy workflow.

---

## Summary table

| # | Task | Blocker / note |
|---|------|------------------|
| 1 | WASM files in `wasm/` (and in repo or CI) | `.gitignore` currently excludes `wasm/*.wasm` and `wasm/*.js`; CI will not see them unless you commit them or build in CI. |
| 2 | Lockfile in sync | Run `pnpm install` and commit `pnpm-lock.yaml` so `--frozen-lockfile` works. |
| 3 | Build succeeds | Requires Task 1. |
| 4 | Verify WASM passes | Requires Task 1 (and 3 if you care about `dist/`). |
| 5 | Typecheck passes | Requires `pnpm install`. |
| 6 | Lint passes | Requires `pnpm install`. |
| 7 | Tests pass | Requires `pnpm install`. |
| 8 | Version / access | Set version and use `--access public` for scoped package. |
| 9 | Dry run | Confirm published file set. |
| 10 | GitHub secret `DEPLOY_TO_NPM` | Only for deploy workflow. |
| 11 | Publish | Do only after 1–9 (and 10 if using workflow). |

This file should be updated as you fix each item or change the process.
