import GalliaDashboard from '@/components/gallia/GalliaDashboard'
import { loadGalliaWorkspace } from '@/lib/gallia-data'

export default async function HomePage() {
  const workspace = await loadGalliaWorkspace()
  return <GalliaDashboard workspace={workspace} />
}
