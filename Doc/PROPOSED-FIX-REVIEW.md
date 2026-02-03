# Review: WASM Artifact Path Fix (from zip)

**Status:** The **minimal fix** was applied to `.github/workflows/deploy-npm.yml` (download into `wasm/`, remove find/copy workaround, add `if-no-files-found: error`). The full zip workflow was not adopted. See also **Doc/LESSONS-LEARNED.md** §9.

**Ready to run:** Commit and push the changes, then go to **Actions → Deploy to npm → Run workflow** (or publish a release to trigger automatically).

---

## Summary

The proposed fix correctly addresses the **artifact path issue** (nested `wasm/native/artifacts/` vs flat `wasm/`) by adding a **“Prepare flat artifact directory”** step and uploading from `wasm-artifact/`. The documentation (ARTIFACT-PATH-FIX.md and IMPLEMENTATION-GUIDE.md) is clear and useful.

**One critical bug** in the zip’s `publish.yml` must be fixed for the workflow to work with your existing Docker image.

---

## What’s good

1. **Root cause** – Correctly identifies that `upload-artifact` with paths like `native/artifacts/valhalla.wasm` preserves directory structure and breaks the consumer that expects `wasm/valhalla.wasm`.
2. **Flatten step** – Copying to `wasm-artifact/` and uploading that directory gives a flat artifact so `download-artifact` with `path: wasm/` yields `wasm/valhalla.wasm` and `wasm/valhalla.js`. No need for the current “find and copy” workaround.
3. **Verification** – Good checks (WASM magic number, non-empty files, `dist/` contents).
4. **Artifact settings** – `retention-days: 1` and `if-no-files-found: error` are sensible.

---

## Critical bug: Docker volume mount

In **“Extract WASM files from Docker”** the proposed workflow has:

```yaml
docker run -v "$PWD/native/artifacts:/output" valhalla-wasm-builder:latest
```

Your Dockerfile’s default CMD is:

```dockerfile
CMD ["sh", "-c", "cp -r /output/* /artifacts/ 2>/dev/null && echo 'Build artifacts copied to /artifacts/'"]
```

So the container **copies from `/output` to `/artifacts`**. The build puts files into `/output` at image build time. If you mount the host at **`/output`**, that mount hides the image’s `/output`, so inside the container `/output` is the host directory (empty). The CMD then copies nothing useful to `/artifacts`, and the host mount at `/output` is never written by the CMD. **Result: `native/artifacts/` stays empty and the rest of the pipeline fails.**

**Correct mount:** the host directory must be mounted where the CMD **writes** to, i.e. **`/artifacts`**:

```yaml
- name: Extract WASM files from Docker
  run: |
    mkdir -p native/artifacts
    docker run -v "$PWD/native/artifacts:/artifacts" valhalla-wasm-builder:latest
```

Then the CMD copies the image’s `/output/*` into `/artifacts/`, which is your host `native/artifacts/`, and the rest of the fix works as intended.

---

## Other differences from current workflow

| Aspect | Current (`deploy-npm.yml`) | Proposed (`publish.yml`) |
|--------|----------------------------|---------------------------|
| Workflow name | Deploy to npm | Publish to NPM |
| Job names | build-wasm, deploy | build-wasm, publish |
| Build / extract | `docker build` + `wasm-out:/artifacts` | docker/build-push-action + extract (needs `/artifacts` mount above) |
| Download path | `path: .` + “Ensure WASM files in wasm/” | `path: wasm/` (clean, no find/copy) |
| Tests | Runs `pnpm run test:run` | No test step |
| WASM verify | `node scripts/verify-wasm.js` | Inline shell checks only |

Recommendation:

- **Apply the flat-artifact fix** (and the `/artifacts` mount correction) so downloads go straight into `wasm/`.
- **Keep** either the test step and/or `node scripts/verify-wasm.js` if you want the same guarantees as today (e.g. add them to the proposed `publish` job).
- **File name:** the zip suggests `.github/workflows/publish.yml`. Your repo currently uses `deploy-npm.yml`. Either replace the content of `deploy-npm.yml` with the fixed workflow or add `publish.yml` and remove `deploy-npm.yml` so you don’t run two publish workflows.

---

## Minimal change to apply the fix in the repo

If you want to keep the **current** workflow file and only fix the path issue, you can:

1. In **build-wasm**, after “Extract WASM artifacts”, add a step that copies `wasm-out/valhalla.wasm` and `wasm-out/valhalla.js` into a new directory (e.g. `wasm-artifact/`) and upload that directory as the artifact (with a clear name like `wasm-files`).
2. In **deploy**, download that artifact with `path: wasm/` and remove the “Ensure WASM files in wasm/” find/copy step.

That yields the same flat-artifact behavior without switching to the zip’s full `publish.yml`. If you prefer to adopt the zip’s workflow entirely, use the **`/artifacts`** mount in the “Extract WASM files from Docker” step as above and then add back tests and `verify-wasm.js` if desired.

---

## Verification checklist (from the proposal)

After applying the fix (with the mount correction):

- [ ] Workflow completes without errors
- [ ] “Download WASM artifacts” shows files in `wasm/` (not `wasm/native/artifacts/`)
- [ ] Build step succeeds with “✓ Copied valhalla.wasm to dist/”
- [ ] Published package contains WASM files (e.g. on unpkg)
- [ ] Package installs and runs: `npm install @jansoft/mbujkanji-valhalla-wasm`
