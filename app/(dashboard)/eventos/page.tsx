'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  mockEventos,
  EventoStatus,
  formatCurrency,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  categorias,
} from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Download,
  Filter,
  AlertTriangle,
  Package,
} from 'lucide-react'

export default function EventosPage() {
  const { hasPermission } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventoStatus | 'todos'>('todos')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')

  const filteredEventos = useMemo(() => {
    let filtered = mockEventos

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }

    if (categoriaFilter !== 'todas') {
      filtered = filtered.filter(e => e.item?.categoria === categoriaFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.item?.nome.toLowerCase().includes(query) ||
        e.item?.codigoInterno.toLowerCase().includes(query) ||
        e.criadoPor.nome.toLowerCase().includes(query) ||
        e.motivo?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [statusFilter, categoriaFilter, searchQuery])

  if (!hasPermission('eventos:ver_todos')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para ver todos os eventos.</p>
        {hasPermission('eventos:criar') && (
          <Button asChild>
            <Link href="/eventos/novo">Registrar Nova Perda</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eventos de Perda</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os registros de perdas
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission('eventos:exportar') && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
          {hasPermission('eventos:criar') && (
            <Button asChild>
              <Link href="/eventos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por item, código, responsável ou motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EventoStatus | 'todos')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
            <SelectItem value="exportado">Exportado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Item</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEventos.length > 0 ? (
              filteredEventos.map((evento) => (
                <TableRow key={evento.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {evento.item?.imagemUrl ? (
                        <img
                          src={evento.item.imagemUrl || "/placeholder.svg"}
                          alt={evento.item.nome}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium truncate max-w-[180px]">
                          {evento.item?.nome || 'Não vinculado'}
                        </p>
                        {evento.item && (
                          <p className="text-xs text-muted-foreground">
                            {evento.item.codigoInterno}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {evento.quantidade} {evento.unidade}
                  </TableCell>
                  <TableCell>
                    {evento.custoSnapshot
                      ? formatCurrency(evento.custoSnapshot * evento.quantidade)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-[120px] block">
                      {evento.motivo || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{evento.criadoPor.nome}</TableCell>
                  <TableCell>{formatDateTime(evento.dataHora)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(evento.status)}>
                      {getStatusLabel(evento.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum evento encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredEventos.length} de {mockEventos.length} eventos
        </p>
      </div>
    </div>
  )
}
