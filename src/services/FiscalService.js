import { supabase } from '../lib/supabase'

export const FiscalService = {
  // Função principal de emissão
  async emitirNFCe(saleId) {
    try {
      // 1. Busca dados da venda e da empresa
      const { data: sale } = await supabase
        .from('sales')
        .select('*, sale_items(*, product:products(*))')
        .eq('id', saleId)
        .single()

      const { data: company } = await supabase.from('company_settings').select('*').single()
      
      // Busca configuração fiscal (CSC/Token)
      const { data: fiscalConfig } = await supabase.from('fiscal_config').select('*').single()

      // 2. Validações Locais (Antes de tentar enviar)
      if (!company?.cnpj) throw new Error("Empresa sem CNPJ configurado.")
      if (!company?.state_registration) throw new Error("Empresa sem Inscrição Estadual.")
      
      // CORREÇÃO: Agora usamos a variável fiscalConfig para validar
      if (!fiscalConfig?.csc_token) {
        throw new Error("Token CSC não configurado. Vá em Configurações > Emissão Fiscal.")
      }
      
      // Valida NCM dos produtos
      const itensSemNcm = sale.sale_items.filter(i => !i.product?.ncm)
      if (itensSemNcm.length > 0) {
        throw new Error(`Produtos sem NCM: ${itensSemNcm.map(i => i.product.name).join(', ')}`)
      }

      // 3. Simulação de Envio para SEFAZ
      // Simulamos um delay de rede de 1.5s
      await new Promise(r => setTimeout(r, 1500))

      // 4. Gera dados de Sucesso Fake
      // Usa o ambiente configurado para definir a mensagem
      const ambiente = fiscalConfig.environment === 'producao' ? 'Produção' : 'Homologação'
      
      const fakeKey = "312401" + (company.cnpj.replace(/\D/g,'') || '00000000000000') + "650010000000011000000001"
      const fakeProtocol = "1" + Math.floor(Math.random() * 100000000000000)
      
      // 5. Atualiza a venda no banco com o sucesso
      const { error } = await supabase
        .from('sales')
        .update({
          fiscal_status: 'autorizado',
          fiscal_key: fakeKey,
          protocol_number: fakeProtocol,
          // Link genérico de QR Code para teste
          pdf_url: `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=${fakeKey}`, 
          fiscal_message: `Autorizado (Ambiente de ${ambiente})`
        })
        .eq('id', saleId)

      if (error) throw error

      return { success: true, pdf: `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=${fakeKey}` }

    } catch (error) {
      console.error("Erro fiscal:", error)
      
      // Grava o erro no banco para consultar no histórico depois
      await supabase.from('sales').update({
        fiscal_status: 'erro',
        fiscal_message: error.message
      }).eq('id', saleId)

      return { success: false, error: error.message }
    }
  }
}