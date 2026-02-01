import maplibregl from 'maplibre-gl'
import {
  createRouter,
  decodePolyline,
  formatDistance,
  formatDuration,
  type ValhallaRouter,
  type RouteResponse,
} from '@jansoft/mbujkanji-valhalla-wasm'

// Global state
let router: ValhallaRouter | null = null
let map: maplibregl.Map | null = null
let originMarker: maplibregl.Marker | null = null
let destMarker: maplibregl.Marker | null = null

// DOM elements
const statusEl = document.getElementById('status')!
const routeBtn = document.getElementById('routeBtn') as HTMLButtonElement
const routeInfoEl = document.getElementById('routeInfo')!

// Initialize map
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    center: [9.7679, 4.0511], // Douala, Cameroon
    zoom: 12,
  })

  // Add route layer
  map.on('load', () => {
    map!.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    })

    map!.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 5,
        'line-opacity': 0.8,
      },
    })

    // Add route outline
    map!.addLayer(
      {
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1e40af',
          'line-width': 8,
          'line-opacity': 0.4,
        },
      },
      'route-line'
    )
  })

  // Click to set markers
  map.on('click', (e) => {
    const { lng, lat } = e.lngLat

    if (!originMarker) {
      setOrigin(lat, lng)
    } else if (!destMarker) {
      setDestination(lat, lng)
    }
  })
}

// Set origin marker
function setOrigin(lat: number, lon: number) {
  const originLatInput = document.getElementById('originLat') as HTMLInputElement
  const originLonInput = document.getElementById('originLon') as HTMLInputElement

  originLatInput.value = lat.toFixed(6)
  originLonInput.value = lon.toFixed(6)

  if (originMarker) {
    originMarker.remove()
  }

  originMarker = new maplibregl.Marker({ color: '#22c55e' })
    .setLngLat([lon, lat])
    .setPopup(new maplibregl.Popup().setHTML('<strong>Origin</strong>'))
    .addTo(map!)
}

// Set destination marker
function setDestination(lat: number, lon: number) {
  const destLatInput = document.getElementById('destLat') as HTMLInputElement
  const destLonInput = document.getElementById('destLon') as HTMLInputElement

  destLatInput.value = lat.toFixed(6)
  destLonInput.value = lon.toFixed(6)

  if (destMarker) {
    destMarker.remove()
  }

  destMarker = new maplibregl.Marker({ color: '#ef4444' })
    .setLngLat([lon, lat])
    .setPopup(new maplibregl.Popup().setHTML('<strong>Destination</strong>'))
    .addTo(map!)
}

// Initialize router
async function initRouter() {
  updateStatus('Initializing router...', 'loading')

  try {
    router = createRouter({ verbose: true })

    // Auto-detects WASM paths - no configuration needed!
    await router.init({
      onProgress: (p) => {
        updateStatus(`${p.message} (${p.percent}%)`, 'loading')
      },
    })

    updateStatus('Router initialized. Load tiles to enable routing.', 'loading')
  } catch (error) {
    console.error('Failed to initialize router:', error)
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// Load tiles
async function loadTiles() {
  const tilesUrl = (document.getElementById('tilesUrl') as HTMLInputElement).value

  if (!tilesUrl) {
    alert('Please enter a tiles URL')
    return
  }

  if (!router) {
    alert('Router not initialized')
    return
  }

  updateStatus('Loading tiles...', 'loading')

  try {
    await router.loadTilesFromUrl(tilesUrl, {
      onProgress: (p) => {
        updateStatus(`${p.message} (${p.percent}%)`, 'loading')
      },
    })

    updateStatus('Ready! Click on map to set origin and destination.', 'ready')
    routeBtn.disabled = false
  } catch (error) {
    console.error('Failed to load tiles:', error)
    updateStatus(`Error loading tiles: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// Calculate route
async function calculateRoute() {
  const originLat = parseFloat((document.getElementById('originLat') as HTMLInputElement).value)
  const originLon = parseFloat((document.getElementById('originLon') as HTMLInputElement).value)
  const destLat = parseFloat((document.getElementById('destLat') as HTMLInputElement).value)
  const destLon = parseFloat((document.getElementById('destLon') as HTMLInputElement).value)
  const costing = (document.getElementById('costing') as HTMLSelectElement).value as 'auto' | 'bicycle' | 'pedestrian' | 'truck'

  if (isNaN(originLat) || isNaN(originLon) || isNaN(destLat) || isNaN(destLon)) {
    alert('Please set origin and destination coordinates')
    return
  }

  if (!router || !router.isReady()) {
    alert('Router not ready. Please load tiles first.')
    return
  }

  routeBtn.disabled = true
  updateStatus('Calculating route...', 'loading')

  try {
    const response = await router.route({
      locations: [
        { lat: originLat, lon: originLon },
        { lat: destLat, lon: destLon },
      ],
      costing,
      directions_type: 'maneuvers',
    })

    displayRoute(response)
    updateStatus('Route calculated!', 'ready')
  } catch (error) {
    console.error('Route calculation failed:', error)
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  } finally {
    routeBtn.disabled = false
  }
}

// Display route on map
function displayRoute(response: RouteResponse) {
  const leg = response.trip.legs[0]
  const summary = response.trip.summary

  // Decode polyline and display on map
  const coordinates = decodePolyline(leg.shape, 'polyline6')

  const routeSource = map!.getSource('route') as maplibregl.GeoJSONSource
  routeSource.setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  })

  // Fit map to route
  const bounds = new maplibregl.LngLatBounds()
  coordinates.forEach((coord) => bounds.extend(coord as [number, number]))
  map!.fitBounds(bounds, { padding: 50 })

  // Display route info
  document.getElementById('routeDistance')!.textContent = formatDistance(summary.length * 1000)
  document.getElementById('routeDuration')!.textContent = formatDuration(summary.time)

  // Display maneuvers
  const maneuversEl = document.getElementById('maneuvers')!
  maneuversEl.innerHTML = leg.maneuvers
    .map(
      (m) => `
      <div class="maneuver">
        <div class="instruction">${m.instruction}</div>
        <div class="meta">${formatDistance(m.length * 1000)} - ${formatDuration(m.time)}</div>
      </div>
    `
    )
    .join('')

  routeInfoEl.style.display = 'block'
}

// Clear route
function clearRoute() {
  if (originMarker) {
    originMarker.remove()
    originMarker = null
  }

  if (destMarker) {
    destMarker.remove()
    destMarker = null
  }

  const routeSource = map?.getSource('route') as maplibregl.GeoJSONSource | undefined
  if (routeSource) {
    routeSource.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [],
      },
    })
  }

  routeInfoEl.style.display = 'none'

  // Clear inputs
  ;['originLat', 'originLon', 'destLat', 'destLon'].forEach((id) => {
    ;(document.getElementById(id) as HTMLInputElement).value = ''
  })
}

// Update status display
function updateStatus(message: string, type: 'loading' | 'ready' | 'error') {
  statusEl.textContent = message
  statusEl.className = `status ${type}`
}

// Expose functions to window for HTML onclick handlers
;(window as any).loadTiles = loadTiles
;(window as any).calculateRoute = calculateRoute
;(window as any).clearRoute = clearRoute

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initMap()
  initRouter()
})
