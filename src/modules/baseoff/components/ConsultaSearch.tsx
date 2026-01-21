import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Clock, 
  X, 
  Loader2,
  Hash,
  CreditCard,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsultaSearchProps {
  onSearch: (query: string, type: 'cpf' | 'nb' | 'nome') => void;
  isLoading?: boolean;
  recentSearches?: string[];
  onClearHistory?: () => void;
}

export function ConsultaSearch({ 
  onSearch, 
  isLoading,
  recentSearches = [],
  onClearHistory
}: ConsultaSearchProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'cpf' | 'nb' | 'nome'>('cpf');
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), searchType);
      setShowHistory(false);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  const searchTypes = [
    { key: 'cpf' as const, label: 'CPF', icon: CreditCard, placeholder: '000.000.000-00' },
    { key: 'nb' as const, label: 'NB', icon: Hash, placeholder: 'Número do benefício' },
    { key: 'nome' as const, label: 'Nome', icon: User, placeholder: 'Nome do cliente' },
  ];

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Search className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">🔍 Consulta Rápida</h2>
          <p className="text-sm text-muted-foreground">Busque por CPF, NB ou Nome</p>
        </div>
      </div>

      {/* Search Type Selector */}
      <div className="flex gap-2 mb-4">
        {searchTypes.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            type="button"
            variant={searchType === key ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setSearchType(key)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchTypes.find(t => t.key === searchType)?.placeholder}
            className="h-14 text-lg pl-12 pr-10 rounded-xl"
            onFocus={() => setShowHistory(true)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button 
          type="submit" 
          size="lg" 
          className="h-14 px-8 rounded-xl gap-2"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          Buscar
        </Button>
      </form>

      {/* Recent Searches */}
      {showHistory && recentSearches.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-background border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Buscas recentes
            </span>
            {onClearHistory && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onClearHistory}
              >
                Limpar histórico
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 5).map((search, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setQuery(search);
                  setShowHistory(false);
                }}
              >
                {search}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
