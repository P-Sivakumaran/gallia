'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { applyEdgeFilter, pathForEdgeClick, pathForNodeClick, NETWORK_STATUS_COLOR, type StatusFilter } from './networkGraph'

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
  meta: { nodeCount: number; edgeCount: number; rumourCount?: number; feedHidden?: number }
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
  status: NETWORK_STATUS_COLOR,
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
  { value: 'FAILED', label: 'Failed' },
] as const

function paintEdges(graph: Graph, filter: StatusFilter) {
  graph.forEachEdge((edge, attrs) => {
    const next = applyEdgeFilter(
      { status: String(attrs.status), likelihood: Number(attrs.likelihood) || 0 },
      filter,
    )
    graph.setEdgeAttribute(edge, 'color', next.color)
    graph.setEdgeAttribute(edge, 'size', next.size)
    graph.setEdgeAttribute(edge, 'hidden', next.hidden)
  })
}

export default function TransferGraph() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const filterRef = useRef<StatusFilter>('all')
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<HoveredNode | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [includeFeed, setIncludeFeed] = useState(false)

  filterRef.current = filter

  useEffect(() => {
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/graph${includeFeed ? '?include=feed' : ''}`)
      .then((r) => r.json())
      .then((d: GraphData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [includeFeed])

  // Build Sigma once per data load. Filter changes update edge attrs only (no re-layout).
  useEffect(() => {
    if (!data || !containerRef.current) return

    const graph = new Graph({ multi: true, type: 'directed' })
    graphRef.current = graph

    for (const node of data.nodes) {
      graph.addNode(node.id, {
        label: node.label,
        x: node.x,
        y: node.y,
        size: node.size,
        color: node.type === 'player' ? DESK.player : DESK.club,
        nodeType: node.type,
        position: node.position,
        league: node.league,
        marketValue: node.marketValue,
      })
    }

    for (const edge of data.edges) {
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        color: DESK.status[edge.status] ?? DESK.status.PENDING,
        size: edge.size,
        weight: edge.weight,
        status: edge.status,
        likelihood: edge.likelihood,
        rumourId: edge.rumourId,
        label: edge.label,
        hidden: false,
      })
    }

    paintEdges(graph, filterRef.current)

    // One layout pass per fetch. Backend already seeds x/y; FA2 settles overlapping nodes once.
    forceAtlas2.assign(graph, {
      iterations: 80,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        strongGravityMode: false,
        barnesHutOptimize: true,
      },
    })

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

    sigma.on('enterNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node)
      setHovered({
        label: attrs.label,
        type: attrs.nodeType,
        position: attrs.position,
        league: attrs.league,
        marketValue: attrs.marketValue,
      })
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

    sigma.on('clickNode', ({ node }) => {
      const path = pathForNodeClick(node)
      if (path) router.push(path)
    })

    sigma.on('clickEdge', ({ edge }) => {
      const path = pathForEdgeClick(graph.getEdgeAttribute(edge, 'rumourId') as number | undefined)
      if (path) router.push(path)
    })

    return () => {
      sigmaRef.current?.kill()
      sigmaRef.current = null
      graphRef.current = null
    }
  }, [data, router])

  useEffect(() => {
    const graph = graphRef.current
    const sigma = sigmaRef.current
    if (!graph || !sigma) return
    paintEdges(graph, filter)
    sigma.refresh()
  }, [filter])

  const frame = (body: ReactNode) => (
    <section className="g-panel">
      <div className="g-network-tools">
        <nav className="g-feed-tabs" aria-label="Filter rumours by status">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={filter === f.value ? 'active' : ''} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</button>
          ))}
        </nav>
        <nav className="g-feed-tabs" aria-label="Which deals to include">
          <button type="button" className={includeFeed ? '' : 'active'} aria-pressed={!includeFeed} onClick={() => setIncludeFeed(false)}>News rumours</button>
          <button type="button" className={includeFeed ? 'active' : ''} aria-pressed={includeFeed} onClick={() => setIncludeFeed(true)}>+ Feed transfers</button>
        </nav>
        <div className="g-legend" aria-label="Line colour by rumour status">
          {STATUS_LEGEND.map((l) => <span key={l.label}><i style={{ background: l.color }} />{l.label}</span>)}
          <span><i className="dot" style={{ background: DESK.player }} />Player</span>
          <span><i className="dot" style={{ background: DESK.club }} />Club</span>
        </div>
      </div>
      {body}
      <div className="g-network-footer">
        <span>Scroll to zoom · drag to pan · click a node or line to open it</span>
        {data && (
          <span>
            {data.meta.nodeCount} nodes · {data.meta.rumourCount ?? Math.round(data.meta.edgeCount / 2)} rumours
            {!includeFeed && data.meta.feedHidden ? ` · ${data.meta.feedHidden} feed-only transfers hidden` : ''}
          </span>
        )}
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
