import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IFOOD_API_URL = "https://merchant-api.ifood.com.br";
const CORSA_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`🔔 [EDGE SECURE] Request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORSA_HEADERS });

  try {
    const url = new URL(req.url);
    const { pathname } = url;
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const envClientId = Deno.env.get("IFOOD_CLIENT_ID");
    const envClientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");

    // --- LEITURA UNIFICADA DO BODY ---
    let body: any = {};
    if (req.method === "POST") {
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (e) { console.warn("Body vazio/inválido", e); }
    }

    // --- ROUTER ---
    let action = body.action || null;
    if (!action) {
        if (pathname.endsWith("/init-auth")) action = "init-auth";
        else if (pathname.endsWith("/exchange")) action = "exchange";
        else if (pathname.endsWith("/menu")) action = "menu";
        else if (pathname.endsWith("/polling")) action = "polling";
        else if (pathname.endsWith("/update-status")) action = "update-status";
    }

    // --- HELPER SEGURO: Obter Integração Descriptografada ---
    // Usa a RPC para o banco descriptografar a chave mestra e entregar o token limpo
    async function getIntegrationSecure(companyId: any) {
        const { data, error } = await supabaseAdmin
            .rpc('get_ifood_creds_rpc', { p_company_id: Number(companyId) })
            .maybeSingle();
        
        if (error || !data) throw new Error("Integração não encontrada ou erro de criptografia.");
        return data; // Retorna { access_token, refresh_token, etc } já em texto plano
    }

    // --- HELPER SEGURO: Refresh Token ---
    async function refreshIfoodToken(oldRefreshToken: string, companyId: any, clientId: string, clientSecret: string) {
      console.log("🔄 Renovando token (Secure)...");
      const params = new URLSearchParams();
      params.append("grantType", "refresh_token");
      params.append("clientId", clientId);
      params.append("clientSecret", clientSecret);
      params.append("refreshToken", oldRefreshToken);

      const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Falha no refresh: ${txt}`);
      }
      const data = await res.json();
      
      // Salva criptografado via RPC, usando a chave mestra do banco
      await supabaseAdmin.rpc('update_ifood_tokens_rpc', {
          p_company_id: Number(companyId),
          p_access_token: data.accessToken,
          p_refresh_token: data.refreshToken
      });

      return data.accessToken;
    }

    // --- HELPER: Auto-Cicatrizante (Display ID) ---
    async function fetchAndSaveDisplayId(orderId: string, token: string, companyId: number) {
        try {
            const res = await fetch(`${IFOOD_API_URL}/order/v1.0/orders/${orderId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const displayId = data.displayId || data.orderIdentification?.displayId || null;
                if (displayId) {
                    await supabaseAdmin.from('sales').update({ display_id: displayId }).eq('ifood_order_id', orderId);
                    return displayId;
                }
            }
        } catch (e) { console.error("Erro helper ID:", e); }
        return null;
    }

    // ============================================================
    // AÇÕES
    // ============================================================

    // 1. INIT AUTH (Apenas gera URL, não precisa de banco)
    if (action === "init-auth") {
        if (!envClientId) throw new Error("IFOOD_CLIENT_ID não configurado no ENV.");
        const form = new URLSearchParams(); form.append("clientId", envClientId);
        const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/userCode`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
        const data = await res.json();
        return new Response(JSON.stringify({ url: data.verificationUrlComplete, verifier: data.authorizationCodeVerifier }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    // 2. EXCHANGE (Troca código por token e SALVA CRIPTOGRAFADO)
    if (action === "exchange") {
        const { authCode, companyId, verifier } = body;
        if (!envClientId || !envClientSecret) throw new Error("Credenciais ENV ausentes.");

        const params = new URLSearchParams(); 
        params.append("grantType", "authorization_code"); 
        params.append("clientId", envClientId); 
        params.append("clientSecret", envClientSecret); 
        params.append("authorizationCode", authCode); 
        params.append("authorizationCodeVerifier", verifier || "");
        
        const res = await fetch(`${IFOOD_API_URL}/authentication/v1.0/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
        const data = await res.json();
        
        if(!res.ok) throw new Error(JSON.stringify(data));
        
        // Pega Merchant ID
        const merchantRes = await fetch(`${IFOOD_API_URL}/merchant/v1.0/merchants`, { headers: { "Authorization": `Bearer ${data.accessToken}` } });
        const mData = await merchantRes.json();
        
        // Salva via RPC Seguro (Criptografando)
        await supabaseAdmin.rpc('upsert_ifood_connection_rpc', {
            p_company_id: Number(companyId),
            p_merchant_id: mData[0]?.id,
            p_client_id: envClientId,
            p_client_secret: envClientSecret,
            p_access_token: data.accessToken,
            p_refresh_token: data.refreshToken
        });

        return new Response(JSON.stringify({ success: true, merchantId: mData[0]?.id }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    // 3. MENU
    if (action === "menu") {
        const { companyId } = body;
        const integration = await getIntegrationSecure(companyId); // <--- USO DO RPC SEGURO
        
        let token = integration.access_token;
        const merchantId = integration.merchant_id;
        
        const cId = integration.client_id || envClientId;
        const cSec = integration.client_secret || envClientSecret;

        let catRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/merchants/${merchantId}/catalogs`, { headers: { "Authorization": `Bearer ${token}` } });
        
        if (catRes.status === 401) {
            token = await refreshIfoodToken(integration.refresh_token, companyId, cId, cSec);
            catRes = await fetch(`${IFOOD_API_URL}/catalog/v1.0/merchants/${merchantId}/catalogs`, { headers: { "Authorization": `Bearer ${token}` } });
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
            for (const cat of categories) { 
                if (cat.items) { 
                    for (const item of cat.items) { 
                        flatItems.push({ id: item.id, name: item.name, price: item.price?.value || 0, category: cat.name, status: item.status }); 
                    } 
                } 
            }
            return new Response(JSON.stringify({ items: flatItems }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
        } catch (menuErr) { return new Response(JSON.stringify({ items: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } }); }
    }

    // 4. POLLING (Rota Crítica)
    if (action === "polling") {
      const { companyId } = body;
      const integration = await getIntegrationSecure(companyId); // <--- USO DO RPC SEGURO
      
      let token = integration.access_token;
      const cId = integration.client_id || envClientId;
      const cSec = integration.client_secret || envClientSecret;
      
      let eventsRes = await fetch(`${IFOOD_API_URL}/order/v1.0/events:polling`, { headers: { "Authorization": `Bearer ${token}` } });
      
      if (eventsRes.status === 401) {
        token = await refreshIfoodToken(integration.refresh_token, companyId, cId, cSec);
        eventsRes = await fetch(`${IFOOD_API_URL}/order/v1.0/events:polling`, { headers: { "Authorization": `Bearer ${token}` } });
      }
      
      if (eventsRes.status === 204) return new Response(JSON.stringify({ message: "Nenhum evento", orders: [] }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });

      const events = await eventsRes.json();
      const newOrders = [];
      const eventsToAck = [];
      const numericCompanyId = Number(companyId);
      
      const { data: openSession } = await supabaseAdmin.from('cashier_sessions').select('id').eq('company_id', numericCompanyId).eq('status', 'open').order('opened_at', { ascending: false }).limit(1).maybeSingle();
      const sessionId = openSession?.id || null;
      
      const { data: mappings } = await supabaseAdmin.from('ifood_menu_mapping').select('ifood_product_id, erp_product_id').eq('company_id', companyId);
      const productMap = new Map();
      mappings?.forEach((m: any) => { if (m.erp_product_id) productMap.set(m.ifood_product_id, m.erp_product_id); });

      for (const event of events) {
        if (event.code === 'PLC') {
          const orderId = event.orderId;
          const { data: existingSale } = await supabaseAdmin.from('sales').select('id').eq('ifood_order_id', orderId).maybeSingle();
          if (!existingSale) {
            const orderRes = await fetch(`${IFOOD_API_URL}/order/v1.0/orders/${orderId}`, { headers: { "Authorization": `Bearer ${token}` } });
            if (orderRes.ok) {
              const orderData = await orderRes.json();
              const serverTime = new Date().toISOString();
              const displayId = orderData.displayId || orderData.orderIdentification?.displayId || null;
              try {
                const { data: insertedSale, error: saleError } = await supabaseAdmin.from('sales').insert({
                    company_id: numericCompanyId, customer_name: orderData.customer.name, status: 'PENDING', total: orderData.total.value, channel: 'IFOOD', ifood_order_id: orderId, display_id: displayId, created_at: serverTime, payment_method: 'ifood', cashier_session_id: sessionId
                  }).select().single();
                if (saleError) throw saleError;
                if (insertedSale && orderData.items) {
                   newOrders.push(insertedSale);
                   const itemsToInsert = orderData.items.map((ifoodItem: any) => ({
                       sale_id: insertedSale.id, company_id: numericCompanyId, product_id: productMap.get(ifoodItem.productId) || null, quantity: ifoodItem.quantity, unit_price: ifoodItem.price, status: 'pendente'
                   }));
                   await supabaseAdmin.from('sale_items').insert(itemsToInsert);
                }
              } catch (err: any) { console.error("Erro ao salvar venda:", err); }
            }
          }
        }
        else if (['CFM', 'DSP', 'CON', 'CAN'].includes(event.code)) {
            let newStatus = null;
            if (event.code === 'CFM') newStatus = 'Em Preparo';
            else if (event.code === 'DSP') newStatus = 'Saiu para entrega';
            else if (event.code === 'CON') newStatus = 'Concluido';
            else if (event.code === 'CAN') newStatus = 'Cancelado';
            if (newStatus) await supabaseAdmin.from('sales').update({ status: newStatus }).eq('ifood_order_id', event.orderId);
        }
        eventsToAck.push({ id: event.id });
      }
      if (eventsToAck.length > 0) await fetch(`${IFOOD_API_URL}/order/v1.0/events/acknowledgment`, { method: 'POST', headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(eventsToAck) });
      return new Response(JSON.stringify({ message: `${events.length} eventos processados`, newOrdersCount: newOrders.length }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    // 5. UPDATE STATUS
    if (action === "update-status") {
        const { companyId, ifoodOrderId, status, reason } = body;
        const integration = await getIntegrationSecure(companyId); // <--- USO DO RPC SEGURO
        
        let token = integration.access_token;
        const cId = integration.client_id || envClientId;
        const cSec = integration.client_secret || envClientSecret;

        const { data: sale } = await supabaseAdmin.from('sales').select('display_id').eq('ifood_order_id', ifoodOrderId).single();
        if (sale && !sale.display_id) await fetchAndSaveDisplayId(ifoodOrderId, token, companyId);
        
        let endpoint = "";
        let requestBody = {}; 
        if (status === "Em Preparo") endpoint = "confirm";       
        else if (status === "Saiu para entrega") endpoint = "dispatch"; 
        else if (status === "Cancelado") {
            endpoint = "requestCancellation";
            if (reason) requestBody = { reason: reason.description, cancellationCode: reason.code };
            else requestBody = { reason: "Problemas operacionais", cancellationCode: "501" };
        }
        if (endpoint) {
             let ifoodRes = await fetch(`${IFOOD_API_URL}/order/v1.0/orders/${ifoodOrderId}/${endpoint}`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
             if (ifoodRes.status === 401) {
                token = await refreshIfoodToken(integration.refresh_token, companyId, cId, cSec);
                ifoodRes = await fetch(`${IFOOD_API_URL}/order/v1.0/orders/${ifoodOrderId}/${endpoint}`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
             }
             if (!ifoodRes.ok) {
                 const txt = await ifoodRes.text();
                 console.error(`Erro iFood (${endpoint}):`, txt);
                 if (status === 'Cancelado') return new Response(JSON.stringify({ error: `iFood rejeitou: ${txt}` }), { status: 400, headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
            }
        }
        await supabaseAdmin.from('sales').update({ status: status }).eq('ifood_order_id', ifoodOrderId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), { status: 400, headers: CORSA_HEADERS });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORSA_HEADERS, "Content-Type": "application/json" } });
  }
});