'use client'

import { useState, useMemo } from 'react'
import { Search, Package, X, Barcode } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Item, mockItems, formatCurrency } from '@/lib/mock-data'

interface ItemSearchProps {
  onSelect: (item: Item | null) => void
  selectedItem: Item | null
}

// Simple fuzzy search that tolerates typos
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  // Direct match
  if (lowerText.includes(lowerQuery)) return true
  
  // Check if all characters appear in order (fuzzy)
  let textIndex = 0
  for (let i = 0; i < lowerQuery.length; i++) {
    const char = lowerQuery[i]
    const foundIndex = lowerText.indexOf(char, textIndex)
    if (foundIndex === -1) return false
    textIndex = foundIndex + 1
  }
  return true
}

export function ItemSearch({ onSelect, selectedItem }: ItemSearchProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const filteredItems = useMemo(() => {
    if (!query.trim()) return mockItems.filter(i => i.status === 'ativo').slice(0, 6)
    
    return mockItems
      .filter(item => {
        if (item.status !== 'ativo') return false
        return (
          fuzzyMatch(item.nome, query) ||
          fuzzyMatch(item.codigoInterno, query) ||
          (item.codigoBarras && fuzzyMatch(item.codigoBarras, query)) ||
          fuzzyMatch(item.categoria, query)
        )
      })
      .slice(0, 10)
  }, [query])

  const handleSelect = (item: Item) => {
    onSelect(item)
    setQuery('')
    setIsFocused(false)
  }

  const handleClear = () => {
    onSelect(null)
    setQuery('')
  }

  if (selectedItem) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-4">
          {selectedItem.imagemUrl ? (
            <img
              src={selectedItem.imagemUrl || "/placeholder.svg"}
              alt={selectedItem.nome}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{selectedItem.nome}</h3>
              <Badge variant="outline">{selectedItem.unidade}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedItem.codigoInterno} - {selectedItem.categoria}
            </p>
            <div className="flex gap-4 mt-1 text-sm">
              <span>Custo: {formatCurrency(selectedItem.custo)}</span>
              <span>Venda: {formatCurrency(selectedItem.precoVenda)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, código interno ou código de barras..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-10"
        />
      </div>

      {isFocused && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg">
          <ScrollArea className="max-h-[320px]">
            {filteredItems.length > 0 ? (
              <div className="p-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent transition-colors"
                  >
                    {item.imagemUrl ? (
                      <img
                        src={item.imagemUrl || "/placeholder.svg"}
                        alt={item.nome}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.codigoInterno}</span>
                        {item.codigoBarras && (
                          <>
                            <Barcode className="h-3 w-3" />
                            <span>{item.codigoBarras}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {item.categoria}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.unidade}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum item encontrado
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2">
            <p className="text-xs text-muted-foreground text-center">
              Item não encontrado? Continue sem vincular.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
