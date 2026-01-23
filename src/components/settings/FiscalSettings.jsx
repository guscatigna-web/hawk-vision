import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Loader2, Upload, FileKey, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function FiscalSettings() {
    const [config, setConfig] = useState({ 
        environment: 'homologacao', 
        csc_id: '', 
        csc_token: '',
        client_id: '',     // NOVO: Nuvem Fiscal Client ID
        client_secret: '', // NOVO: Nuvem Fiscal Client Secret
        certificate_url: null,
        certificate_password: ''
    })
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        async function fetch() {
            const { data } = await supabase.from('fiscal_config').select('*').single()
            if(data) setConfig(data)
            setLoading(false)
        }
        fetch()
    }, [])

    async function handleSave(e) {
        e.preventDefault()
        const toastId = toast.loading('Salvando Configuração Fiscal...')
        try {
            const { error } = await supabase.from('fiscal_config').upsert({
                id: config.id, 
                environment: config.environment,
                csc_id: config.csc_id,
                csc_token: config.csc_token,
                // Salvando credenciais da Nuvem Fiscal
                client_id: config.client_id,
                client_secret: config.client_secret,
                certificate_password: config.certificate_password,
            })

            if (error) throw error
            toast.success('Configuração Nuvem Fiscal Atualizada!', { id: toastId })
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar', { id: toastId })
        }
    }

    async function handleFileUpload(e) {
        const file = e.target.files[0]
        if (!file) return

        if (!file.name.endsWith('.pfx')) {
            toast.error('Por favor, envie um certificado válido (.pfx)')
            return
        }

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `cert_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Upload para o Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Atualiza referência no banco
            const { error: dbError } = await supabase.from('fiscal_config').upsert({
                ...config,
                certificate_url: filePath
            })

            if (dbError) throw dbError

            setConfig(prev => ({ ...prev, certificate_url: filePath }))
            toast.success('Certificado enviado com sucesso!')
            
        } catch (error) {
            console.error(error)
            toast.error('Erro ao enviar certificado.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-slate-400"/></div>

    return (
        <form onSubmit={handleSave} className="max-w-xl space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-700">Integração Nuvem Fiscal (NFC-e)</h2>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
                <HelpCircle className="text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                    Crie sua conta em <strong>nuvemfiscal.com.br</strong>. Em "Credenciais de API", gere um Client ID e Secret.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Ambiente</label>
                <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={config.environment}
                    onChange={e => setConfig({...config, environment: e.target.value})}
                >
                    <option value="homologacao">Homologação (Testes / Grátis)</option>
                    <option value="producao">Produção (Validade Jurídica)</option>
                </select>
            </div>

            <div className="space-y-4 pt-2 border-t">
                <h3 className="text-sm font-bold text-slate-700 uppercase">Credenciais de API (Nuvem Fiscal)</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Client ID</label>
                    <input 
                        type="text" 
                        placeholder="Ex: 2983...123"
                        className="w-full p-2 border rounded-lg font-mono text-xs" 
                        value={config.client_id || ''} 
                        onChange={e => setConfig({...config, client_id: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Client Secret</label>
                    <input 
                        type="password" 
                        placeholder="Ex: client_secret_..."
                        className="w-full p-2 border rounded-lg font-mono text-xs" 
                        value={config.client_secret || ''} 
                        onChange={e => setConfig({...config, client_secret: e.target.value})} 
                    />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                 <h3 className="text-sm font-bold text-slate-700 uppercase">Dados SEFAZ (CSC)</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">ID do CSC</label>
                        <input type="text" placeholder="Ex: 000001" className="w-full p-2 border rounded-lg" value={config.csc_id} onChange={e => setConfig({...config, csc_id: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Token CSC</label>
                        <input type="text" placeholder="Código alfanumérico" className="w-full p-2 border rounded-lg" value={config.csc_token} onChange={e => setConfig({...config, csc_token: e.target.value})} />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t space-y-4">
                <label className="block text-sm font-medium text-slate-600">Certificado Digital A1 (.pfx)</label>
                
                <div className={`p-4 rounded-lg border flex items-center justify-between ${config.certificate_url ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${config.certificate_url ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                            <FileKey size={20} />
                        </div>
                        <div>
                            <p className={`font-medium ${config.certificate_url ? 'text-green-800' : 'text-slate-600'}`}>
                                {config.certificate_url ? 'Certificado Instalado' : 'Pendente'}
                            </p>
                        </div>
                    </div>
                    {config.certificate_url ? <CheckCircle className="text-green-500" size={20}/> : <XCircle className="text-slate-300" size={20}/>}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Senha do Certificado</label>
                    <input 
                        type="password" 
                        className="w-full p-2 border rounded-lg bg-slate-50 focus:bg-white transition-colors"
                        value={config.certificate_password} 
                        onChange={e => setConfig({...config, certificate_password: e.target.value})} 
                    />
                </div>

                <div className="flex items-center gap-4">
                    <input type="file" ref={fileInputRef} accept=".pfx" onChange={handleFileUpload} className="hidden" />
                    <button 
                        type="button" 
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
                        {config.certificate_url ? 'Substituir Certificado' : 'Fazer Upload (.pfx)'}
                    </button>
                </div>
            </div>

            <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-900 font-bold shadow-lg shadow-slate-200">
                Salvar Configurações
            </button>
        </form>
    )
}