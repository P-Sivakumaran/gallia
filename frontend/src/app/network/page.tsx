import SectionKicker from '@/components/SectionKicker'
import TransferGraphClient from '@/components/network/TransferGraphClient'

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SectionKicker>Deal Ecosystem</SectionKicker>
        <h1 className="text-3xl font-black tracking-display text-ink-primary sm:text-4xl">
          Transfer <span className="text-pitch-500">Network.</span>
        </h1>
        <p className="max-w-2xl text-sm text-ink-secondary">
          Force-directed graph of players, clubs, and active transfer rumours.
          Node size represents market value, edge thickness shows forecast likelihood, and edge colour indicates rumour status.
        </p>
      </div>
      <TransferGraphClient />
    </div>
  )
}
