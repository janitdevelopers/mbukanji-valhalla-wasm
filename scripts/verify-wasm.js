#!/usr/bin/env node
/**
 * Verify WASM files before publishing
 * Checks file existence, magic numbers, and file sizes
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const WASM_MAGIC_NUMBER = [0x00, 0x61, 0x73, 0x6d] // "\0asm"
const MIN_WASM_SIZE = 1024 // 1KB minimum (very small, but not empty)
const MIN_JS_SIZE = 100 // 100 bytes minimum for JS glue code

const wasmDir = join(process.cwd(), 'wasm')
const distDir = join(process.cwd(), 'dist')

const requiredFiles = [
  { name: 'valhalla.wasm', minSize: MIN_WASM_SIZE, checkMagic: true },
  { name: 'valhalla.js', minSize: MIN_JS_SIZE, checkMagic: false },
]

let errors = []
let warnings = []

/**
 * Check WASM magic number
 */
function checkWasmMagic(filePath) {
  try {
    const buffer = readFileSync(filePath)
    const magic = Array.from(buffer.slice(0, 4))

    if (
      magic[0] !== WASM_MAGIC_NUMBER[0] ||
      magic[1] !== WASM_MAGIC_NUMBER[1] ||
      magic[2] !== WASM_MAGIC_NUMBER[2] ||
      magic[3] !== WASM_MAGIC_NUMBER[3]
    ) {
      return {
        valid: false,
        error: `Invalid WASM magic number. Expected [${WASM_MAGIC_NUMBER.map((n) => '0x' + n.toString(16)).join(', ')}], got [${magic.map((n) => '0x' + n.toString(16)).join(', ')}]`,
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read file for magic number check: ${error.message}`,
    }
  }
}

/**
 * Verify a single file
 */
function verifyFile(file, directory) {
  const filePath = join(directory, file.name)
  const sizeKB = (file.minSize / 1024).toFixed(2)

  // Check existence
  if (!existsSync(filePath)) {
    errors.push(`❌ ${file.name} not found in ${directory}/`)
    errors.push(`   Expected location: ${filePath}`)
    return false
  }

  // Check file size
  try {
    const stats = statSync(filePath)
    if (stats.size === 0) {
      errors.push(`❌ ${file.name} is empty`)
      return false
    }

    if (stats.size < file.minSize) {
      warnings.push(
        `⚠ ${file.name} is suspiciously small (${(stats.size / 1024).toFixed(2)} KB, expected at least ${sizeKB} KB)`
      )
    }

    // Check magic number for WASM files
    if (file.checkMagic) {
      const magicCheck = checkWasmMagic(filePath)
      if (!magicCheck.valid) {
        errors.push(`❌ ${file.name} failed magic number validation`)
        errors.push(`   ${magicCheck.error}`)
        errors.push(`   This file may be corrupted or not a valid WASM file`)
        return false
      }
    }

    return true
  } catch (error) {
    errors.push(`❌ Failed to check ${file.name}: ${error.message}`)
    return false
  }
}

/**
 * Main verification function
 */
function verifyWasmFiles() {
  console.log('🔍 Verifying WASM files...\n')

  // Check if wasm directory exists
  if (!existsSync(wasmDir)) {
    errors.push(`❌ wasm/ directory not found`)
    errors.push(`   Expected location: ${wasmDir}`)
    errors.push(`   Run "npm run build:wasm" to build WASM files first`)
    printResults()
    process.exit(1)
  }

  // Check if dist directory exists (for prepublishOnly)
  if (!existsSync(distDir)) {
    warnings.push(`⚠ dist/ directory not found`)
    warnings.push(`   This is normal if running before build. Run "npm run build" first.`)
  }

  // Verify files in wasm/ directory (source)
  console.log('Checking source files in wasm/ directory:')
  let allValid = true
  for (const file of requiredFiles) {
    const isValid = verifyFile(file, wasmDir)
    if (isValid) {
      const filePath = join(wasmDir, file.name)
      const stats = statSync(filePath)
      const sizeKB = (stats.size / 1024).toFixed(2)
      console.log(`  ✓ ${file.name} (${sizeKB} KB)`)
    } else {
      allValid = false
    }
  }

  // Verify files in dist/ directory (if it exists)
  if (existsSync(distDir)) {
    console.log('\nChecking built files in dist/ directory:')
    for (const file of requiredFiles) {
      const isValid = verifyFile(file, distDir)
      if (isValid) {
        const filePath = join(distDir, file.name)
        const stats = statSync(filePath)
        const sizeKB = (stats.size / 1024).toFixed(2)
        console.log(`  ✓ ${file.name} (${sizeKB} KB)`)
      } else {
        allValid = false
      }
    }
  }

  printResults()

  if (!allValid || errors.length > 0) {
    console.error('\n❌ Verification failed. Fix the errors above before publishing.')
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.warn('\n⚠ Warnings found. Review them above.')
  } else {
    console.log('\n✅ All WASM files verified successfully!')
  }
}

/**
 * Print results
 */
function printResults() {
  if (errors.length > 0) {
    console.error('\n📋 Errors:')
    errors.forEach((error) => console.error(`  ${error}`))
  }

  if (warnings.length > 0) {
    console.warn('\n📋 Warnings:')
    warnings.forEach((warning) => console.warn(`  ${warning}`))
  }
}

// Run verification
verifyWasmFiles()
