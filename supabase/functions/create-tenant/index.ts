// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Cliente Admin (Poder Supremo)
    // @ts-ignore
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Recebe os dados do NOVO CLIENTE
    const { restaurantName, ownerName, email, password } = await req.json()

    if (!restaurantName || !ownerName || !email || !password) {
      throw new Error('Faltam dados: Nome do Restaurante, Nome do Dono, Email ou Senha.')
    }

    console.log(`Iniciando criação do tenant: ${restaurantName}`)

    // 3. PASSO 1: Criar a EMPRESA (Company)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: restaurantName })
      .select()
      .single()

    if (companyError) throw new Error(`Erro ao criar empresa: ${companyError.message}`)
    
    const newCompanyId = company.id
    console.log(`Empresa criada com ID: ${newCompanyId}`)

    // 4. PASSO 2: Criar o USUÁRIO MASTER no Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: ownerName }
    })

    if (authError) {
      // Se falhar o Auth, deletamos a empresa criada para não ficar "lixo" no banco
      await supabaseAdmin.from('companies').delete().eq('id', newCompanyId)
      throw new Error(`Erro ao criar usuário Auth: ${authError.message}`)
    }

    // 5. PASSO 3: Criar o PERFIL DE FUNCIONÁRIO (O Dono) vinculado à Empresa
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        company_id: newCompanyId, // <--- AQUI ESTÁ O SEGREDO! O vínculo nasce aqui.
        auth_user_id: authUser.user.id,
        name: ownerName,
        email: email,
        role: 'Gerente', // O dono nasce como Gerente
        status: 'Ativo',
        access_pin: '1234' // Pin padrão inicial
      })

    if (employeeError) {
      // Se falhar aqui, deletamos o Auth e a Empresa (Rollback manual)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      await supabaseAdmin.from('companies').delete().eq('id', newCompanyId)
      throw new Error(`Erro ao criar perfil do dono: ${employeeError.message}`)
    }

    // 6. (Opcional) Criar configurações padrão para a nova empresa
    // Ex: Criar uma 'company_settings' vazia para não dar erro 404 depois
    await supabaseAdmin.from('company_settings').insert({ company_id: newCompanyId })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cliente ${restaurantName} criado com sucesso!`,
        data: { companyId: newCompanyId, email: email }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})