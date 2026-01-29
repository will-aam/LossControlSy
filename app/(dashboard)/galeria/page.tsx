'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  mockEventos,
  mockEvidencias,
  Evidencia,
  Evento,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import {
  Search,
  Calendar,
  AlertTriangle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  X,
} from 'lucide-react'

interface EvidenciaWithEvento extends Evidencia {
  evento?: Evento
}

export default function GaleriaPage() {
  const { hasPermission } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string>('todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<EvidenciaWithEvento | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)

  // Build evidencias with evento references
  const evidenciasWithEventos: EvidenciaWithEvento[] = useMemo(() => {
    const result: EvidenciaWithEvento[] = []
    
    mockEventos.forEach(evento => {
      evento.evidencias.forEach(ev => {
        result.push({
          ...ev,
          evento,
        })
      })
    })
    
    // Add orphan evidencias
    mockEvidencias.forEach(ev => {
      if (!result.find(e => e.id === ev.id)) {
        result.push(ev)
      }
    })
    
    return result.sort((a, b) => 
      new Date(b.dataUpload).getTime() - new Date(a.dataUpload).getTime()
    )
  }, [])

  // Get unique dates for filter
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>()
    evidenciasWithEventos.forEach(ev => {
      dates.add(formatDate(ev.dataUpload))
    })
    return Array.from(dates).sort((a, b) => {
      const [da, ma, ya] = a.split('/')
      const [db, mb, yb] = b.split('/')
      return new Date(`${yb}-${mb}-${db}`).getTime() - new Date(`${ya}-${ma}-${da}`).getTime()
    })
  }, [evidenciasWithEventos])

  const filteredEvidencias = useMemo(() => {
    let filtered = evidenciasWithEventos

    if (selectedDate !== 'todas') {
      filtered = filtered.filter(ev => formatDate(ev.dataUpload) === selectedDate)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(ev =>
        ev.evento?.item?.nome.toLowerCase().includes(query) ||
        ev.evento?.item?.codigoInterno.toLowerCase().includes(query) ||
        ev.evento?.motivo?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [evidenciasWithEventos, selectedDate, searchQuery])

  const handlePhotoClick = (photo: EvidenciaWithEvento, index: number) => {
    setSelectedPhoto(photo)
    setPhotoIndex(index)
  }

  const handlePrevPhoto = () => {
    const newIndex = photoIndex > 0 ? photoIndex - 1 : filteredEvidencias.length - 1
    setSelectedPhoto(filteredEvidencias[newIndex])
    setPhotoIndex(newIndex)
  }

  const handleNextPhoto = () => {
    const newIndex = photoIndex < filteredEvidencias.length - 1 ? photoIndex + 1 : 0
    setSelectedPhoto(filteredEvidencias[newIndex])
    setPhotoIndex(newIndex)
  }

  if (!hasPermission('galeria:ver')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para ver a galeria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Galeria de Evidências</h1>
          <p className="text-muted-foreground">
            Visualize todas as fotos de evidência registradas
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {filteredEvidencias.length} fotos
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por item ou motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-full sm:w-48">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as datas</SelectItem>
            {uniqueDates.map(date => (
              <SelectItem key={date} value={date}>{date}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gallery Grid */}
      {filteredEvidencias.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredEvidencias.map((evidencia, index) => (
            <Card
              key={evidencia.id}
              className="group cursor-pointer overflow-hidden"
              onClick={() => handlePhotoClick(evidencia, index)}
            >
              <CardContent className="p-0 relative">
                <div className="aspect-square">
                  <img
                    src={evidencia.url || "/placeholder.svg"}
                    alt={`Evidência ${index + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-xs font-medium truncate">
                      {evidencia.evento?.item?.nome || 'Sem item'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(evidencia.dataUpload)}
                    </p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="rounded-full bg-background/80 p-1.5 backdrop-blur-sm">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma foto encontrada</h3>
          <p className="text-muted-foreground mt-1">
            Tente ajustar os filtros de busca.
          </p>
        </div>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Navigation */}
            {filteredEvidencias.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
                  onClick={handlePrevPhoto}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
                  onClick={handleNextPhoto}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedPhoto && (
              <img
                src={selectedPhoto.url || "/placeholder.svg"}
                alt="Evidência"
                className="w-full max-h-[70vh] object-contain bg-muted"
              />
            )}
          </div>

          {/* Details */}
          {selectedPhoto && (
            <div className="p-4 border-t">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {selectedPhoto.evento ? (
                    <div className="flex items-center gap-3">
                      {selectedPhoto.evento.item?.imagemUrl ? (
                        <img
                          src={selectedPhoto.evento.item.imagemUrl || "/placeholder.svg"}
                          alt={selectedPhoto.evento.item.nome}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {selectedPhoto.evento.item?.nome || 'Item não vinculado'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(selectedPhoto.evento.status)}>
                            {getStatusLabel(selectedPhoto.evento.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {selectedPhoto.evento.quantidade} {selectedPhoto.evento.unidade}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Foto sem evento vinculado</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(selectedPhoto.dataUpload)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {photoIndex + 1} de {filteredEvidencias.length}
                  </p>
                </div>
              </div>
              {selectedPhoto.evento?.motivo && (
                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                  <span className="font-medium text-foreground">Motivo:</span> {selectedPhoto.evento.motivo}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
