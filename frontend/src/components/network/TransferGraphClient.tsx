'use client'

import dynamic from 'next/dynamic'

// Sigma and MapLibre need window — load client-side only
const NetworkExplorer = dynamic(() => import('@/components/network/NetworkExplorer'), {
  ssr: false,
  loading: () => <div className="g-network-state">Loading the transfer network…</div>,
})

export default function TransferGraphClient() {
  return <NetworkExplorer />
}
