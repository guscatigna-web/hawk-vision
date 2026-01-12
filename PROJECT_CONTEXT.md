# 🦅 HAWK VISION - Project Context & Documentation

Este arquivo contém o contexto técnico, estrutura de dados e regras de negócio do sistema ERP "Hawk Vision". Deve ser fornecido à IA no início de cada nova sessão para contextualização imediata sem estourar o limite de tokens.

---

## 🛠️ Stack Tecnológica
- **Frontend:** React (Vite)
- **Estilização:** TailwindCSS
- **Ícones:** Lucide React
- **Backend/DB:** Supabase (PostgreSQL)
- **Gerenciamento de Estado:** Context API (`CashierContext`, `AuthContext`) + Local State
- **Rotas:** React Router Dom

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

### 1. `products` (Catálogo)
- `id` (uuid): PK
- `name` (text): Nome do produto
- `price` (numeric): Preço de venda
- `category` (text): Categoria (ex: Lanches, Bebidas)
- `active` (bool): Se aparece no PDV
- `track_stock` (bool): Se movimenta estoque
- `stock_quantity` (numeric): Quantidade atual
- `destination` (text): 'cozinha' | 'bar' | 'nenhum' (Define para qual KDS o item vai)
- `barcode` (text): Código de barras/EAN

### 2. `sales` (Cabeçalho de Venda/Pedido)
- `id` (uuid): PK
- `created_at` (timestamp)
- `customer_name` (text): Nome do cliente ou "Mesa X" ou "Varejo"
- `status` (text): 'aberto' | 'preparando' | 'pronto' | 'concluido' | 'cancelado'
- `total` (numeric): Valor total da venda
- `payment_method` (text): 'dinheiro' | 'credito' | 'debito' | 'pix'
- `cashier_session_id` (uuid): FK para `cashier_sessions`
- `employee_id` (uuid): FK para `profiles` (quem vendeu)

### 3. `sale_items` (Itens da Venda)
- `id` (uuid): PK
- `sale_id` (uuid): FK `sales`
- `product_id` (uuid): FK `products`
- `quantity` (numeric)
- `unit_price` (numeric): Preço no momento da venda

### 4. `cashier_sessions` (Sessões de Caixa)
- `id` (uuid): PK
- `opened_at` (timestamp): Abertura
- `closed_at` (timestamp): Fechamento (null se aberto)
- `initial_amount` (numeric): Fundo de troco
- `closing_amount` (numeric): Valor conferido no fechamento
- `status` (text): 'open' | 'closed'
- `type` (text): 'normal' | 'express' (Express não aceita dinheiro/troco)

### 5. `financial_transactions` (Livro Caixa)
- `id` (uuid): PK
- `type` (text): 'entrada' (venda/suprimento) | 'saida' (sangria/despesa)
- `amount` (numeric)
- `description` (text)
- `category` (text): 'venda', 'suprimento', 'sangria', etc.

---

## 📂 Estrutura de Arquivos Principais

### `src/pages/`
- **`Vendas.jsx` (PDV):** - Lógica híbrida (Mesas e Balcão).
  - Verifica `cashier_session`. 
  - Cria venda com status 'aberto'. 
  - Botão "Enviar Pedido" salva itens no banco antes de navegar.
- **`Cozinha.jsx` (KDS):** - Polling a cada 15s.
  - Filtra pedidos com status `aberto` ou `preparando`.
  - **Lógica de Filtro:** Exibe apenas itens onde `product.destination` é 'cozinha' ou null.
- **`Bar.jsx` (KDS):**
  - Igual Cozinha, mas exibe apenas itens onde `product.destination` é 'bar'.
- **`Mesas.jsx`:** Grid de mesas. Verifica status ocupado/livre baseado em vendas não concluídas.
- **`Financeiro.jsx`:** Configurações de taxas e métodos (Precisa evoluir para Contas a Pagar).
- **`Relatorios.jsx`:** Relatórios básicos de estoque e vendas.

### `src/components/`
- **`CashierControl.jsx`:** Modal de abertura/fechamento/sangria. Bloqueia a tela PDV se caixa fechado (`absolute inset-0`).
- **`NewProductModal.jsx`:** Cadastro de produtos (inclui campo `destination`).

---

## 🚦 Regras de Negócio Importantes

1.  **Fluxo de Pedido:** - Garçom lança pedido -> Cria `sales` (status 'aberto') -> Itens salvos em `sale_items`.
    - Itens vão para telas KDS baseados no campo `destination` do produto.
    - KDS atualiza status para 'preparando' -> 'pronto'.
    - Pagamento no Caixa muda status para 'concluido' e baixa estoque.
2.  **Caixa:** Nenhuma venda pode ser feita sem sessão de caixa aberta (`currentSession`).
3.  **Estoque:** Baixa de estoque ocorre apenas no fechamento da conta (`concluido`).

---

## 📍 Status Atual do Projeto (Roadmap)

- ✅ **Etapa 0 (Técnico):** `dateUtils.js` implementado.
- ✅ **Etapa 1 (Caixa):** Abertura, Fechamento, Sangria, Suprimento e Bloqueio de UI implementados.
- ✅ **Etapa 2 (KDS):** Telas de Cozinha e Bar separadas por destino do produto.
- 🚧 **Etapa 3 (Dashboard):** Próximo passo. Conectar gráficos do Dashboard ao banco real.
- ⏳ **Etapa 4 (Impressão & Comprovantes):**
  - Implementar layouts CSS (`@media print`) específicos para impressoras térmicas (58mm/80mm).
  - Criar modelos: Cupom de Produção (Cozinha/Bar), Pré-Conta (Conferência) e Recibo Não Fiscal (Cliente).

- 🔮 **Etapa 5 (Preparação Fiscal):**
  - Atualizar tabela `products` com campos fiscais obrigatórios: NCM, CEST, CFOP, Unidade Comercial e Origem.
  - Criar tabela `company_settings` para dados fiscais da loja (CNPJ, Insc. Estadual, CSC, Regime Tributário).

- 🧾 **Etapa 6 (Emissão NFC-e/NF-e):**
  - Integração via API de Terceiros (ex: Focus NFe, eNotas) usando Supabase Edge Functions para segurança das chaves.
  - Geração de QRCode e armazenamento da URL da nota na tabela `sales`.
  - Botão "CPF na Nota" no fechamento de venda.

- 💼 **Etapa 7 (Financeiro Avançado - ERP):**
  - Criar tabela `bills` para gestão de Contas a Pagar e Despesas recorrentes.
  - Relatório DRE (Demonstrativo de Resultados): Faturamento Bruto - Custos (CMV) - Despesas = Lucro Líquido.