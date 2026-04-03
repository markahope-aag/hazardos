import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/crm/contacts/${id}`)
}
