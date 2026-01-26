// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Tratamento de Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. CONFIGURAÇÃO DO CLIENTE ADMIN (Service Role)
    // Tenta pegar a chave padrão do Supabase OU a chave personalizada antiga
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''

    if (!serviceRoleKey) {
        throw new Error('Configuração Crítica: SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente.')
    }

    // @ts-ignore
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    // 2. RECEBER DADOS DO FRONTEND
    const { restaurantName, ownerName, email, password } = await req.json()

    if (!restaurantName || !ownerName || !email || !password) {
      throw new Error('Faltam dados: Nome do Restaurante, Nome do Dono, Email ou Senha.')
    }

    console.log(`🚀 Iniciando criação do tenant: ${restaurantName}`)

    // 3. PASSO 1: Criar a EMPRESA (Company)
    // Agora que rodamos o SQL, a coluna 'status' existe e isso vai funcionar
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ 
          name: restaurantName,
          status: 'active' 
      })
      .select()
      .single()

    if (companyError) {
        throw new Error(`Erro ao criar empresa (DB): ${companyError.message}`)
    }
    
    const newCompanyId = company.id
    console.log(`✅ Empresa criada com ID: ${newCompanyId}`)

    // 4. PASSO 2: Criar o USUÁRIO MASTER no Auth (Supabase Auth)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: ownerName }
    })

    if (authError) {
      // Rollback: Se falhar o Auth, deletamos a empresa para não deixar lixo
      await supabaseAdmin.from('companies').delete().eq('id', newCompanyId)
      throw new Error(`Erro ao criar usuário Auth: ${authError.message}`)
    }

    console.log(`✅ Usuário Auth criado: ${authUser.user.id}`)

    // 5. PASSO 3: Criar o PERFIL DE FUNCIONÁRIO (O Dono) na tabela 'employees'
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        company_id: newCompanyId, 
        auth_user_id: authUser.user.id,
        name: ownerName,
        email: email,
        role: 'Gerente', // O dono da loja é Gerente
        status: 'Ativo',
        access_pin: '1234' // Pin padrão
      })

    if (employeeError) {
      // Rollback Complexo: Deleta Auth e Empresa
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      await supabaseAdmin.from('companies').delete().eq('id', newCompanyId)
      throw new Error(`Erro ao criar perfil do dono: ${employeeError.message}`)
    }

    // --- SEEDING (Popular dados iniciais) ---
    console.log(`🌱 Iniciando população de dados padrão...`)

    // 6. Configurações Iniciais (Settings)
    const settingsPromise = supabaseAdmin.from('company_settings').insert({
        company_id: newCompanyId,
        company_name: restaurantName,
        print_mode: 'browser'
    })

    // 7. Formas de Pagamento Padrão
    const paymentsPromise = supabaseAdmin.from('payment_methods').insert([
        { company_id: newCompanyId, name: 'Dinheiro', active: true },
        { company_id: newCompanyId, name: 'Cartão de Crédito', active: true },
        { company_id: newCompanyId, name: 'Cartão de Débito', active: true },
        { company_id: newCompanyId, name: 'PIX', active: true }
    ])

    // 8. Categorias Iniciais
    const categoriesPromise = supabaseAdmin.from('categories').insert([
        { company_id: newCompanyId, name: 'Geral', type: 'product' },
        { company_id: newCompanyId, name: 'Bebidas', type: 'product' },
        { company_id: newCompanyId, name: 'Comidas', type: 'product' }
    ])

    // 9. Inicialização Fiscal (Config vazia e Sequência zerada)
    const fiscalConfigPromise = supabaseAdmin.from('fiscal_config').insert({
        company_id: newCompanyId,
        environment: 'homologacao'
    })

    const fiscalSequencePromise = supabaseAdmin.from('fiscal_sequences').insert([
        { company_id: newCompanyId, environment: 'homologacao', serie: 1, last_number: 0 },
        { company_id: newCompanyId, environment: 'producao', serie: 1, last_number: 0 }
    ])

    // Executa tudo em paralelo
    await Promise.all([
        settingsPromise,
        paymentsPromise,
        categoriesPromise,
        fiscalConfigPromise,
        fiscalSequencePromise
    ])

    console.log(`🎉 Tenant ${restaurantName} configurado com sucesso!`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cliente ${restaurantName} criado e configurado com sucesso!`,
        data: { companyId: newCompanyId, email: email }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Erro fatal no create-tenant:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})