# Deploy-to-npm: WASM requirement verification

This doc confirms **when** the deploy workflow fails if `wasm/` does not contain the built WASM files.

---

## 1. Build step (`pnpm run build` → tsup)

**Code:** `tsup.config.ts` → `copyWasmFiles()` (runs in `onSuccess` after tsup builds).

| Scenario | Result |
|----------|--------|
| `wasm/` **does not exist** | Build **succeeds**. Only a warning is logged; nothing is copied. `dist/` has no `valhalla.wasm` or `valhalla.js`. |
| `wasm/` **exists** but has **no** `valhalla.wasm` or `valhalla.js` | Build **fails**. Throws: *"Error: No WASM files found to copy. Run \"npm run build:wasm\" to build WASM files first."* → `process.exit(1)`. |
| `wasm/` has one of the two files | Build **succeeds** with a warning (*"Only X of 2 files were copied"*). |
| `wasm/` has both files but one is **empty** | Build **fails**. Throws: *"Error: &lt;file&gt; is empty. The WASM build may have failed..."* → `process.exit(1)`. |

So: if `wasm/` exists but is empty of valid WASM files, **build** fails. If `wasm/` is missing entirely, build passes but **verify** will fail.

---

## 2. Verify step (`node scripts/verify-wasm.js`)

**Code:** `scripts/verify-wasm.js` → `verifyWasmFiles()`.

| Scenario | Result |
|----------|--------|
| `wasm/` **does not exist** | Verify **fails**. Adds error *"wasm/ directory not found"*, then `process.exit(1)`. |
| `wasm/` exists but **missing** `valhalla.wasm` or `valhalla.js` | Verify **fails**. Missing file(s) are reported, `allValid = false` → `process.exit(1)`. |
| File **empty** or **wrong magic** (e.g. not real WASM) | Verify **fails**. Errors collected → `process.exit(1)`. |
| Both files present in `wasm/` (and in `dist/` if it exists), non-empty, valid magic for `.wasm` | Verify **passes**. |

So: **verify** always fails if `wasm/` is missing or if either `valhalla.wasm` or `valhalla.js` is missing or invalid.

---

## 3. Current repo state

- `wasm/` exists and contains only `.gitkeep` (no `valhalla.wasm` or `valhalla.js`).
- So today:
  - **Build:** would **fail** (tsup’s `copyWasmFiles` sees `wasm/` but finds 0 files → throw → exit 1).
  - **Verify:** would **fail** (missing files in `wasm/`).

---

## 4. Conclusion

**Verified:** Before deploying to npm, **`wasm/` must contain valid `valhalla.wasm` and `valhalla.js`** (e.g. from a local Docker build then commit, or from another workflow that builds WASM and commits/artifacts it). Otherwise:

- Either the **build** step fails (if `wasm/` exists but has no valid WASM files), or  
- The **verify** step fails (if `wasm/` is missing or files are missing/invalid).

So the statement in the deploy workflow is correct.

---

## 5. How to satisfy the requirement

1. **Local:** Build WASM (e.g. `docker build` in `native/`), copy artifacts into `wasm/`, commit and push. Then run the deploy workflow.
2. **CI:** Add a job (or separate workflow) that builds WASM (Docker), then either commits `wasm/` or uploads artifacts and a later job downloads them into `wasm/` before running build + verify + publish.
