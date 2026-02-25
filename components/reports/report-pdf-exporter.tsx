'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ReportPDFExporterProps {
  reportType?: string
  data?: unknown
  onExported?: () => void
}

export default function ReportPDFExporter({ reportType, data, onExported }: ReportPDFExporterProps) {
  const handleExport = () => {
    // TODO: Implement report PDF export
    void reportType
    void data
    onExported?.()
  }

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Export Report PDF
    </Button>
  )
}
