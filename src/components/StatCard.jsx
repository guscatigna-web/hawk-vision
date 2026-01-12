export function StatCard({ title, value, icon, description, color }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        {/* Título e Ícone */}
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-white`}>
          {/* O ícone vem como uma propriedade (prop) */}
          {icon}
        </div>
      </div>
      
      {/* Valor Principal */}
      <div className="text-2xl font-bold text-slate-900 mb-1">
        {value}
      </div>
      
      {/* Descriçãozinha pequena em baixo */}
      <p className="text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}