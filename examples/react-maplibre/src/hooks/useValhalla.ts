'use client';

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  createRouter,
  type ValhallaRouter,
  type RouteRequest,
  type RouteResponse,
  type RouterStatus,
  type LoadProgress,
  ValhallaError,
} from '@jansoft/mbujkanji-valhalla-wasm'

export interface UseValhallaOptions {
  wasmPath?: string
  jsGluePath?: string
  autoInit?: boolean
  verbose?: boolean
}

export interface UseValhallaReturn {
  router: ValhallaRouter | null
  status: RouterStatus
  isInitializing: boolean
  isLoadingTiles: boolean
  isCalculating: boolean
  error: Error | null
  progress: LoadProgress | null
  init: () => Promise<void>
  loadTiles: (url: string) => Promise<void>
  loadTilesFromBuffer: (buffer: ArrayBuffer, regionId?: string) => Promise<void>
  route: (request: RouteRequest) => Promise<RouteResponse>
  clearTiles: () => void
  dispose: () => void
}

const DEFAULT_STATUS: RouterStatus = {
  wasmLoaded: false,
  tilesLoaded: false,
  ready: false,
  loadedRegions: [],
}

export function useValhalla(options: UseValhallaOptions = {}): UseValhallaReturn {
  const {
    wasmPath = '/valhalla.wasm',
    jsGluePath = '/valhalla.js',
    autoInit = false,
    verbose = false,
  } = options

  const routerRef = useRef<ValhallaRouter | null>(null)
  const [status, setStatus] = useState<RouterStatus>(DEFAULT_STATUS)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isLoadingTiles, setIsLoadingTiles] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState<LoadProgress | null>(null)

  // Initialize router
  const init = useCallback(async () => {
    if (routerRef.current?.getStatus().wasmLoaded) {
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      const router = createRouter({ verbose })
      
      await router.init({
        wasmPath,
        jsGluePath,
        onProgress: setProgress,
      })

      routerRef.current = router
      setStatus(router.getStatus())
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsInitializing(false)
      setProgress(null)
    }
  }, [wasmPath, jsGluePath, verbose])

  // Load tiles from URL
  const loadTiles = useCallback(async (url: string) => {
    if (!routerRef.current) {
      throw new Error('Router not initialized')
    }

    setIsLoadingTiles(true)
    setError(null)

    try {
      await routerRef.current.loadTilesFromUrl(url, {
        onProgress: setProgress,
      })
      setStatus(routerRef.current.getStatus())
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoadingTiles(false)
      setProgress(null)
    }
  }, [])

  // Load tiles from buffer
  const loadTilesFromBuffer = useCallback(async (buffer: ArrayBuffer, regionId?: string) => {
    if (!routerRef.current) {
      throw new Error('Router not initialized')
    }

    setIsLoadingTiles(true)
    setError(null)

    try {
      await routerRef.current.loadTiles(buffer, {
        regionId,
        onProgress: setProgress,
      })
      setStatus(routerRef.current.getStatus())
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoadingTiles(false)
      setProgress(null)
    }
  }, [])

  // Calculate route
  const route = useCallback(async (request: RouteRequest): Promise<RouteResponse> => {
    if (!routerRef.current) {
      throw new Error('Router not initialized')
    }

    setIsCalculating(true)
    setError(null)

    try {
      const response = await routerRef.current.route(request)
      return response
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsCalculating(false)
    }
  }, [])

  // Clear tiles
  const clearTiles = useCallback(() => {
    if (routerRef.current) {
      routerRef.current.clearTiles()
      setStatus(routerRef.current.getStatus())
    }
  }, [])

  // Dispose router
  const dispose = useCallback(() => {
    if (routerRef.current) {
      routerRef.current.dispose()
      routerRef.current = null
      setStatus(DEFAULT_STATUS)
    }
  }, [])

  // Auto-init if enabled
  useEffect(() => {
    if (autoInit) {
      init().catch(console.error)
    }

    return () => {
      dispose()
    }
  }, [autoInit, init, dispose])

  return {
    router: routerRef.current,
    status,
    isInitializing,
    isLoadingTiles,
    isCalculating,
    error,
    progress,
    init,
    loadTiles,
    loadTilesFromBuffer,
    route,
    clearTiles,
    dispose,
  }
}
