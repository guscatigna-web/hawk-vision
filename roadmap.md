Roadmap Atualizado (Hawk Vision)
Abaixo, o roadmap reorganizado com o Mapeamento movido para "Concluído" e as próximas prioridades ajustadas.
🟢 O Que Já Fizemos (Concluído & Estável)
Core & Integração
✅ Fundação de Dados: Tabelas de vendas e integração estruturadas.
✅ Vinculação de Caixa: Pedidos caem automaticamente no caixa aberto.
✅ Autenticação iFood: OAuth e Refresh Token automáticos.
✅ Mapeamento de Cardápio: Interface e lógica de "De-Para" entre produtos iFood e ERP implantadas. O sistema agora "fala a língua" do estoque.
Gestão de Pedidos (O Porteiro)
✅ Polling Bidirecional: Busca pedidos e atualiza status reverso.
✅ Comandos de Operação: Painel controla o iFood (Aceitar, Despachar, Concluir).
✅ Tela de Pedidos (Pedidos.jsx):
Filtro "Bala de Prata" (100% funcional).
Identificação visual correta (#4239). ----> EM ABERTO
UX Limpa (Card simplificado, Colunas dinâmicas).

🟡 O Que Falta Fazer (Prioridade Imediata - "Refinamento")
Agora que o "grosso" funciona, precisamos fechar as pontas soltas operacionais.
Fluxo de Cancelamento (Com Motivo):
O que falta: O iFood exige um código de motivo. O botão "Cancelar" atual precisa abrir uma Modal perguntando o motivo antes de enviar a requisição.
Impressão Automática (Trigger):
O que falta: Garantir que a impressão dispare sozinha ao detectar um pedido novo no Polling, sem depender do clique no botão "Aceitar" (para casos onde o aceite é automático ou manual).
Sincronização de Estoque Reversa (Hawk -> iFood):
O que falta: Agora que temos o mapeamento, criar a lógica: Se Estoque do Produto X chegar a 0 no ERP -> Pausar item no iFood via API.

🔵 O Que Falta Fazer (Gestão & Financeiro)
Dashboard Financeiro Unificado:
Gráficos comparativos: Vendas iFood vs Balcão em tempo real.
Curva ABC de produtos (agora possível graças ao mapeamento).
Precificação Inteligente:
Gestão de preços distintos (Delivery vs Loja) em tela única.

🟣 Expansão (Módulos Pós-ERP / Add-ons)
O diferencial competitivo do Hawk Vision:
🏷️ Módulo Etiquetadora:
Integração com impressoras térmicas (Zebra/Elgin) para etiquetas de gôndola e despacho.
🍳 Módulo Receita & Produção:
Cadastro de Ficha Técnica.
Cálculo de CMV (Custo da Mercadoria Vendida) teórico vs real.
📅 Calendário de Atividades:
Visão mensal/semanal de obrigações da loja.
✅ Checklists & Formulários:
Checklists de abertura/fechamento vinculados ao calendário.

Próximo Passo Sugerido: Focar no Fluxo de Cancelamento com Motivo. É uma funcionalidade obrigatória pela API do iFood e evita erros operacionais.

