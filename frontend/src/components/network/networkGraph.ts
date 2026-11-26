/** Pure helpers for the Sigma transfer graph — kept free of DOM/Sigma for unit tests. */

export const NETWORK_EDGE_MUTED = '#26303b'

export const NETWORK_STATUS_COLOR: Record<string, string> = {
  HOT: '#f8c36b',
  PENDING: '#7d8c9b',
  COMPLETED: '#7de2ac',
  FAILED: '#ff969c',
  DENIED: '#ff969c',
}

export type StatusFilter = 'all' | 'HOT' | 'PENDING' | 'COMPLETED' | 'FAILED'

export interface EdgeFilterAttrs {
  status: string
  likelihood: number
}

export interface EdgeFilterResult {
  color: string
  size: number
  hidden: boolean
}

/** How a status filter paints one edge (no graph mutation). */
export function applyEdgeFilter(attrs: EdgeFilterAttrs, filter: StatusFilter): EdgeFilterResult {
  const visible = filter === 'all' || attrs.status === filter
  return {
    color: visible ? (NETWORK_STATUS_COLOR[attrs.status] ?? NETWORK_STATUS_COLOR.PENDING) : NETWORK_EDGE_MUTED,
    size: visible ? Math.max(1, attrs.likelihood / 25) : 0.5,
    hidden: !visible,
  }
}

/** Click target for a graph node id (`club-12` / `player-7`). */
export function pathForNodeClick(nodeId: string): string | null {
  if (nodeId.startsWith('club-')) return `/club/${nodeId.slice(5)}`
  if (nodeId.startsWith('player-')) return `/player/${nodeId.slice(7)}`
  return null
}

/** Click target for an edge carrying a rumour id. */
export function pathForEdgeClick(rumourId: number | null | undefined): string | null {
  if (rumourId == null || !Number.isFinite(rumourId)) return null
  return `/rumour/${rumourId}`
}
