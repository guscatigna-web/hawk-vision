import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Cria o cliente Admin (Service Role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verifica quem chamou (Auth Header)
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !callerUser) throw new Error('Usuário não autenticado.')

    // 3. Recebe dados do novo funcionário
    const { name, email, password, role, pin } = await req.json()

    if (!email || !password || !name) {
      throw new Error('Dados incompletos.')
    }

    // 4. Busca a empresa do chefe (Segurança Multi-Tenant)
    const { data: managerData, error: managerError } = await supabaseAdmin
      .from('employees')
      .select('company_id')
      .eq('auth_user_id', callerUser.id)
      .single()

    if (managerError || !managerData) throw new Error('Perfil de gerente não encontrado.')
    
    const myCompanyId = managerData.company_id

    // 5. Cria o usuário no Auth
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: name }
    })

    if (createError) throw createError

    // 6. Insere na tabela employees
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert({
        company_id: myCompanyId,
        auth_user_id: newAuthUser.user.id,
        name: name,
        email: email,
        role: role || 'Operador',
        access_pin: pin,
        status: 'Ativo'
      })

    if (dbError) {
      // Rollback se falhar no banco
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
      throw dbError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Criado com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})