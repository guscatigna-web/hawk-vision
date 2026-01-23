// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializa Supabase Admin com a chave SERVICE_ROLE_KEY
    // Isso é CRUCIAL para ter permissão de chamar RPC e atualizar tabelas sem restrições
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '' 
    )

    // 1. RECEBER DADOS
    const { saleId } = await req.json()
    if (!saleId) throw new Error('ID da venda obrigatório')

    // 2. BUSCAR DADOS COMPLETOS DA VENDA
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(*)), company:companies(*)')
      .eq('id', saleId)
      .single()

    if (saleError || !sale) throw new Error('Venda não encontrada')

    // 3. BUSCAR CONFIGURAÇÕES
    const { data: fiscalConfig } = await supabase.from('fiscal_config').select('*').single()
    const { data: companySettings } = await supabase.from('company_settings').select('*').single()
    
    // Validação de Credenciais
    if (!fiscalConfig?.client_id || !fiscalConfig?.client_secret) {
        throw new Error('Credenciais Fiscais (Client ID/Secret) não configuradas no sistema.')
    }
    
    // Validação de Dados da Empresa (Básico)
    if (!companySettings?.cnpj || !companySettings?.state_registration) {
        throw new Error('CNPJ ou Inscrição Estadual da empresa não configurados.')
    }

    // 4. AUTENTICAÇÃO OAUTH2 (NUVEM FISCAL)
    const authUrl = 'https://auth.nuvemfiscal.com.br/oauth/token'
    
    const tokenResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: fiscalConfig.client_id,
            client_secret: fiscalConfig.client_secret,
            scope: 'nfce'
        })
    })

    if (!tokenResponse.ok) {
        const err = await tokenResponse.json()
        throw new Error(`Erro Autenticação Fiscal: ${err.error_description || err.error || 'Credenciais inválidas'}`)
    }
    
    const { access_token } = await tokenResponse.json()

    // ---------------------------------------------------------
    // 5. GERAR NÚMERO SEQUENCIAL (nNF) VIA BANCO DE DADOS
    // ---------------------------------------------------------
    const ambiente = fiscalConfig.environment === 'producao' ? 'producao' : 'homologacao'
    
    // Garante que temos um company_id. Usa o da venda ou o das configurações.
    const companyId = sale.company_id || companySettings.id;

    // Chama a função SQL RPC para obter o próximo número de forma atômica e segura
    const { data: nextNumber, error: seqError } = await supabase.rpc('get_next_nfe_number', {
        p_company_id: companyId,
        p_environment: ambiente,
        p_serie: 1 // Série padrão 1
    })

    if (seqError || !nextNumber) {
        console.error("Erro RPC:", seqError)
        throw new Error('Falha crítica: Não foi possível gerar o número sequencial da nota.')
    }

    console.log(`Gerando Nota Fiscal Nº ${nextNumber} (Série 1) - Ambiente: ${ambiente}`)

    // 6. MAPEAR DADOS PARA O JSON DA NUVEM FISCAL
    const nfePayload = {
        ambiente: ambiente,
        infNFe: {
            versao: "4.00",
            ide: {
                cUF: "31", // FIXO MG - Idealmente deveria vir de companySettings.uf_code
                natOp: "VENDA AO CONSUMIDOR",
                mod: "65", // NFC-e
                serie: "1",
                nNF: nextNumber.toString(), // Usa o número gerado pelo banco
                dhEmi: new Date().toISOString(),
                tpNF: "1", // Saída
                idDest: "1", // Interna
                cMunFG: "3106200", // FIXO BH - Idealmente vir de companySettings.city_code
                tpImp: "4", // DANFE NFC-e
                tpEmis: "1", // Normal
                tpAmb: ambiente === 'producao' ? "1" : "2",
                finNFe: "1", // Normal
                indFinal: "1", // Consumidor final
                indPres: "1", // Presencial
                procEmi: "0",
                verProc: "HawkVision 1.0"
            },
            emit: {
                CNPJ: companySettings.cnpj.replace(/\D/g, ''),
                xNome: companySettings.company_name,
                enderEmit: {
                    xLgr: companySettings.address,
                    nro: "SN",
                    xBairro: "Centro", 
                    cMun: "3106200",   
                    xMun: companySettings.city,
                    UF: "MG",          
                    CEP: companySettings.cep.replace(/\D/g, ''),
                    cPais: "1058",
                    xPais: "BRASIL"
                },
                IE: companySettings.state_registration.replace(/\D/g, ''),
                CRT: "1" // 1 = Simples Nacional
            },
            det: sale.sale_items.map((item: any, index: number) => ({
                nItem: index + 1,
                prod: {
                    cProd: item.product.id.toString(),
                    cEAN: "SEM GTIN",
                    xProd: item.product_name,
                    NCM: item.product.ncm || "00000000",
                    CFOP: "5102",
                    uCom: item.product.unit || "UN",
                    qCom: item.quantity,
                    vUnCom: item.unit_price,
                    vProd: item.total_price,
                    cEANTrib: "SEM GTIN",
                    uTrib: item.product.unit || "UN",
                    qTrib: item.quantity,
                    vUnTrib: item.unit_price,
                    indTot: "1"
                },
                imposto: {
                    ICMS: {
                        ICMSSN102: { 
                            orig: item.product.origin || "0",
                            CSOSN: "102"
                        }
                    },
                    // PIS e COFINS zerados para MVP Simples Nacional
                    PIS: { PISOutr: { CST: "99", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" } },
                    COFINS: { COFINSOutr: { CST: "99", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" } }
                }
            })),
            total: {
                ICMSTot: {
                    vBC: "0.00", vICMS: "0.00", vICMSDeson: "0.00", vFCP: "0.00",
                    vBCST: "0.00", vST: "0.00", vFCPST: "0.00", vFCPSTRet: "0.00",
                    vProd: sale.total, vFrete: "0.00", vSeg: "0.00", vDesc: "0.00",
                    vII: "0.00", vIPI: "0.00", vIPIDevol: "0.00", 
                    vPIS: "0.00", vCOFINS: "0.00", vOutro: "0.00", vNF: sale.total
                }
            },
            transp: { modFrete: "9" },
            pag: {
                detPag: [{
                    tPag: mapPaymentMethod(sale.payment_method),
                    vPag: sale.total
                }]
            }
        }
    }

    // 7. ENVIAR PARA API DA NUVEM FISCAL
    const apiUrl = 'https://api.nuvemfiscal.com.br'
    
    const emitResponse = await fetch(`${apiUrl}/nfe/emissoes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(nfePayload)
    })

    const gatewayResponse = await emitResponse.json()

    // 8. TRATAR RESPOSTA
    if (!emitResponse.ok) {
        // Se falhou na API, lançamos erro com a mensagem da Nuvem Fiscal
        throw new Error(gatewayResponse.mensagem || gatewayResponse.error || 'Erro desconhecido na API Fiscal')
    }

    // 9. ATUALIZAR STATUS NO BANCO
    const isAuth = gatewayResponse.status === 'autorizado'
    
    await supabase
        .from('sales')
        .update({
            fiscal_status: isAuth ? 'autorizado' : 'erro',
            fiscal_key: gatewayResponse.chave,
            fiscal_message: isAuth ? 'Autorizada' : (gatewayResponse.motivo || 'Erro na emissão'),
            xml_url: gatewayResponse.xml_url, 
            pdf_url: gatewayResponse.pdf_url, 
            protocol_number: gatewayResponse.protocolo
        })
        .eq('id', saleId)

    return new Response(
      JSON.stringify(gatewayResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Erro na Edge Function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Função auxiliar de mapeamento
function mapPaymentMethod(methodName: string): string {
    const normalized = methodName?.toLowerCase() || '';
    if (normalized.includes('dinheiro')) return '01';
    if (normalized.includes('crédito')) return '03';
    if (normalized.includes('débito')) return '04';
    if (normalized.includes('pix')) return '17';
    if (normalized.includes('vale') || normalized.includes('refeição') || normalized.includes('alimentação')) return '10';
    return '99'; 
}