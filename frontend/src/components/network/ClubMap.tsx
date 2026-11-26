'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_ATTRIBUTION, MAP_STYLE_URL } from '@/lib/mapTiles'

const STATUS_COLOR: Record<string, string> = {
  HOT: '#f8c36b',
  PENDING: '#7d8c9b',
  COMPLETED: '#7de2ac',
  FAILED: '#ff969c',
  DENIED: '#ff969c',
}

interface MapClub {
  id: number
  name: string
  shortName: string | null
  city: string | null
  stadium: string | null
  lat: number
  lng: number
  openRumourCount: number
  rumourCount: number
}

interface MapRoute {
  rumourId: number
  status: string
  likelihood: number
  player: { id: number; name: string }
  fromClubId: number
  toClubId: number
}

interface UnplacedRumour {
  rumourId: number
  status: string
  likelihood: number
  player: { id: number; name: string }
  from: { id: number; name: string } | null
  to: { id: number; name: string } | null
  reason: string
}

interface MapPayload {
  clubs: MapClub[]
  routes: MapRoute[]
  unplaced: UnplacedRumour[]
  meta: { clubCount: number; routeCount: number; unplacedCount: number; feedHidden: number; attribution: string }
}

interface HoverClub {
  name: string
  stadium: string | null
  city: string | null
  openRumourCount: number
}

/** Great-circle-ish arc as a LineString between two lon/lat points. */
function arcCoords(from: [number, number], to: [number, number], steps = 32): [number, number][] {
  const [lng1, lat1] = from
  const [lng2, lat2] = to
  const midLng = (lng1 + lng2) / 2
  const midLat = (lat1 + lat2) / 2 + Math.abs(lng2 - lng1) * 0.15
  const out: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const omt = 1 - t
    out.push([
      omt * omt * lng1 + 2 * omt * t * midLng + t * t * lng2,
      omt * omt * lat1 + 2 * omt * t * midLat + t * t * lat2,
    ])
  }
  return out
}

