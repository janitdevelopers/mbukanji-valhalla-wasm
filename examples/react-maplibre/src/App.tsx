'use client';

import { useState, useCallback, useRef, useEffect } from 'react'
import Map, { Source, Layer, Marker, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import {
  decodePolyline,
  formatDistance,
  formatDuration,
  type RouteResponse,
  type CostingModel,
} from '@jansoft/mbujkanji-valhalla-wasm'
import { useValhalla } from './hooks/useValhalla'
import { GeoJSON } from 'geojson';

interface Location {
  lat: number
  lon: number
}

export function App() {
  const mapRef = useRef<MapRef>(null)
  
  const {
    status,
    isInitializing,
    isLoadingTiles,
    isCalculating,
    error,
    progress,
    init,
    loadTiles,
    route,
    clearTiles,
  } = useValhalla({ verbose: true })

  const [tilesUrl, setTilesUrl] = useState('')
  const [origin, setOrigin] = useState<Location | null>(null)
  const [destination, setDestination] = useState<Location | null>(null)
  const [costing, setCosting] = useState<CostingModel>('auto')
  const [routeData, setRouteData] = useState<RouteResponse | null>(null)
  const [routeGeojson, setRouteGeojson] = useState<GeoJSON.LineString | null>(null)

  // Handle map click
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat
    
    if (!origin) {
      setOrigin({ lat, lon: lng })
    } else if (!destination) {
      setDestination({ lat, lon: lng })
    }
  }, [origin, destination])

  // Initialize router
  const handleInit = useCallback(async () => {
    try {
      await init()
    } catch (err) {
      console.error('Init failed:', err)
    }
  }, [init])

  // Load tiles
  const handleLoadTiles = useCallback(async () => {
    if (!tilesUrl) return
    
    try {
      await loadTiles(tilesUrl)
    } catch (err) {
      console.error('Load tiles failed:', err)
    }
  }, [tilesUrl, loadTiles])

  // Calculate route
  const handleRoute = useCallback(async () => {
    if (!origin || !destination) return
    
    try {
      const response = await route({
        locations: [origin, destination],
        costing,
        directions_type: 'maneuvers',
      })
      
      setRouteData(response)
      
      // Decode polyline for map display
      const coordinates = decodePolyline(response.trip.legs[0].shape, 'polyline6')
      setRouteGeojson({
        type: 'LineString',
        coordinates,
      })

      // Fit bounds
      if (mapRef.current) {
        const bounds = coordinates.reduce(
          (acc, coord) => {
            return [
              [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
              [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])],
            ]
          },
          [[Infinity, Infinity], [-Infinity, -Infinity]]
        )
        
        mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
          padding: 50,
        })
      }
    } catch (err) {
      console.error('Route failed:', err)
    }
  }, [origin, destination, costing, route])

  // Clear everything
  const handleClear = useCallback(() => {
    setOrigin(null)
    setDestination(null)
    setRouteData(null)
    setRouteGeojson(null)
  }, [])

  // Get status display
  const getStatusBadge = () => {
    if (error) {
      return { type: 'error', text: error.message }
    }
    if (isInitializing || isLoadingTiles) {
      return { 
        type: 'loading', 
        text: progress?.message || 'Loading...',
        showSpinner: true,
      }
    }
    if (status.ready) {
      return { type: 'ready', text: 'Ready - Click map to set points' }
    }
    if (status.wasmLoaded) {
      return { type: 'loading', text: 'Load tiles to enable routing' }
    }
    return { type: 'loading', text: 'Click Initialize to start' }
  }

  const statusBadge = getStatusBadge()

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Valhalla WASM</h1>
        <p className="subtitle">React + MapLibre Example</p>

        <div className={`status-badge ${statusBadge.type}`}>
          {statusBadge.showSpinner && <div className="spinner" />}
          {statusBadge.text}
        </div>

        {/* Initialization Panel */}
        <div className="panel">
          <div className="panel-title">Setup</div>
          
          {!status.wasmLoaded && (
            <button 
              className="btn-primary"
              onClick={handleInit}
              disabled={isInitializing}
            >
              {isInitializing ? 'Initializing...' : 'Initialize Router'}
            </button>
          )}

          {status.wasmLoaded && !status.tilesLoaded && (
            <>
              <div className="form-group">
                <label>Tiles URL</label>
                <input
                  type="text"
                  value={tilesUrl}
                  onChange={(e) => setTilesUrl(e.target.value)}
                  placeholder="https://cdn.example.com/tiles.tar"
                />
              </div>
              <button 
                className="btn-primary"
                onClick={handleLoadTiles}
                disabled={!tilesUrl || isLoadingTiles}
              >
                {isLoadingTiles ? `Loading ${progress?.percent || 0}%` : 'Load Tiles'}
              </button>
            </>
          )}

          {status.ready && (
            <button className="btn-secondary" onClick={clearTiles}>
              Unload Tiles
            </button>
          )}
        </div>

        {/* Routing Panel */}
        {status.ready && (
          <div className="panel">
            <div className="panel-title">Route</div>
            
            <div className="form-group">
              <label>Origin</label>
              <div className="coordinates-grid">
                <input
                  type="number"
                  value={origin?.lat.toFixed(6) || ''}
                  onChange={(e) => setOrigin(prev => ({ ...prev!, lat: parseFloat(e.target.value) }))}
                  placeholder="Latitude"
                  step="0.000001"
                />
                <input
                  type="number"
                  value={origin?.lon.toFixed(6) || ''}
                  onChange={(e) => setOrigin(prev => ({ ...prev!, lon: parseFloat(e.target.value) }))}
                  placeholder="Longitude"
                  step="0.000001"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Destination</label>
              <div className="coordinates-grid">
                <input
                  type="number"
                  value={destination?.lat.toFixed(6) || ''}
                  onChange={(e) => setDestination(prev => ({ ...prev!, lat: parseFloat(e.target.value) }))}
                  placeholder="Latitude"
                  step="0.000001"
                />
                <input
                  type="number"
                  value={destination?.lon.toFixed(6) || ''}
                  onChange={(e) => setDestination(prev => ({ ...prev!, lon: parseFloat(e.target.value) }))}
                  placeholder="Longitude"
                  step="0.000001"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Travel Mode</label>
              <select value={costing} onChange={(e) => setCosting(e.target.value as CostingModel)}>
                <option value="auto">Driving</option>
                <option value="bicycle">Bicycle</option>
                <option value="pedestrian">Walking</option>
                <option value="truck">Truck</option>
              </select>
            </div>

            <button
              className="btn-primary"
              onClick={handleRoute}
              disabled={!origin || !destination || isCalculating}
            >
              {isCalculating ? 'Calculating...' : 'Calculate Route'}
            </button>
            
            <button className="btn-secondary" onClick={handleClear}>
              Clear
            </button>
          </div>
        )}

        {/* Route Results */}
        {routeData && (
          <div className="panel">
            <div className="panel-title">Route Summary</div>
            <div className="route-summary">
              <div className="route-stat">
                <span className="label">Distance</span>
                <span className="value">
                  {formatDistance(routeData.trip.summary.length * 1000)}
                </span>
              </div>
              <div className="route-stat">
                <span className="label">Duration</span>
                <span className="value">
                  {formatDuration(routeData.trip.summary.time)}
                </span>
              </div>
            </div>

            <div className="panel-title" style={{ marginTop: 16 }}>Directions</div>
            <div className="maneuvers-list">
              {routeData.trip.legs[0].maneuvers.map((m, i) => (
                <div key={i} className="maneuver-item">
                  <div className="maneuver-instruction">{m.instruction}</div>
                  <div className="maneuver-meta">
                    {formatDistance(m.length * 1000)} - {formatDuration(m.time)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="map-container">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 9.7679,
            latitude: 4.0511,
            zoom: 12,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={{
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: [
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                ],
                tileSize: 256,
              },
            },
            layers: [
              {
                id: 'osm-tiles',
                type: 'raster',
                source: 'osm-tiles',
              },
            ],
          }}
          onClick={handleMapClick}
        >
          {/* Route line */}
          {routeGeojson && (
            <Source type="geojson" data={{ type: 'Feature', properties: {}, geometry: routeGeojson }}>
              <Layer
                id="route-outline"
                type="line"
                paint={{
                  'line-color': '#1e40af',
                  'line-width': 8,
                  'line-opacity': 0.4,
                }}
              />
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': 5,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}

          {/* Markers */}
          {origin && (
            <Marker longitude={origin.lon} latitude={origin.lat} color="#22c55e" />
          )}
          {destination && (
            <Marker longitude={destination.lon} latitude={destination.lat} color="#ef4444" />
          )}
        </Map>
      </div>
    </div>
  )
}
