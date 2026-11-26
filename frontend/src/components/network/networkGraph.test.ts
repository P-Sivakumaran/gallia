import { describe, it, expect } from 'vitest'
import {
  applyEdgeFilter,
  pathForEdgeClick,
  pathForNodeClick,
  NETWORK_EDGE_MUTED,
  NETWORK_STATUS_COLOR,
} from './networkGraph'

describe('applyEdgeFilter', () => {
  it('keeps matching edges coloured and sized by likelihood', () => {
    expect(applyEdgeFilter({ status: 'HOT', likelihood: 80 }, 'HOT')).toEqual({
      color: NETWORK_STATUS_COLOR.HOT,
      size: 3.2,
      hidden: false,
    })
  })

  it('mutes and shrinks edges that miss the filter', () => {
    expect(applyEdgeFilter({ status: 'FAILED', likelihood: 90 }, 'HOT')).toEqual({
      color: NETWORK_EDGE_MUTED,
      size: 0.5,
      hidden: true,
    })
  })

  it('shows every status when filter is all', () => {
    expect(applyEdgeFilter({ status: 'PENDING', likelihood: 25 }, 'all').hidden).toBe(false)
  })
})

describe('click-through routes', () => {
  it('routes club and player nodes to their pages', () => {
    expect(pathForNodeClick('club-42')).toBe('/club/42')
    expect(pathForNodeClick('player-7')).toBe('/player/7')
    expect(pathForNodeClick('other')).toBeNull()
  })

  it('routes edges with a rumour id to the rumour page', () => {
    expect(pathForEdgeClick(99)).toBe('/rumour/99')
    expect(pathForEdgeClick(undefined)).toBeNull()
  })
})
