import qz from 'qz-tray';
import { sha256 } from 'js-sha256';

qz.api.setSha256Type(data => sha256(data));
qz.api.setPromiseType(resolver => new Promise(resolver));

// Cole seu Logo Base64 aqui dentro das aspas
const LOGO_BASE64 = null; 

export const PrinterService = {
  async connect() {
    if (!qz.websocket.isActive()) {
      try {
        await qz.websocket.connect();
        qz.websocket.setClosedCallbacks((evt) => console.log("⚠️ QZ Tray desconectado", evt));
      } catch (err) {
        console.error("Erro QZ:", err);
        throw new Error("QZ Tray não detectado.");
      }
    }
  },

  async getPrinterConfig() {
    await this.connect();
    let printerName;
    try { printerName = await qz.printers.getDefault(); } catch (err) { console.warn(err); }
    
    if (!printerName) {
        const printers = await qz.printers.find();
        if (printers.length > 0) printerName = printers[0];
    }

    if (!printerName) throw new Error("Nenhuma impressora instalada no Windows.");
    return qz.configs.create(printerName);
  },

  // --- 1. TICKET DE PRODUÇÃO (Cozinha/Bar) ---
  async printSectorTicket(order, items, sectorName) {
    const config = await this.getPrinterConfig();

    const itemsHtml = items.map(item => {
        // Pega o nome do produto ou o nome original do iFood (snapshot)
        const name = item.product?.name || item.product_name || 'Item sem nome';
        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="font-size: 14px; font-weight: bold; padding: 5px 0; width: 30px; vertical-align: top;">${item.quantity}x</td>
            <td style="font-size: 14px; font-weight: bold; padding: 5px 0; word-wrap: break-word; white-space: pre-wrap;">${name}</td>
          </tr>
        `;
    }).join('');

    const displayId = order.display_id || (typeof order.id === 'string' ? order.id.slice(0,4) : order.id);
    const identifier = order.table_number ? `MESA ${order.table_number}` : (order.channel === 'IFOOD' ? `IFOOD #${displayId}` : `BALCÃO #${displayId}`);

    const printData = [
      {
        type: 'html',
        format: 'plain',
        data: `
          <div style="font-family: 'Arial', monospace; width: 300px; padding-bottom: 20px;">
            <div style="text-align: center; margin-bottom: 10px;">
              <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase;">${sectorName}</h1>
              <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">${identifier}</p>
              <p style="font-size: 12px; margin: 0;">${new Date().toLocaleString()}</p>
              <p style="font-size: 12px; margin: 0; font-weight: bold;">${order.customer_name?.slice(0,30) || 'Cliente'}</p>
              ${order.waiter_name ? `<p style="font-size: 12px; margin: 0;">Garçom: ${order.waiter_name}</p>` : ''}
            </div>
            
            <div style="border-top: 2px dashed #000; margin: 5px 0;"></div>

            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>

            <div style="border-top: 2px dashed #000; margin: 10px 0;"></div>
          </div>
        `
      }
    ];

    await qz.print(config, printData);
  },

  // --- 2. TICKET DE EXPEDIÇÃO (Caixa/Motoboy - NOVO) ---
  // Imprime dados completos para entrega, centralizado, com quebra de linha
  async printExpeditionTicket(order) {
    const config = await this.getPrinterConfig();

    const itemsHtml = order.sale_items.map(item => {
        const name = item.product?.name || item.product_name || 'Item';
        return `
          <tr>
            <td style="padding: 4px 0; font-size: 12px; font-weight: bold; width: 30px; vertical-align: top;">${item.quantity}x</td>
            <td style="padding: 4px 0; font-size: 12px; word-wrap: break-word; white-space: pre-wrap;">${name}</td>
            <td style="text-align: right; font-size: 12px; vertical-align: top;">R$ ${(item.unit_price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
    }).join('');

    // LOGO AJUSTADA PARA 90px
    const logoHtml = LOGO_BASE64 ? `<img src="${LOGO_BASE64}" style="max-width: 90px; margin-bottom: 5px;" /><br/>` : '';
    const displayId = order.display_id || (typeof order.id === 'string' ? order.id.slice(0,4) : order.id);

    // Tenta pegar endereço do objeto order (se existir no JSON do iFood) ou fallback
    // Assumindo que order.delivery_address possa vir da integração ou ser montado
    const address = order.delivery_address || order.customer_address || "Endereço não informado / Balcão";

    const printData = [
      {
        type: 'html',
        format: 'plain',
        data: `
          <div style="font-family: 'Arial', monospace; font-size: 12px; width: 300px; padding-bottom: 40px;">
            <div style="text-align: center; margin-bottom: 10px;">
              ${logoHtml}
              <h2 style="font-size: 18px; font-weight: bold; margin: 0;">EXPEDIÇÃO / ENTREGA</h2>
              <h1 style="font-size: 24px; font-weight: 900; margin: 5px 0;">IFOOD #${displayId}</h1>
              <p style="margin: 0;">${new Date().toLocaleString()}</p>
            </div>
            
            <div style="border: 2px solid #000; padding: 5px; margin: 10px 0; border-radius: 5px;">
              <p style="margin:0; font-weight:bold; font-size: 14px;">${order.customer_name || 'Cliente'}</p>
              <p style="margin:5px 0 0 0; font-size: 12px; word-wrap: break-word;">${address}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
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

            <div style="text-align: right; font-size: 14px; font-weight: bold; margin-top: 10px;">
               TOTAL: R$ ${Number(order.total).toFixed(2)}
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="font-size: 10px;">Conferido por: _________________</p>
            </div>
          </div>
        `
      }
    ];

    await qz.print(config, printData);
  },

  // --- 3. TICKET DO CLIENTE (Recibo Fiscal/Simples) ---
  async printCustomerReceipt(order, company = null) {
    const config = await this.getPrinterConfig();

    const itemsList = order.sale_items || order.items || [];
    const itemsHtml = itemsList.map(item => {
        const name = item.product?.name || item.product_name || 'Item';
        const price = item.unit_price || item.product?.price || 0;
        const total = price * item.quantity;
        return `
          <tr>
            <td style="padding: 2px 0; word-wrap: break-word; white-space: pre-wrap; padding-right: 5px;">${name}</td>
            <td style="text-align: center; padding: 2px 0; vertical-align: top;">x${item.quantity}</td>
            <td style="text-align: right; padding: 2px 0; vertical-align: top;">R$ ${total.toFixed(2)}</td>
          </tr>
        `;
    }).join('');

    // LOGO AJUSTADA PARA 90px
    const logoHtml = LOGO_BASE64 ? `<img src="${LOGO_BASE64}" style="max-width: 90px; margin-bottom: 5px;" /><br/>` : '';
    const displayId = order.display_id || (typeof order.id === 'string' ? order.id.slice(0,4) : order.id);

    const companyHeader = company ? `
        <h2 style="font-size: 14px; font-weight: bold; margin: 0; text-transform: uppercase;">${company.trade_name || 'HAWK VISION'}</h2>
        <p style="margin:0; font-size: 11px;">CNPJ: ${company.cnpj || ''}</p>
        <p style="margin:0; font-size: 11px;">${company.address || ''}, ${company.number || ''}</p>
    ` : `<h2 style="font-size: 16px; font-weight: bold; margin: 0;">HAWK VISION</h2>`;

    const printData = [
      {
        type: 'html',
        format: 'plain',
        data: `
          <div style="font-family: 'Arial', monospace; font-size: 12px; width: 300px; padding-bottom: 40px;">
            <div style="text-align: center; margin-bottom: 10px;">
              ${logoHtml}
              ${companyHeader}
              <p style="margin-top: 5px; font-size: 11px;">${new Date().toLocaleString()}</p>
            </div>
            
            <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
            
            <div style="margin-bottom: 5px;">
              <strong>Pedido: #${displayId}</strong><br/>
              <strong>Cliente:</strong> ${order.customer_name || 'Consumidor'}<br/>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="border-bottom: 1px solid #000;">
                  <th style="text-align: left; width: 60%;">Item</th>
                  <th style="text-align: center; width: 15%;">Qtd</th>
                  <th style="text-align: right; width: 25%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
                <span>TOTAL</span>
                <span>R$ ${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 10px;">
              <p>Obrigado pela preferência!</p>
              <p>Volte sempre</p>
            </div>
          </div>
        `
      }
    ];

    await qz.print(config, printData);
  }
};