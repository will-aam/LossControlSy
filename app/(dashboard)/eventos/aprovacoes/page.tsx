'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EventoCard } from '@/components/eventos/evento-card'
import { mockEventos, EventoStatus, formatCurrency } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { Search, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'

export default function AprovacoesPage() {
  const { hasPermission } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'pendentes' | 'historico'>('pendentes')
  const [statusFilter, setStatusFilter] = useState<EventoStatus | 'todos'>('todos')

  // Local state for eventos (for demo purposes)
  const [eventos, setEventos] = useState(mockEventos)

  const pendentes = useMemo(() => {
    return eventos.filter(e => e.status === 'enviado')
  }, [eventos])

  const historico = useMemo(() => {
    let filtered = eventos.filter(e => e.status !== 'enviado' && e.status !== 'rascunho')
    
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.item?.nome.toLowerCase().includes(query) ||
        e.item?.codigoInterno.toLowerCase().includes(query) ||
        e.criadoPor.nome.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [eventos, statusFilter, searchQuery])

  const stats = useMemo(() => {
    const aprovados = eventos.filter(e => e.status === 'aprovado' || e.status === 'exportado')
    const rejeitados = eventos.filter(e => e.status === 'rejeitado')
    
    return {
      pendentes: pendentes.length,
      aprovados: aprovados.length,
      rejeitados: rejeitados.length,
      custoAprovado: aprovados.reduce((acc, e) => 
        acc + (e.custoSnapshot || 0) * e.quantidade, 0
      ),
    }
  }, [eventos, pendentes])

  const handleApprove = (id: string) => {
    setEventos(eventos.map(e => 
      e.id === id ? { ...e, status: 'aprovado' as EventoStatus } : e
    ))
  }

  const handleReject = (id: string) => {
    setEventos(eventos.map(e => 
      e.id === id ? { ...e, status: 'rejeitado' as EventoStatus } : e
    ))
  }

  if (!hasPermission('eventos:aprovar')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para aprovar eventos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aprovações</h1>
        <p className="text-muted-foreground">
          Gerencie as solicitações de registro de perdas
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprovados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejeitados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Aprovado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.custoAprovado)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'pendentes' | 'historico')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="pendentes" className="gap-2">
              Pendentes
              {stats.pendentes > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {stats.pendentes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {selectedTab === 'historico' && (
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EventoStatus | 'todos')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="exportado">Exportado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="pendentes" className="mt-4">
          {pendentes.length > 0 ? (
            <div className="space-y-4">
              {pendentes.map((evento) => (
                <EventoCard
                  key={evento.id}
                  evento={evento}
                  showActions
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-semibold">Tudo em dia!</h3>
              <p className="text-muted-foreground mt-1">
                Não há eventos pendentes de aprovação.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {historico.length > 0 ? (
            <div className="space-y-4">
              {historico.map((evento) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum resultado</h3>
              <p className="text-muted-foreground mt-1">
                Tente ajustar os filtros de busca.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
