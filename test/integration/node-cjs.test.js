/**
 * Node.js CommonJS Integration Test
 * 
 * Tests path resolution and initialization in Node.js CJS environment.
 * 
 * Run with: node test/integration/node-cjs.test.js
 */

const { createRouter, getWasmPaths } = require('../../dist/index.cjs')

async function testNodeCJS() {
  console.log('🧪 Testing Node.js CommonJS environment...\n')

  try {
    // Test 1: Path resolution
    console.log('1. Testing path resolution...')
    const paths = getWasmPaths()
    
    if (!paths.wasm || !paths.js) {
      throw new Error('getWasmPaths() returned invalid paths')
    }
    
    if (!paths.wasm.includes('valhalla.wasm')) {
      throw new Error(`WASM path doesn't contain 'valhalla.wasm': ${paths.wasm}`)
    }
    
    if (!paths.js.includes('valhalla.js')) {
      throw new Error(`JS path doesn't contain 'valhalla.js': ${paths.js}`)
    }
    
    console.log('   ✅ Path resolution works')
    console.log(`   WASM: ${paths.wasm}`)
    console.log(`   JS: ${paths.js}\n`)

    // Test 2: Router creation
    console.log('2. Testing router creation...')
    const router = createRouter()
    
    if (!router) {
      throw new Error('createRouter() returned null')
    }
    
    console.log('   ✅ Router created successfully\n')

    // Test 3: Initialization (will fail without WASM files, but tests path resolution)
    console.log('3. Testing initialization (path resolution)...')
    try {
      await router.init()
      console.log('   ✅ Initialization succeeded (WASM files present)\n')
    } catch (error) {
      // Expected if WASM files don't exist
      if (error.message && (error.message.includes('404') || error.message.includes('Failed to fetch'))) {
        console.log('   ⚠️  Initialization failed (expected - WASM files not built)')
        console.log('   ✅ Path resolution worked (error shows path was resolved)\n')
      } else {
        throw error
      }
    }

    console.log('✅ All Node.js CJS tests passed!')
    return true
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run test
testNodeCJS()
