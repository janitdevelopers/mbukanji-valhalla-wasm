'use client'

import { useState } from 'react'

/**
 * Test/Demo page for @jansoft/mbujkanji-valhalla-wasm package
 * 
 * This page demonstrates the package API and provides testing interface.
 * In production, users would install the npm package and use it in their own apps.
 */

// Import types and utilities from the package source
import type { RouterStatus } from '@/src/types/config'
import { decodePolyline, encodePolyline, polylineToGeoJSON, polylineBounds } from '@/src/utils/polyline'
import { haversineDistance, midpoint, bearing, destinationPoint } from '@/src/utils/geometry'

export default function TestPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'polyline' | 'geometry' | 'router'>('overview')
  
  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          @jansoft/mbujkanji-valhalla-wasm
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Offline routing engine for web applications using Valhalla compiled to WebAssembly
        </p>
      </header>

      {/* Tab Navigation */}
      <nav style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e5e5',
        paddingBottom: '0.5rem'
      }}>
        {(['overview', 'polyline', 'geometry', 'router'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: activeTab === tab ? '#0070f3' : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? '600' : '400',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'polyline' && <PolylineTab />}
      {activeTab === 'geometry' && <GeometryTab />}
      {activeTab === 'router' && <RouterTab />}
    </div>
  )
}

