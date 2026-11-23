import TransferGraphClient from '@/components/network/TransferGraphClient'

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transfer Network</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Force-directed graph of players, clubs, and active transfer rumours.
          Node size = market value · Edge thickness = likelihood · Edge color = status.
        </p>
      </div>
      <TransferGraphClient />
    </div>
  )
}
