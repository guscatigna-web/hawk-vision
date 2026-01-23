import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function PrintSettings() {
    const [config, setConfig] = useState({
        print_mode: 'browser',
        kds_alert_time: 15,
        service_fee: 10
    })

    useEffect(() => {
        async function fetch() {
            const { data } = await supabase.from('company_settings').select('*').single()
            if (data) setConfig(data)
        }
        fetch()
    }, [])

    async function handleSave(e) {
        e.preventDefault()
        try {
             const { error } = await supabase.from('company_settings').upsert(config)
             if (error) throw error
             toast.success('Configurações salvas!')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar')
        }
    }

    return (
        <div className="max-w-xl space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Impressão & Operação</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Modo de Impressão</label>
                    <select 
                        className="w-full p-2 border rounded-lg bg-white"
                        value={config.print_mode || 'browser'}
                        onChange={e => setConfig({...config, print_mode: e.target.value})}
                    >
                        <option value="browser">Navegador (Padrão)</option>
                        <option value="qz">QZ Tray (Impressão Direta/Silenciosa)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                        Use "Navegador" para abrir a janela de impressão do Chrome. Use QZ Tray para enviar direto para a impressora térmica sem popup.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Alerta de Atraso KDS (Minutos)</label>
                    <input 
                        type="number" 
                        className="w-full p-2 border rounded-lg"
                        value={config.kds_alert_time || 15}
                        onChange={e => setConfig({...config, kds_alert_time: Number(e.target.value)})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Taxa de Serviço Padrão (%)</label>
                    <input 
                        type="number" 
                        className="w-full p-2 border rounded-lg"
                        value={config.service_fee || 10}
                        onChange={e => setConfig({...config, service_fee: Number(e.target.value)})}
                    />
                </div>

                <button onClick={handleSave} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 font-bold">
                    Salvar Preferências
                </button>
            </div>
        </div>
    )
}