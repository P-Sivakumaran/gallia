import DeskPage from '@/components/desk/DeskPage'
import TransferGraphClient from '@/components/network/TransferGraphClient'

export default function NetworkPage() {
  return (
    <DeskPage
      eyebrow="DEAL ECOSYSTEM"
      title="Transfer network"
      accent="."
      intro="Players, clubs and the rumours that connect them. Switch to Map for clubs placed by Wikidata coordinates. Click a node, line or pin to open it."
    >
      <TransferGraphClient />
    </DeskPage>
  )
}
