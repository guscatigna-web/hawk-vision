// Utilitários para manipulação de Datas (Fuso Horário Brasil)

/**
 * Converte uma data input (YYYY-MM-DD) para ISO String UTC no INÍCIO do dia (00:00:00)
 */
export function toUTCStart(dateString) {
  if (!dateString) return null
  const localDate = new Date(dateString + 'T00:00:00')
  return localDate.toISOString()
}

/**
 * Converte uma data input (YYYY-MM-DD) para ISO String UTC no FINAL do dia (23:59:59)
 */
export function toUTCEnd(dateString) {
  if (!dateString) return null
  const localDate = new Date(dateString + 'T23:59:59.999')
  return localDate.toISOString()
}

/**
 * Formata data/hora completa (ISO) para PT-BR
 */
export function formatDateTime(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (para inputs date)
 */
export function getTodayInput() {
  const local = new Date()
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return local.toISOString().split('T')[0]
}

/**
 * NOVA FUNÇÃO: Formata data YYYY-MM-DD (do banco/input) para DD/MM/AAAA 
 * sem sofrer alteração de fuso horário.
 */
export function formatDateBr(dateString) {
  if (!dateString) return '-'
  // Se vier timestamp completo, pega só a parte da data
  const cleanDate = dateString.split('T')[0]
  const [year, month, day] = cleanDate.split('-')
  return `${day}/${month}/${year}`
}