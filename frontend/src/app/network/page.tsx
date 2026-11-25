import DeskPage from '@/components/desk/DeskPage'
import TransferGraphClient from '@/components/network/TransferGraphClient'

export default function NetworkPage() {
  return (
    <DeskPage
      eyebrow="DEAL ECOSYSTEM"
      title="Transfer network"
      accent="."
      intro="Players, clubs and the rumours that connect them. Node size follows market value; each line is a rumour, thicker when more likely, coloured by status."
    >
      <TransferGraphClient />
    </DeskPage>
  )
}
