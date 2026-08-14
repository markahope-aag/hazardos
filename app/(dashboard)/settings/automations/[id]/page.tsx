import { AutomationEditor } from './automation-editor'

export const metadata = { title: 'Automation' }

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AutomationEditor processId={id} />
}