export default function ClubMap({ includeFeed, statusFilter }: { includeFeed: boolean; statusFilter: string }) {
  const router = useRouter()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [payload, setPayload] = useState<MapPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<HoverClub | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/map${includeFeed ? '?include=feed' : ''}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<MapPayload>
      })
      .then((d) => {
        setPayload(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'map unavailable')
        setLoading(false)
      })
  }, [includeFeed])

  const geo = useMemo(() => {
    if (!payload) return null
    const byId = new Map(payload.clubs.map((c) => [c.id, c]))
    const routes = payload.routes.filter((r) => statusFilter === 'all' || r.status === statusFilter)
    const clubFeatures = payload.clubs.map((c) => ({
      type: 'Feature' as const,
      properties: {
        id: c.id,
        name: c.name,
        stadium: c.stadium ?? '',
        city: c.city ?? '',
        openRumourCount: c.openRumourCount,
      },
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] as [number, number] },
    }))
    const routeFeatures = routes.flatMap((r) => {
      const from = byId.get(r.fromClubId)
      const to = byId.get(r.toClubId)
      if (!from || !to) return []
      return [{
        type: 'Feature' as const,
        properties: {
          rumourId: r.rumourId,
          status: r.status,
          color: STATUS_COLOR[r.status] ?? STATUS_COLOR.PENDING,
          player: r.player.name,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: arcCoords([from.lng, from.lat], [to.lng, to.lat]),
        },
      }]
    })
    return {
      clubs: { type: 'FeatureCollection' as const, features: clubFeatures },
      routes: { type: 'FeatureCollection' as const, features: routeFeatures },
    }
  }, [payload, statusFilter])

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = new MapLibreMap({
      container: mapEl.current,
      style: MAP_STYLE_URL,
      center: [2.2, 48.5],
      zoom: 3.4,
      attributionControl: { compact: true, customAttribution: MAP_ATTRIBUTION },
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geo) return

    const ensure = () => {
      if (!map.getSource('clubs')) {
        map.addSource('clubs', { type: 'geojson', data: geo.clubs, cluster: true, clusterMaxZoom: 8, clusterRadius: 42 })
        map.addSource('routes', { type: 'geojson', data: geo.routes })
        map.addLayer({
          id: 'routes',
          type: 'line',
          source: 'routes',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.75,
          },
        })
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'clubs',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#1e2e24',
            'circle-stroke-color': '#9cdeb3',
            'circle-stroke-width': 1.5,
            'circle-radius': ['step', ['get', 'point_count'], 16, 4, 20, 10, 26],
          },
        })
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'clubs',
          filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
          paint: { 'text-color': '#c3edcf' },
        })
        map.addLayer({
          id: 'club-points',
          type: 'circle',
          source: 'clubs',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#9cdeb3',
            'circle-radius': 6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#10161f',
          },
        })

        map.on('click', 'clusters', (e: MapLayerMouseEvent) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          const clusterId = features[0]?.properties?.cluster_id
          const source = map.getSource('clubs') as GeoJSONSource
          if (clusterId == null) return
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            if (!features[0].geometry || features[0].geometry.type !== 'Point') return
            map.easeTo({ center: features[0].geometry.coordinates as [number, number], zoom })
          })
        })
        map.on('click', 'club-points', (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id
          if (id != null) router.push(`/club/${id}`)
        })
        map.on('click', 'routes', (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.rumourId
          if (id != null) router.push(`/rumour/${id}`)
        })
        map.on('mouseenter', 'club-points', (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = 'pointer'
          const p = e.features?.[0]?.properties
          if (!p) return
          setHover({
            name: String(p.name),
            stadium: p.stadium ? String(p.stadium) : null,
            city: p.city ? String(p.city) : null,
            openRumourCount: Number(p.openRumourCount) || 0,
          })
        })
        map.on('mouseleave', 'club-points', () => {
          map.getCanvas().style.cursor = ''
          setHover(null)
        })
        map.on('mouseenter', 'routes', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'routes', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
      } else {
        ;(map.getSource('clubs') as GeoJSONSource).setData(geo.clubs)
        ;(map.getSource('routes') as GeoJSONSource).setData(geo.routes)
      }
    }

    if (map.isStyleLoaded()) ensure()
    else map.once('load', ensure)
  }, [geo, router])

  const unplaced = useMemo(() => {
    if (!payload) return []
    return payload.unplaced.filter((u) => statusFilter === 'all' || u.status === statusFilter)
  }, [payload, statusFilter])

  return (
    <div className="g-map-layout">
      <div className="g-network-canvas g-map-canvas">
        <div ref={mapEl} className="g-network-surface" role="img" aria-label="Club transfer map" />
        {loading && <div className="g-network-overlay" style={{ left: 16, top: 16 }}>Loading map…</div>}
        {error && <div className="g-network-overlay" style={{ left: 16, top: 16 }} role="alert">Map unavailable ({error}). Is the backend running?</div>}
        {hover && (
          <div className="g-network-overlay" style={{ left: 16, top: 16 }}>
            <strong>{hover.name}</strong>
            <span className="g-muted">{[hover.stadium, hover.city].filter(Boolean).join(' · ') || 'Stadium unknown'}</span>
            <span className="g-muted">{hover.openRumourCount} open rumour{hover.openRumourCount === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>
      <aside className="g-map-unplaced" aria-label="Rumours without a mapped destination">
        <div className="g-panel-heading">
          <h2>Unmapped routes</h2>
          <span className="g-count-label">{unplaced.length}</span>
        </div>
        {unplaced.length === 0 && <p className="g-empty" style={{ padding: 16 }}>Every visible rumour has both clubs placed.</p>}
        <ul className="g-list">
          {unplaced.map((u) => (
            <li key={u.rumourId} className="g-admin-item" style={{ padding: '12px 16px' }}>
              <button type="button" className="g-btn" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => router.push(`/rumour/${u.rumourId}`)}>
                <span style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block' }}>{u.player.name}</strong>
                  <span className="g-note">{u.from?.name ?? '?'} → {u.to?.name ?? '?'} · {u.reason}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {payload && (
          <p className="g-note" style={{ padding: 16 }}>{payload.meta.attribution}. Tiles: {MAP_ATTRIBUTION}.</p>
        )}
      </aside>
    </div>
  )
}
