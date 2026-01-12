export const products = [
  {
    id: 1,
    name: "Filé Mignon",
    category: "Carnes",
    price: 89.90,
    quantity: 12, // Quantidade atual
    minQuantity: 15, // Mínimo seguro (está abaixo, tem que avisar!)
    unit: "kg"
  },
  {
    id: 2,
    name: "Cerveja Artesanal IPA",
    category: "Bebidas",
    price: 18.50,
    quantity: 120,
    minQuantity: 50,
    unit: "un"
  },
  {
    id: 3,
    name: "Arroz Arbóreo",
    category: "Grãos",
    price: 22.00,
    quantity: 5,
    minQuantity: 10, // Crítico!
    unit: "pct"
  },
  {
    id: 4,
    name: "Azeite Trufado",
    category: "Temperos",
    price: 45.00,
    quantity: 8,
    minQuantity: 5,
    unit: "frasco"
  },
  {
    id: 5,
    name: "Guardanapos Premium",
    category: "Descartáveis",
    price: 0.50,
    quantity: 500,
    minQuantity: 200,
    unit: "un"
  }
]