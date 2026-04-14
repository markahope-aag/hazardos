// Lazy load PDF libraries to keep them out of the initial bundle.
export const generatePDFAsync = async () => {
  const [jsPDF, reactPDF] = await Promise.all([
    import('jspdf'),
    import('@react-pdf/renderer').catch(() => null),
  ])

  return {
    jsPDF: jsPDF.default,
    reactPDF,
  }
}
