#!/usr/bin/env node
/**
 * Verify a published npm package has everything needed.
 * Usage: node scripts/verify-published.js [version]
 * Example: node scripts/verify-published.js 0.1.1
 * Default: latest published version
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d] // \0asm
const PACKAGE_NAME = '@jansoft/mbujkanji-valhalla-wasm'
const MIN_WASM_BYTES = 1024

const REQUIRED_FILES = [
  'package.json',
  'README.md',
  'LICENSE',
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
  'dist/valhalla.wasm',
  'dist/valhalla.js',
]

function main() {
  const version = process.argv[2] || 'latest'
  const fullSpec = `${PACKAGE_NAME}@${version}`
  console.log(`\n📦 Verifying published package: ${fullSpec}\n`)

  const workDir = mkdtempSync(join(tmpdir(), 'valhalla-wasm-verify-'))

  try {
    // Download tarball only (faster than full npm install)
    execSync(`npm pack ${fullSpec}`, {
      cwd: workDir,
      stdio: 'inherit',
      encoding: 'utf-8',
      timeout: 180000,
    })
    const tgz = readdirSync(workDir).find((f) => f.endsWith('.tgz'))
    if (!tgz) {
      console.error('❌ npm pack did not produce a .tgz file')
      process.exit(1)
    }
    execSync(`tar -xzf "${tgz}"`, { cwd: workDir, stdio: 'pipe', timeout: 10000 })
    const actualPkgDir = join(workDir, 'package')
    if (!existsSync(actualPkgDir)) {
      console.error('❌ Package not found at', actualPkgDir)
      process.exit(1)
    }

    let failed = false

    console.log('Checking required files:')
    for (const file of REQUIRED_FILES) {
      const path = join(actualPkgDir, file)
      if (!existsSync(path)) {
        console.error(`  ❌ Missing: ${file}`)
        failed = true
      } else {
        const stat = statSync(path)
        console.log(`  ✓ ${file} (${(stat.size / 1024).toFixed(2)} KB)`)
      }
    }

    const wasmPath = join(actualPkgDir, 'dist/valhalla.wasm')
    if (existsSync(wasmPath)) {
      const buf = readFileSync(wasmPath)
      if (buf.length < MIN_WASM_BYTES) {
        console.error(`  ❌ dist/valhalla.wasm too small (${buf.length} bytes)`)
        failed = true
      } else {
        const ok =
          buf[0] === WASM_MAGIC[0] &&
          buf[1] === WASM_MAGIC[1] &&
          buf[2] === WASM_MAGIC[2] &&
          buf[3] === WASM_MAGIC[3]
        if (!ok) {
          console.error('  ❌ dist/valhalla.wasm invalid WASM magic number')
          failed = true
        } else {
          console.log(`  ✓ dist/valhalla.wasm valid WASM (${(buf.length / 1024).toFixed(2)} KB)`)
        }
      }
    }

    const pkgJsonPath = join(actualPkgDir, 'package.json')
    if (existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
      console.log(`\n  Package version: ${pkg.version}`)
    }

    if (failed) {
      console.error('\n❌ Verification failed. See errors above.')
      process.exit(1)
    }

    console.log('\n✅ Published package has everything needed.\n')
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}

main()