function OverviewTab() {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Package Overview</h2>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '1.5rem', 
        borderRadius: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Installation</h3>
        <code style={{ 
          display: 'block', 
          background: '#1a1a1a', 
          color: '#00ff00', 
          padding: '1rem',
          borderRadius: '0.375rem',
          fontFamily: 'monospace'
        }}>
          npm install @jansoft/mbujkanji-valhalla-wasm
        </code>
      </div>

      <div style={{ 
        background: '#f5f5f5', 
        padding: '1.5rem', 
        borderRadius: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Basic Usage</h3>
        <pre style={{ 
          background: '#1a1a1a', 
          color: '#e5e5e5', 
          padding: '1rem',
          borderRadius: '0.375rem',
          fontFamily: 'monospace',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

// Create router instance
const router = createRouter()

// Initialize with WASM module
await router.init({ wasmPath: '/valhalla.wasm' })

// Load routing tiles (you provide these)
const tiles = await fetch('/tiles/region.tar').then(r => r.arrayBuffer())
await router.loadTiles(tiles)

// Calculate route
const route = await router.route({
  locations: [
    { lat: 4.0511, lon: 9.7679 },  // Douala
    { lat: 3.8480, lon: 11.5021 }  // Yaounde
  ],
  costing: 'auto'
})

console.log(\`Distance: \${route.trip.summary.length} km\`)
console.log(\`Time: \${route.trip.summary.time} seconds\`)`}
        </pre>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <FeatureCard 
          title="Offline-First" 
          description="Works completely offline once WASM and tiles are loaded"
        />
        <FeatureCard 
          title="Framework Agnostic" 
          description="Works with React, Vue, Svelte, or vanilla JavaScript"
        />
        <FeatureCard 
          title="TypeScript" 
          description="Full TypeScript support with comprehensive type definitions"
        />
        <FeatureCard 
          title="BYOT (Bring Your Own Tiles)" 
          description="No tiles included - you provide tiles for your regions"
        />
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ 
      border: '1px solid #e5e5e5', 
      padding: '1rem', 
      borderRadius: '0.5rem' 
    }}>
      <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{title}</h4>
      <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>{description}</p>
    </div>
  )
}

function PolylineTab() {
  const [encoded, setEncoded] = useState('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
  const [format, setFormat] = useState<'polyline5' | 'polyline6'>('polyline5')
  const [decoded, setDecoded] = useState<[number, number][]>([])
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null)
  const [geojson, setGeojson] = useState<string>('')

  const handleDecode = () => {
    try {
      const coords = decodePolyline(encoded, format)
      setDecoded(coords)
      setBounds(polylineBounds(encoded, format))
      setGeojson(JSON.stringify(polylineToGeoJSON(encoded, format), null, 2))
    } catch (error) {
      console.error('Decode error:', error)
    }
  }

  const handleEncode = () => {
    if (decoded.length > 0) {
      const result = encodePolyline(decoded, format)
      setEncoded(result)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Polyline Utilities</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
            Encoded Polyline
          </label>
          <textarea
            value={encoded}
            onChange={(e) => setEncoded(e.target.value)}
            style={{ 
              width: '100%', 
              height: '100px', 
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #ccc',
              fontFamily: 'monospace'
            }}
          />
          
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select 
              value={format} 
              onChange={(e) => setFormat(e.target.value as 'polyline5' | 'polyline6')}
              style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ccc' }}
            >
              <option value="polyline5">Polyline5 (1e5)</option>
              <option value="polyline6">Polyline6 (1e6)</option>
            </select>
            <button
              onClick={handleDecode}
              style={{
                padding: '0.5rem 1rem',
                background: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Decode
            </button>
            <button
              onClick={handleEncode}
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Encode
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
            Decoded Coordinates ({decoded.length} points)
          </label>
          <div style={{ 
            height: '100px', 
            overflow: 'auto',
            background: '#f5f5f5',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            fontFamily: 'monospace',
            fontSize: '0.75rem'
          }}>
            {decoded.map((coord, i) => (
              <div key={i}>[{coord[0].toFixed(6)}, {coord[1].toFixed(6)}]</div>
            ))}
          </div>
        </div>
      </div>

      {bounds && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Bounding Box</h3>
          <code style={{ 
            display: 'block', 
            background: '#f5f5f5', 
            padding: '0.5rem',
            borderRadius: '0.375rem'
          }}>
            [minLng: {bounds[0].toFixed(6)}, minLat: {bounds[1].toFixed(6)}, maxLng: {bounds[2].toFixed(6)}, maxLat: {bounds[3].toFixed(6)}]
          </code>
        </div>
      )}

      {geojson && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>GeoJSON Output</h3>
          <pre style={{ 
            background: '#1a1a1a', 
            color: '#e5e5e5', 
            padding: '1rem',
            borderRadius: '0.375rem',
            overflow: 'auto',
            fontSize: '0.75rem'
          }}>
            {geojson}
          </pre>
        </div>
      )}
    </div>
  )
}

function GeometryTab() {
  const [point1, setPoint1] = useState({ lat: 4.0511, lon: 9.7679 }) // Douala
  const [point2, setPoint2] = useState({ lat: 3.8480, lon: 11.5021 }) // Yaounde
  const [results, setResults] = useState<{
    distance: number
    midpoint: [number, number]
    bearing: number
    destination: [number, number]
  } | null>(null)

  const calculate = () => {
    // haversineDistance(lat1, lon1, lat2, lon2) returns meters
    const distMeters = haversineDistance(
      point1.lat, point1.lon,
      point2.lat, point2.lon
    )
    // midpoint(lat1, lon1, lat2, lon2) returns [lat, lon]
    const mid = midpoint(
      point1.lat, point1.lon,
      point2.lat, point2.lon
    )
    // bearing(lat1, lon1, lat2, lon2) returns degrees
    const bear = bearing(
      point1.lat, point1.lon,
      point2.lat, point2.lon
    )
    // destinationPoint(lat, lon, bearing, distanceMeters) returns [lat, lon]
    const dest = destinationPoint(
      point1.lat, point1.lon,
      bear,
      50000 // 50km in meters
    )

    setResults({
      distance: distMeters / 1000, // Convert to km for display
      midpoint: mid,
      bearing: bear,
      destination: dest
    })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Geometry Utilities</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '0.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Point 1 (Douala)</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              step="0.0001"
              value={point1.lat}
              onChange={(e) => setPoint1({ ...point1, lat: parseFloat(e.target.value) })}
              placeholder="Latitude"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ccc' }}
            />
            <input
              type="number"
              step="0.0001"
              value={point1.lon}
              onChange={(e) => setPoint1({ ...point1, lon: parseFloat(e.target.value) })}
              placeholder="Longitude"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ccc' }}
            />
          </div>
        </div>

        <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '0.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Point 2 (Yaounde)</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              step="0.0001"
              value={point2.lat}
              onChange={(e) => setPoint2({ ...point2, lat: parseFloat(e.target.value) })}
              placeholder="Latitude"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ccc' }}
            />
            <input
              type="number"
              step="0.0001"
              value={point2.lon}
              onChange={(e) => setPoint2({ ...point2, lon: parseFloat(e.target.value) })}
              placeholder="Longitude"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ccc' }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={calculate}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        Calculate
      </button>

      {results && (
        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div style={{ border: '1px solid #e5e5e5', padding: '1rem', borderRadius: '0.5rem' }}>
            <h4 style={{ fontWeight: '600', color: '#666', fontSize: '0.875rem' }}>Haversine Distance</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0.5rem 0 0' }}>
              {results.distance.toFixed(2)} km
            </p>
          </div>
          <div style={{ border: '1px solid #e5e5e5', padding: '1rem', borderRadius: '0.5rem' }}>
            <h4 style={{ fontWeight: '600', color: '#666', fontSize: '0.875rem' }}>Bearing</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0.5rem 0 0' }}>
              {results.bearing.toFixed(2)}°
            </p>
          </div>
          <div style={{ border: '1px solid #e5e5e5', padding: '1rem', borderRadius: '0.5rem' }}>
            <h4 style={{ fontWeight: '600', color: '#666', fontSize: '0.875rem' }}>Midpoint</h4>
            <p style={{ fontSize: '1rem', fontWeight: '600', margin: '0.5rem 0 0', fontFamily: 'monospace' }}>
              [{results.midpoint[0].toFixed(6)}, {results.midpoint[1].toFixed(6)}]
            </p>
          </div>
          <div style={{ border: '1px solid #e5e5e5', padding: '1rem', borderRadius: '0.5rem' }}>
            <h4 style={{ fontWeight: '600', color: '#666', fontSize: '0.875rem' }}>50km Destination</h4>
            <p style={{ fontSize: '1rem', fontWeight: '600', margin: '0.5rem 0 0', fontFamily: 'monospace' }}>
              [{results.destination[0].toFixed(6)}, {results.destination[1].toFixed(6)}]
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function RouterTab() {
  const [status, setStatus] = useState<RouterStatus>({
    wasmLoaded: false,
    tilesLoaded: false,
    ready: false,
    loadedRegions: []
  })

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Router API</h2>
      
      <div style={{ 
        background: '#fef3c7', 
        border: '1px solid #f59e0b',
        padding: '1rem', 
        borderRadius: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <p style={{ margin: 0, color: '#92400e' }}>
          <strong>Note:</strong> The router requires the compiled WASM module and routing tiles to function.
          This demo page shows the API structure but cannot perform actual routing without those files.
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Router Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <StatusBadge label="WASM Loaded" active={status.wasmLoaded} />
          <StatusBadge label="Tiles Loaded" active={status.tilesLoaded} />
          <StatusBadge label="Ready" active={status.ready} />
          <StatusBadge label={`Regions: ${status.loadedRegions.length}`} active={status.loadedRegions.length > 0} />
        </div>
      </div>

      <div style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '0.5rem' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Example Route Request</h3>
        <pre style={{ 
          background: '#1a1a1a', 
          color: '#e5e5e5', 
          padding: '1rem',
          borderRadius: '0.375rem',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`const route = await router.route({
  locations: [
    { lat: 4.0511, lon: 9.7679, type: 'break' },   // Douala
    { lat: 3.9478, lon: 10.1456, type: 'through' }, // Via point
    { lat: 3.8480, lon: 11.5021, type: 'break' }   // Yaounde
  ],
  costing: 'auto',
  costing_options: {
    auto: {
      use_highways: 0.8,
      use_tolls: 0.5
    }
  },
  directions_type: 'maneuvers',
  units: 'kilometers',
  language: 'en-US'
})`}
        </pre>
      </div>

      <div style={{ marginTop: '1.5rem', background: '#f5f5f5', padding: '1.5rem', borderRadius: '0.5rem' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Example Route Response</h3>
        <pre style={{ 
          background: '#1a1a1a', 
          color: '#e5e5e5', 
          padding: '1rem',
          borderRadius: '0.375rem',
          overflow: 'auto',
          fontSize: '0.75rem',
          maxHeight: '300px'
        }}>
{`{
  "trip": {
    "locations": [...],
    "legs": [
      {
        "maneuvers": [
          {
            "type": 1,
            "instruction": "Drive east on Avenue de la Liberté",
            "length": 0.234,
            "time": 28,
            "begin_shape_index": 0,
            "end_shape_index": 5
          },
          ...
        ],
        "shape": "encoded_polyline_string",
        "summary": {
          "length": 243.5,
          "time": 10800
        }
      }
    ],
    "summary": {
      "length": 243.5,
      "time": 10800,
      "min_lat": 3.8480,
      "min_lon": 9.7679,
      "max_lat": 4.0511,
      "max_lon": 11.5021
    }
  }
}`}
        </pre>
      </div>
    </div>
  )
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{
      padding: '0.5rem',
      background: active ? '#dcfce7' : '#fee2e2',
      color: active ? '#166534' : '#991b1b',
      borderRadius: '0.375rem',
      textAlign: 'center',
      fontSize: '0.875rem',
      fontWeight: '500'
    }}>
      {label}
    </div>
  )
}
