'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'

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

// Desk palette (gallia.css). Nodes stay quiet; status colour lives on the lines only.
const DESK = {
  player: '#9cdeb3',
  club: '#46566a',
  label: '#c3ccd6',
  muted: '#26303b',
  status: { HOT: '#f8c36b', PENDING: '#7d8c9b', COMPLETED: '#7de2ac', FAILED: '#ff969c', DENIED: '#ff969c' } as Record<string, string>,
}

const STATUS_LEGEND = [
  { label: 'Hot (70%+)', color: DESK.status.HOT },
  { label: 'Pending', color: DESK.status.PENDING },
  { label: 'Completed', color: DESK.status.COMPLETED },
  { label: 'Failed', color: DESK.status.FAILED },
]
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'HOT', label: 'Hot' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
] as const

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
        color: node.type === 'player' ? DESK.player : DESK.club,
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
        color: visible ? (DESK.status[edge.status] ?? DESK.status.PENDING) : DESK.muted,
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
      labelColor: { color: DESK.label },
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

  const frame = (body: ReactNode) => (
    <section className="g-panel">
      <div className="g-network-tools">
        <nav className="g-feed-tabs" aria-label="Filter rumours by status">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={filter === f.value ? 'active' : ''} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</button>
          ))}
        </nav>
        <div className="g-legend" aria-label="Line colour by rumour status">
          {STATUS_LEGEND.map((l) => <span key={l.label}><i style={{ background: l.color }} />{l.label}</span>)}
          <span><i className="dot" style={{ background: DESK.player }} />Player</span>
          <span><i className="dot" style={{ background: DESK.club }} />Club</span>
        </div>
      </div>
      {body}
      <div className="g-network-footer">
        <span>Scroll to zoom · drag to pan · hover a node for detail</span>
        {data && <span>{data.meta.nodeCount} nodes · {Math.round(data.meta.edgeCount / 2)} rumours</span>}
      </div>
    </section>
  )

  if (initError) {
    return frame(<div className="g-network-state" role="alert">The network could not be drawn in this browser ({initError}).</div>)
  }

  if (loading) {
    return frame(<div className="g-network-state">Building the transfer network…</div>)
  }

  if (!data) {
    return frame(<div className="g-network-state">The network is unavailable right now. Is the backend running?</div>)
  }

  return frame(
    <div className="g-network-canvas">
      <div ref={containerRef} className="g-network-surface" />
      {hovered && (
        <div className="g-network-overlay" style={{ left: 16, top: 16 }}>
          <strong>{hovered.label}</strong>
          <span className="g-muted">{hovered.type}{hovered.position ? ` · ${hovered.position}` : ''}{hovered.league ? ` · ${hovered.league}` : ''}</span>
          {hovered.marketValue ? <div className="g-ledger-fee">€{hovered.marketValue}M</div> : null}
        </div>
      )}
    </div>,
  )
}
