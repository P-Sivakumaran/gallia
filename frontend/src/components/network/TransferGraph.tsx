'use client'

import { useEffect, useRef, useState } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { clsx } from 'clsx'
import { chartColors } from '@/lib/chartTheme'

interface GraphNode {
  id: string
  label: string
  type: 'player' | 'club'
  size: number
  color: string
  x: number
  y: number
  position?: string
  league?: string
  marketValue?: number
  likelihood?: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  color: string
  size: number
  weight: number
  status: string
  likelihood: number
  rumourId?: number
  label?: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  meta: { nodeCount: number; edgeCount: number }
}

interface HoveredNode {
  label: string
  type: string
  position?: string
  league?: string
  marketValue?: number
}

const STATUS_LEGEND = [
  { label: 'HOT (≥70%)', color: chartColors.hot },
  { label: 'PENDING', color: chartColors.pending },
  { label: 'COMPLETED', color: chartColors.success },
  { label: 'FAILED', color: chartColors.danger },
]

export default function TransferGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<HoveredNode | null>(null)
  const [filter, setFilter] = useState<'all' | 'HOT' | 'PENDING' | 'COMPLETED'>('all')

  // Fetch graph data
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/graph`)
      .then((r) => r.json())
      .then((d: GraphData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Build and render graph
  useEffect(() => {
    if (!data || !containerRef.current) return

    const graph = new Graph({ multi: true, type: 'directed' })
    graphRef.current = graph

    // Add nodes — Sigma v3 uses 'circle' as default node type; no custom types needed
    for (const node of data.nodes) {
      graph.addNode(node.id, {
        label: node.label,
        x: node.x,
        y: node.y,
        size: node.size,
        color: node.color,
        nodeType: node.type,   // stored as data attr, not Sigma type
        position: node.position,
        league: node.league,
        marketValue: node.marketValue,
      })
    }

    // Add edges (filtered by status if needed)
    for (const edge of data.edges) {
      const visible = filter === 'all' || edge.status === filter
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        color: visible ? edge.color : chartColors.track,
        size: visible ? edge.size : 0.5,
        weight: edge.weight,
        status: edge.status,
        likelihood: edge.likelihood,
        rumourId: edge.rumourId,
        label: edge.label,
        hidden: !visible,
      })
    }

    // Run ForceAtlas2 layout (non-blocking, limited iterations)
    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        strongGravityMode: false,
        barnesHutOptimize: true,
      },
    })

    // Init Sigma
    let sigma: Sigma
    try {
    sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelFont: 'Inter, sans-serif',
      labelSize: 12,
      labelWeight: '600',
      labelColor: { color: chartColors.canvasLabel },
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
    })
    } catch (e) {
      setInitError(String(e))
      return
    }
    sigmaRef.current = sigma

    // Hover events
    sigma.on('enterNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node)
      setHovered({
        label: attrs.label,
        type: attrs.nodeType,
        position: attrs.position,
        league: attrs.league,
        marketValue: attrs.marketValue,
      })
      // Highlight connected edges
      graph.edges(node).forEach((e) => {
        graph.setEdgeAttribute(e, 'size', graph.getEdgeAttribute(e, 'size') * 2)
      })
      sigma.refresh()
    })

    sigma.on('leaveNode', ({ node }) => {
      setHovered(null)
      graph.edges(node).forEach((e) => {
        graph.setEdgeAttribute(e, 'size', graph.getEdgeAttribute(e, 'size') / 2)
      })
      sigma.refresh()
    })

    return () => {
      sigmaRef.current?.kill()
      sigmaRef.current = null
    }
  }, [data, filter])

  if (initError) {
    return (
      <div className="rounded-xl border border-failed-deep/40 bg-failed-deepest/20 p-6 text-sm">
        <p className="font-semibold text-failed-fg mb-2">Graph init error</p>
        <pre className="text-failed-soft/70 text-xs overflow-auto">{initError}</pre>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-canvas-md items-center justify-center rounded-xl border border-line-subtle bg-surface-panel/40">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-pitch-500 border-t-transparent" />
          <p className="text-sm text-ink-muted">Building transfer network...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(['all', 'HOT', 'PENDING', 'COMPLETED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                filter === f
                  ? 'border-pitch-500 bg-pitch-500/20 text-pitch-500'
                  : 'border-line text-ink-secondary hover:border-line-emphasis',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-3 text-xs text-ink-muted">
          {STATUS_LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Graph canvas */}
      <div className="relative overflow-hidden rounded-xl border border-line-subtle bg-surface-base">
        <div ref={containerRef} className="h-canvas-lg w-full" />

        {/* Node type legend */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-lg border border-line bg-surface-panel/90 px-3 py-2 text-xs backdrop-blur">
          <span className="flex items-center gap-2 text-ink-secondary">
            <span className="h-3 w-3 rounded-full bg-node-player" /> Player
          </span>
          <span className="flex items-center gap-2 text-ink-secondary">
            <span className="h-3 w-3 rounded-sm bg-node-club" /> Club
          </span>
        </div>

        {/* Stats */}
        {data && (
          <div className="absolute bottom-4 right-4 rounded-lg border border-line bg-surface-panel/90 px-3 py-2 text-xs text-ink-secondary backdrop-blur">
            {data.meta.nodeCount} nodes · {Math.round(data.meta.edgeCount / 2)} rumours
          </div>
        )}

        {/* Hover tooltip */}
        {hovered && (
          <div className="absolute left-4 top-4 rounded-lg border border-line bg-surface-panel/95 px-3 py-2 text-sm backdrop-blur">
            <p className="font-semibold text-ink-primary">{hovered.label}</p>
            <p className="text-xs text-ink-secondary capitalize">{hovered.type}</p>
            {hovered.position && <p className="text-xs text-ink-muted">Position: {hovered.position}</p>}
            {hovered.league && <p className="text-xs text-ink-muted">{hovered.league}</p>}
            {hovered.marketValue && (
              <p className="text-xs text-pitch-500 font-mono">€{hovered.marketValue}M</p>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">Scroll to zoom · drag to pan · hover nodes for detail</p>
    </div>
  )
}
