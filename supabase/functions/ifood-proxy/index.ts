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

    // --- ROTAS DE AUTH E MENU (Mantidas idênticas) ---
    if (req.method === "POST" && pathname.endsWith("/init-auth")) {
        const form = new URLSearchParams(); form.append("clientId", clientId);
        const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/userCode`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
        const data = await res.json();
        return new Response(JSON.stringify({ url: data.verificationUrlComplete, verifier: data.authorizationCodeVerifier }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }
    if (req.method === "POST" && pathname.endsWith("/exchange")) {
        const { authCode, companyId, verifier } = await req.json();
        const params = new URLSearchParams(); params.append("grantType", "authorization_code"); params.append("clientId", clientId); params.append("clientSecret", clientSecret); params.append("authorizationCode", authCode); params.append("authorizationCodeVerifier", verifier || "");
        const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
        const data = await res.json();
        if(!res.ok) throw new Error(JSON.stringify(data));
        const merchantRes = await fetch(`${IFOOD_API_URL}/merchant/v1.0/merchants`, { headers: { "Authorization": `Bearer ${data.accessToken}` } });
        const mData = await merchantRes.json();
        await supabaseAdmin.from("integrations_ifood").upsert({ company_id: companyId, merchant_id: mData[0]?.id, access_token: data.accessToken, refresh_token: data.refreshToken, client_id: clientId, status: "CONNECTED", last_synced_at: new Date().toISOString() }, { onConflict: "company_id" });
        return new Response(JSON.stringify({ success: true, merchantId: mData[0]?.id }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }
    if (req.method === "POST" && pathname.endsWith("/menu")) {
        const { companyId } = await req.json();
        const { data: integration } = await supabaseAdmin.from("integrations_ifood").select("*").eq("company_id", companyId).single();
        if (!integration) throw new Error("Integração não encontrada.");
        let token = integration.access_token;
        const merchantId = integration.merchant_id;
        let catRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/merchants/${merchantId}/catalogs`, { headers: { "Authorization": `Bearer ${token}` } });
        if (catRes.status === 401) {
            try { token = await refreshIfoodToken(integration.refresh_token, companyId); catRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/merchants/${merchantId}/catalogs`, { headers: { "Authorization": `Bearer ${token}` } }); } 
            catch (e) { throw new Error("Sessão expirada."); }
        }
        const catalogs = await catRes.json();
        const activeCatalog = catalogs.find((c: any) => c.context === 'DELIVERY' && c.status === 'AVAILABLE') || catalogs.find((c: any) => c.status === 'AVAILABLE') || catalogs[0];
        if (!activeCatalog) return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
        const catalogId = activeCatalog.catalogId;
        try {
            const menuRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/catalogs/${catalogId}/categories?includeItems=true`, { headers: { "Authorization": `Bearer ${token}` } });
            if (!menuRes.ok) return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
            const categories = await menuRes.json();
            const flatItems = [];
            for (const cat of categories) { if (cat.items) { for (const item of cat.items) { flatItems.push({ id: item.id, name: item.name, price: item.price?.value || 0, category: cat.name, status: item.status }); } } }
            return new Response(JSON.stringify({ items: flatItems }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
        } catch (menuErr) { return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } }); }
    }

    // ==================================================================
    // ROTA 4: POLLING - CORREÇÃO DE CAIXA E HORA
    // ==================================================================
    if (req.method === "POST" && pathname.endsWith("/polling")) {
      const { companyId } = await req.json();

      const { data: integration } = await supabaseAdmin.from("integrations_ifood").select("*").eq("company_id", companyId).single();
      if (!integration) throw new Error("Integração não encontrada.");
      
      let token = integration.access_token;

      // 1. Busca Eventos
      let eventsRes = await fetch(`${IFOOD_API_URL}/order/v1.0/events:polling`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (eventsRes.status === 401) {
        token = await refreshIfoodToken(integration.refresh_token, companyId);
        eventsRes = await fetch(`${IFOOD_API_URL}/order/v1.0/events:polling`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      }

      if (eventsRes.status === 204) {
        return new Response(JSON.stringify({ message: "Nenhum evento", orders: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
      }

      const events = await eventsRes.json();
      const newOrders = [];
      const eventsToAck = [];

      // 2. Mapeamento de Produtos
      const { data: mappings } = await supabaseAdmin
        .from('ifood_menu_mapping')
        .select('ifood_product_id, erp_product_id')
        .eq('company_id', companyId);

      const productMap = new Map();
      mappings?.forEach((m: any) => {
        if (m.erp_product_id) productMap.set(m.ifood_product_id, m.erp_product_id);
      });

      // 3. BUSCA DE CAIXA (CORRIGIDA)
      // Converte explicitamente para Number para garantir compatibilidade com bigint (int8)
      const numericCompanyId = Number(companyId);

      console.log(`🔎 Buscando caixa aberto para empresa ID: ${numericCompanyId}...`);

      const { data: openSession, error: sessionError } = await supabaseAdmin
        .from('cashier_sessions')
        .select('id')
        .eq('company_id', numericCompanyId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false }) // Pega o mais recente
        .limit(1)
        .maybeSingle();

      if (sessionError) {
          console.error("Erro ao buscar caixa:", sessionError);
      }

      const sessionId = openSession?.id || null;
      console.log(`💡 ID Caixa encontrado: ${sessionId}`);

      // 4. Processa Eventos
      for (const event of events) {
        if (event.code === 'PLC') {
          const orderId = event.orderId;

          const { data: existingSale } = await supabaseAdmin
            .from('sales')
            .select('id')
            .eq('ifood_order_id', orderId)
            .maybeSingle();

          if (existingSale) {
            console.log(`⚠️ Pedido ${orderId} duplicado ignorado.`);
          } else {
            const orderRes = await fetch(`${IFOOD_API_URL}/order/v1.0/orders/${orderId}`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (orderRes.ok) {
              const orderData = await orderRes.json();

              // CORREÇÃO DE DATA: Usa horário do servidor para corrigir o bug de +3h
              const serverTime = new Date().toISOString();

              // A) Salva Venda
              try {
                const { data: insertedSale, error: saleError } = await supabaseAdmin
                  .from('sales')
                  .insert({
                    company_id: numericCompanyId,
                    customer_name: orderData.customer.name,
                    status: 'PENDING',
                    total: orderData.total.value,
                    channel: 'IFOOD',
                    ifood_order_id: orderId,
                    created_at: serverTime, // <--- HORA CORRIGIDA
                    payment_method: 'ifood',
                    cashier_session_id: sessionId // <--- CAIXA
                  })
                  .select()
                  .single();

                if (saleError) throw saleError;

                if (insertedSale) {
                   newOrders.push(insertedSale);
                   const saleId = insertedSale.id;

                   // B) Salva ITENS
                   if (orderData.items && orderData.items.length > 0) {
                     const itemsToInsert = [];
                     for (const ifoodItem of orderData.items) {
                       const erpProductId = productMap.get(ifoodItem.productId) || null;
                       itemsToInsert.push({
                         sale_id: saleId,
                         company_id: numericCompanyId,
                         product_id: erpProductId, 
                         quantity: ifoodItem.quantity,
                         unit_price: ifoodItem.price,
                         status: 'pendente'
                       });
                     }
                     if (itemsToInsert.length > 0) {
                       const { error: itemsError } = await supabaseAdmin.from('sale_items').insert(itemsToInsert);
                       if (itemsError) console.error("❌ Erro itens:", itemsError);
                     }
                   }
                }

              } catch (err: any) {
                if (err.code === '23505' || err.message?.includes('unique_ifood_order')) {
                  console.log(`⚠️ Pedido duplicado bloqueado.`);
                } else {
                  console.error("Erro venda:", err);
                }
              }
            }
          }
        }
        eventsToAck.push({ id: event.id });
      }

      if (eventsToAck.length > 0) {
        await fetch(`${IFOOD_API_URL}/order/v1.0/events/acknowledgment`, {
          method: 'POST',
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(eventsToAck)
        });
      }

      return new Response(JSON.stringify({ 
        message: `${events.length} eventos processados`, 
        newOrdersCount: newOrders.length 
      }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Rota inexistente" }), { status: 404, headers: CORSA_HEADERS });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORSA_HEADERS, "Content-Type": "application/json" }
    });
  }
});