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

## 🗄️ Estrutura do Banco de Dados (Real)

Baseado no Schema Dump de 15/01/2026.

### 👥 Pessoas & Acesso
- **`companies`** (Multi-tenant)
  - `id` (bigint): PK
  - `name`, `cnpj`
- **`employees`** (Funcionários/Usuários)
  - `id` (bigint): PK
  - `company_id` (bigint): FK
  - `name`, `email`, `role` (admin/manager/cashier/kitchen)
  - `pin` (text): Senha numérica para PDV
- **`customers`**
  - `id` (bigint): PK
  - `name`, `phone`, `cpf`, `email`
- **`suppliers`**
  - `id` (bigint): PK
  - `name`, `contact_name`, `phone`

### 📦 Catálogo & Estoque
- **`categories`**
  - `id` (bigint): PK
  - `name` (text), `type` (text)
- **`products`**
  - `id` (bigint): PK
  - `name` (text), `price` (numeric), `cost_price` (numeric)
  - `category_id` (bigint): FK
  - `destination` (text): 'kitchen' | 'bar' | null (Define para qual tela KDS vai)
  - `track_stock` (bool): Se controla estoque
  - `stock_quantity` (numeric): Quantidade atual
  - `barcode` (text): EAN
- **`recipes`** (Ficha Técnica)
  - `product_id` (bigint): Produto pai
  - `ingredient_id` (bigint): Produto filho (ingrediente)
  - `quantity`: Quanto gasta do ingrediente
- **`stock_movements`**
  - `type`: 'in' (entrada) | 'out' (saída/venda) | 'adjustment' (correção)

### 💰 Vendas & Caixa
- **`cashier_sessions`** (Sessões de Caixa)
  - `id` (bigint): PK
  - `employee_id` (bigint): Quem abriu
  - `opened_at`, `closed_at`
  - `initial_balance`, `final_balance`
  - `status`: 'open' | 'closed'
- **`sales`** (Cabeçalho do Pedido)
  - `id` (bigint): PK
  - `company_id` (bigint)
  - `channel`: 'Balcão' | 'iFood' | 'Mesa'
  - `status`: 'aberto' | 'concluido' | 'cancelado'
  - `total` (numeric), `discount_value` (numeric)
  - `ifood_order_id` (text): ID externo para evitar duplicidade
  - `customer_name` (text)
- **`sale_items`** (Itens do Pedido)
  - `id` (bigint): PK
  - `sale_id` (bigint): FK
  - `product_id` (bigint): FK
  - `product_name` (text): Snapshot do nome (Vital para iFood/KDS)
  - `quantity`, `unit_price`, `total`
  - `destination`: Para roteamento KDS
- **`sale_payments`**
  - `payment_method`: 'credit' | 'debit' | 'money' | 'pix' | 'ifood'

### 🛵 Integração iFood (Arquitetura "Device Flow")
- **`integrations_ifood`** (Tabela de Sessão)
  - `company_id` (bigint): FK
  - `merchant_id` (text): ID da loja no iFood
  - `access_token` (text): Token JWT
  - `refresh_token` (text): Token para renovação
  - `temp_verifier` (text): Armazena o `code_verifier` durante o fluxo de login
  - `status`: 'CONNECTED' | 'DISCONNECTED'
- **`ifood_menu_mapping`** (De-Para de Produtos)
  - `ifood_product_id` (text): ID no iFood
  - `erp_product_id` (bigint): ID no Hawk Vision
  - `ifood_product_name` (text): Nome original no iFood

### ⚙️ Configurações & Fiscal
- **`company_settings`**
  - Dados da empresa (Endereço, Cores do sistema)
  - Dados Fiscais: `cnpj`, `ie`, `crt`, `csc_token`, `csc_id`

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
## 📍 Roadmap de Integração (Reboot)

### Fase 1: Fundação (Atual)
- [x] Limpeza do Banco de Dados (Remoção de tabelas experimentais).
- [x] Mapeamento do Schema Real (BigInt vs UUID).
- [ ] Restaurar funcionalidade básica do PDV com a estrutura atual.

### Fase 2: Conexão iFood
- [ ] Restaurar Edge Function `ifood-auth` (ou `ifood-order-poller`) usando a estrutura `integrations_ifood` já existente.
- [ ] Implementar fluxo: Frontend pede Código -> Usuário Autoriza -> Frontend envia Código -> Backend troca e salva em `integrations_ifood`.

### Fase 3: Operação
- [ ] Polling de pedidos via Edge Function.
- [ ] Inserção em `sales` com `channel='iFood'`.
- [ ] Visualização no Gestor de Pedidos e KDS.

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