import { describe, it, expect } from 'vitest'
import { MAP_ATTRIBUTION, MAP_STYLE_URL } from './mapTiles'

describe('mapTiles', () => {
  it('defaults to OpenFreeMap liberty with OSM attribution', () => {
    expect(MAP_STYLE_URL).toContain('openfreemap.org')
    expect(MAP_ATTRIBUTION.toLowerCase()).toContain('openstreetmap')
  })
})
