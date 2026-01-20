import qz from 'qz-tray';
import { sha256 } from 'js-sha256';

// Configuração para assinar as requisições localmente
qz.api.setSha256Type(data => sha256(data));
qz.api.setPromiseType(resolver => new Promise(resolver));

export const PrinterService = {
  // 1. Conectar ao QZ Tray
  async connect() {
    if (!qz.websocket.isActive()) {
      try {
        await qz.websocket.connect();
        
        // Monitora desconexão
        qz.websocket.setClosedCallbacks((evt) => {
            console.log("⚠️ QZ Tray desconectado", evt);
        });
        
        console.log("🖨️ QZ Tray Conectado!");
      } catch (err) {
        console.error("Erro Conexão QZ:", err);
        throw new Error("QZ Tray não detectado. Verifique se o programa está aberto.");
      }
    }
  },

  // 2. Enviar Impressão
  async printOrder(order) {
    // Garante conexão
    await this.connect();

    try {
        // CORREÇÃO: Busca a impressora padrão do sistema explicitamente
        const printerName = await qz.printers.getDefault();
        console.log("🖨️ Usando impressora:", printerName);

        // Cria a configuração com o nome encontrado
        const config = qz.configs.create(printerName);

        // Formata itens para HTML
        const itemsHtml = order.sale_items.map(item => `
          <tr>
            <td style="padding: 2px 0;">${item.quantity}x</td>
            <td style="padding: 2px 0;">${item.product?.name || 'Item s/ nome'}</td>
            <td style="text-align: right; padding: 2px 0;">R$ ${(item.unit_price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('');

        // HTML do Cupom
        const printData = [
          {
            type: 'html',
            format: 'plain', 
            data: `
              <div style="font-family: monospace; font-size: 12px; width: 300px;">
                <div style="text-align: center; margin-bottom: 10px;">
                  <h2 style="margin: 0;">HAWK VISION</h2>
                  <p style="margin: 0;">Pedido #${order.display_id || order.id.toString().slice(0,4)}</p>
                  <p style="margin: 0;">${new Date(order.created_at).toLocaleString()}</p>
                </div>
                
                <div style="border-bottom: 1px dashed #000; margin-bottom: 5px;"></div>
                
                <div style="margin-bottom: 10px;">
                  <strong>Cliente:</strong> ${order.customer_name}<br/>
                  <strong>Tipo:</strong> ${order.channel === 'IFOOD' ? 'iFood Delivery' : 'Balcão/Mesa'}
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <thead>
                    <tr style="border-bottom: 1px solid #000;">
                      <th style="text-align: left;">Qtd</th>
                      <th style="text-align: left;">Item</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px; text-align: right;">
                  <h3>TOTAL: R$ ${Number(order.total).toFixed(2)}</h3>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                  <p>*** Fim do Pedido ***</p>
                </div>
              </div>
            `
          }
        ];

        await qz.print(config, printData);
    
    } catch (err) {
        console.error("Erro na Lógica de Impressão:", err);
        throw err; // Repassa o erro para o frontend ativar o fallback (janela)
    }
  }
};