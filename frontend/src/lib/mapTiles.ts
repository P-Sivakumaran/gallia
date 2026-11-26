/**
 * Public map tile config. OpenFreeMap allows commercial use with no API key or cap.
 * Swap MAP_STYLE_URL to a self-hosted Protomaps PMTiles style if OpenFreeMap is down.
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty'

export const MAP_ATTRIBUTION = '© OpenMapTiles Data from OpenStreetMap'
