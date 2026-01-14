import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'

export function SortableWidget({ id, children, isEditing, onRemove, colSpan }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group ${colSpan} h-full`}
    >
      {/* Camada de Edição (Só aparece no modo Edit) */}
      {isEditing && (
        <div className="absolute -top-2 -right-2 z-20 flex gap-1">
          <button 
            onClick={() => onRemove(id)}
            className="bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
            title="Remover Widget"
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      {isEditing && (
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing bg-slate-100 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200"
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Bloqueio de cliques internos durante edição para facilitar o drag */}
      <div className={`h-full ${isEditing ? 'pointer-events-none ring-2 ring-blue-400/30 rounded-xl' : ''}`}>
        {children}
      </div>
    </div>
  )
}