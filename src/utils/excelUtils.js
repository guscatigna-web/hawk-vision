export function exportToCSV(data, filename, headers) {
  if (!data || !data.length) {
    alert("Sem dados para exportar.")
    return
  }

  // 1. Cria o cabeçalho CSV
  const csvRows = []
  const keys = Object.keys(headers) // ['date', 'product', 'type'...]
  const titles = Object.values(headers) // ['Data', 'Produto', 'Tipo'...]
  
  csvRows.push(titles.join(';')) // Separador ponto e virgula para Excel BR

  // 2. Preenche as linhas
  for (const row of data) {
    const values = keys.map(key => {
      let val = row[key]
      
      // Tratamento para evitar quebra de CSV (aspas, quebras de linha)
      if (val === null || val === undefined) val = ''
      val = String(val).replace(/"/g, '""') // Escapar aspas duplas
      return `"${val}"`
    })
    csvRows.push(values.join(';'))
  }

  // 3. Cria o arquivo Blob com BOM para acentuação correta
  const csvString = csvRows.join('\n')
  const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' })
  
  // 4. Download forçado
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}