// Utilitários para manipulação de Datas (Fuso Horário Brasil)

/**
 * Converte uma data input (YYYY-MM-DD) para ISO String UTC no INÍCIO do dia (00:00:00)
 * Ideal para filtros "De:" ou "Maior ou igual a"
 */
export function toUTCStart(dateString) {
  if (!dateString) return null
  // Cria data considerando o fuso local do navegador
  const localDate = new Date(dateString + 'T00:00:00')
  return localDate.toISOString()
}

/**
 * Converte uma data input (YYYY-MM-DD) para ISO String UTC no FINAL do dia (23:59:59)
 * Ideal para filtros "Até:" ou "Menor ou igual a"
 */
export function toUTCEnd(dateString) {
  if (!dateString) return null
  const localDate = new Date(dateString + 'T23:59:59.999')
  return localDate.toISOString()
}

/**
 * Formata uma data ISO (do banco) para exibição padrão PT-BR (DD/MM/AAAA HH:mm)
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