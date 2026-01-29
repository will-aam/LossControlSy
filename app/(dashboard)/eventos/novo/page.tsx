'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ItemSearch } from '@/components/forms/item-search'
import { Item, motivosComuns, formatCurrency } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import {
  Camera,
  Upload,
  X,
  Send,
  Save,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function NovoEventoPage() {
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState<'UN' | 'KG'>('UN')
  const [motivo, setMotivo] = useState('')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Sync unit with selected item
  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item)
    if (item) {
      setUnidade(item.unidade)
    }
  }

  // Calculate totals
  const custoTotal = selectedItem && quantidade
    ? selectedItem.custo * parseFloat(quantidade || '0')
    : 0
  const precoVendaTotal = selectedItem && quantidade
    ? selectedItem.precoVenda * parseFloat(quantidade || '0')
    : 0

  // Handle photo upload (mock)
  const handlePhotoUpload = () => {
    // Mock photo upload - in real app would use file input
    const mockPhotos = [
      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
      'https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=400',
    ]
    const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)]
    setFotos([...fotos, randomPhoto])
  }

  const removePhoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (asDraft: boolean = false) => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setShowSuccess(true)
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    // Reset form
    setSelectedItem(null)
    setQuantidade('')
    setMotivo('')
    setMotivoCustom('')
    setFotos([])
  }

  const isValid = quantidade && parseFloat(quantidade) > 0

  if (!hasPermission('eventos:criar')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para registrar perdas.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registrar Perda</h1>
        <p className="text-muted-foreground">
          Registre uma nova quebra ou descarte de produto
        </p>
      </div>

      {/* Item Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item (Opcional)</CardTitle>
          <CardDescription>
            Busque o item pelo nome, código interno ou código de barras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemSearch onSelect={handleItemSelect} selectedItem={selectedItem} />
        </CardContent>
      </Card>

      {/* Quantity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quantidade</CardTitle>
          <CardDescription>
            Informe a quantidade perdida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="quantidade" className="sr-only">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                step={unidade === 'KG' ? '0.1' : '1'}
                min="0"
                placeholder="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="text-lg"
              />
            </div>
            <Select value={unidade} onValueChange={(v) => setUnidade(v as 'UN' | 'KG')} disabled={!!selectedItem}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UN">UN</SelectItem>
                <SelectItem value="KG">KG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedItem && quantidade && parseFloat(quantidade) > 0 && (
            <div className="mt-4 rounded-lg bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo estimado:</span>
                <span className="font-medium">{formatCurrency(custoTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Perda em venda:</span>
                <span className="font-medium text-destructive">{formatCurrency(precoVendaTotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Motivo (Opcional)</CardTitle>
          <CardDescription>
            Selecione ou descreva o motivo da perda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {motivosComuns.slice(0, -1).map((m) => (
              <Badge
                key={m}
                variant={motivo === m ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  setMotivo(motivo === m ? '' : m)
                  if (motivo !== m) setMotivoCustom('')
                }}
              >
                {m}
              </Badge>
            ))}
          </div>
          {(motivo === '' || motivo === 'Outro') && (
            <Textarea
              placeholder="Descreva o motivo da perda..."
              value={motivoCustom}
              onChange={(e) => {
                setMotivoCustom(e.target.value)
                setMotivo('Outro')
              }}
              className="resize-none"
              rows={2}
            />
          )}
        </CardContent>
      </Card>

      {/* Fotos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidência Fotográfica (Opcional)</CardTitle>
          <CardDescription>
            Adicione fotos como evidência da perda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {fotos.map((foto, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={foto || "/placeholder.svg"}
                  alt={`Evidência ${index + 1}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {fotos.length < 5 && (
              <button
                type="button"
                onClick={handlePhotoUpload}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">Adicionar</span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={() => handleSubmit(true)}
          disabled={!isValid || isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar Rascunho
        </Button>
        <Button
          className="flex-1"
          onClick={() => handleSubmit(false)}
          disabled={!isValid || isSubmitting}
        >
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <DialogTitle className="text-center">Perda Registrada!</DialogTitle>
            <DialogDescription className="text-center">
              Seu registro foi enviado para aprovação do gestor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleSuccessClose} className="w-full">
              Registrar Nova Perda
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
