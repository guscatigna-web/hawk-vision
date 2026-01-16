import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IFOOD_API_URL = "https://merchant-api.ifood.com.br";
const CORSA_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORSA_HEADERS });

  try {
    const url = new URL(req.url);
    const { pathname } = url;
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const clientId = Deno.env.get("IFOOD_CLIENT_ID");
    const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");

    if (!clientId || !clientSecret) throw new Error("Credenciais iFood ausentes.");

    // --- HELPER: Refresh Token ---
    async function refreshIfoodToken(oldRefreshToken: string, companyId: string) {
      console.log("🔄 Renovando token...");
      const params = new URLSearchParams();
      params.append("grantType", "refresh_token");
      params.append("clientId", clientId!);
      params.append("clientSecret", clientSecret!);
      params.append("refreshToken", oldRefreshToken);

      const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Falha no refresh: ${txt}`);
      }
      const data = await res.json();
      
      await supabaseAdmin.from("integrations_ifood").update({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        last_synced_at: new Date().toISOString()
      }).eq("company_id", companyId);

      return data.accessToken;
    }

    // --- ROTA 1: Init Auth ---
    if (req.method === "POST" && pathname.endsWith("/init-auth")) {
      const form = new URLSearchParams();
      form.append("clientId", clientId);
      const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/userCode`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      return new Response(JSON.stringify({ url: data.verificationUrlComplete, verifier: data.authorizationCodeVerifier }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    // --- ROTA 2: Exchange ---
    if (req.method === "POST" && pathname.endsWith("/exchange")) {
      const { authCode, companyId, verifier } = await req.json();
      const params = new URLSearchParams();
      params.append("grantType", "authorization_code");
      params.append("clientId", clientId);
      params.append("clientSecret", clientSecret);
      params.append("authorizationCode", authCode);
      params.append("authorizationCodeVerifier", verifier || "");

      const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      const merchantRes = await fetch(`${IFOOD_API_URL}/merchant/v1.0/merchants`, {
        headers: { "Authorization": `Bearer ${data.accessToken}` }
      });
      const mData = await merchantRes.json();
      const merchantId = mData[0]?.id;

      await supabaseAdmin.from("integrations_ifood").upsert({
        company_id: companyId,
        merchant_id: merchantId,
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        client_id: clientId,
        status: "CONNECTED",
        last_synced_at: new Date().toISOString()
      }, { onConflict: "company_id" });

      return new Response(JSON.stringify({ success: true, merchantId }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    // --- ROTA 3: Menu ---
    if (req.method === "POST" && pathname.endsWith("/menu")) {
      const { companyId } = await req.json();
      const { data: integration } = await supabaseAdmin.from("integrations_ifood").select("*").eq("company_id", companyId).single();
      
      if (!integration) throw new Error("Integração não encontrada.");

      let token = integration.access_token;
      const merchantId = integration.merchant_id;

      // 1. Listar Catálogos
      let catRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/merchants/${merchantId}/catalogs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (catRes.status === 401) {
        token = await refreshIfoodToken(integration.refresh_token, companyId);
        catRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/merchants/${merchantId}/catalogs`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      }

      if (!catRes.ok) throw new Error(`Erro ao listar catálogos: ${catRes.status}`);

      const catalogs = await catRes.json();
      
      // MELHORIA: Tenta encontrar especificamente o catálogo de DELIVERY e que esteja ATIVO
      // Se não achar, pega qualquer um que não seja o "INDOOR" (mesas)
      const activeCatalog = catalogs.find((c: any) => c.context === 'DELIVERY' && c.status === 'AVAILABLE') 
                         || catalogs.find((c: any) => c.status === 'AVAILABLE')
                         || catalogs[0];

      if (!activeCatalog) {
         return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
      }

      const catalogId = activeCatalog.catalogId;

      // 2. Buscar Categorias e Itens
      // Adicionado try/catch específico para esta chamada
      try {
        const menuRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/catalogs/${catalogId}/categories?includeItems=true`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        // Se der 404 ou 400 aqui, assumimos que o catálogo está vazio
        if (!menuRes.ok) {
            console.error(`Erro ao ler catálogo ${catalogId}: ${menuRes.status}`);
            return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
        }

        const categories = await menuRes.json();
        const flatItems = [];
        for (const cat of categories) {
            if (cat.items) {
            for (const item of cat.items) {
                flatItems.push({
                id: item.id,
                name: item.name,
                price: item.price?.value || 0,
                category: cat.name,
                status: item.status
                });
            }
            }
        }
        return new Response(JSON.stringify({ items: flatItems }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });

      } catch (menuErr) {
        // Se falhar a leitura, retorna array vazio para o frontend ativar o MOCK
        return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Rota inexistente" }), { status: 404, headers: CORSA_HEADERS });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORSA_HEADERS, "Content-Type": "application/json" }
    });
  }
});