import { supabase } from '../lib/supabase'

export const FiscalService = {
  /**
   * Solicita a emissão de uma NFC-e para uma venda específica via Edge Function.
   * @param {number} saleId - ID da venda (tabela sales)
   */
  async emitirNFCe(saleId) {
    try {
      // Chama a Edge Function 'emit-nfce' que você acabou de fazer deploy
      const { data, error } = await supabase.functions.invoke('emit-nfce', {
        body: { saleId }
      })

      if (error) {
        // Tenta ler a mensagem de erro da função, se houver
        const msg = error.context?.json?.error || error.message || 'Erro desconhecido na função'
        throw new Error(msg)
      }

      return {
        success: data.status === 'autorizado' || data.status === 'processando',
        message: data.fiscal_message || data.mensagem, // Nuvem Fiscal retorna 'mensagem'
        details: data
      }

    } catch (error) {
      console.error('Erro fiscal:', error)
      return {
        success: false,
        error: error.message || 'Erro de comunicação com o servidor fiscal.'
      }
    }
  }
}