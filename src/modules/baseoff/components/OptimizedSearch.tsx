import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock, 
  X, 
  Loader2,
  Hash,
  CreditCard,
  User,
  Phone,
  Keyboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedSearchProps {
  onSearch: (query: string, immediate?: boolean) => void;
  isLoading?: boolean;
  matchType?: string | null;
  totalCount?: number;
  recentSearches?: string[];
  onClearHistory?: () => void;
}

const RECENT_SEARCHES_KEY = 'baseoff_recent_searches';

export function OptimizedSearch({ 
  onSearch, 
  isLoading,
  matchType,
  totalCount = 0,
  recentSearches: externalRecentSearches,
  onClearHistory: externalClearHistory
}: OptimizedSearchProps) {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    if (externalRecentSearches) {
      setRecentSearches(externalRecentSearches);
    } else {
      try {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, [externalRecentSearches]);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recent searches:', e);
    }
  }, [recentSearches]);

  const handleClearHistory = useCallback(() => {
    if (externalClearHistory) {
      externalClearHistory();
    } else {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, [externalClearHistory]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Trigger debounced search
    if (value.trim().length >= 3) {
      onSearch(value.trim(), false);
    }
  }, [onSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      onSearch(query.trim(), true);
      setShowHistory(false);
    }
  }, [query, onSearch, saveRecentSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('', true);
  }, [onSearch]);

  const handleRecentClick = useCallback((search: string) => {
    setQuery(search);
    onSearch(search, true);
    setShowHistory(false);
  }, [onSearch]);

  // Detect input type hint
  const getInputTypeHint = useCallback(() => {
    const cleanQuery = query.replace(/\D/g, '');
    if (/^\d+$/.test(query.replace(/[.\-/\s]/g, ''))) {
      if (cleanQuery.length <= 11) {
        return { icon: CreditCard, label: 'CPF', color: 'text-blue-600' };
      } else if (cleanQuery.length <= 15) {
        return { icon: Hash, label: 'NB', color: 'text-purple-600' };
      } else {
        return { icon: Phone, label: 'Telefone', color: 'text-green-600' };
      }
    }
    return { icon: User, label: 'Nome', color: 'text-orange-600' };
  }, [query]);

  const inputHint = query.length > 0 ? getInputTypeHint() : null;

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            🔍 Consulta Inteligente
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            CPF, NB, Telefone ou Nome • Busca automática
          </p>
        </div>
      </div>

      {/* Input Type Indicators */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant="outline" className="text-xs gap-1 py-0.5">
          <CreditCard className="w-3 h-3" /> CPF
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 py-0.5">
          <Hash className="w-3 h-3" /> NB
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 py-0.5">
          <Phone className="w-3 h-3" /> Telefone
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 py-0.5">
          <User className="w-3 h-3" /> Nome
        </Badge>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Input
            value={query}
            onChange={handleInputChange}
            placeholder="Digite CPF, NB, telefone ou nome..."
            className="h-12 sm:h-14 text-base sm:text-lg pl-10 sm:pl-12 pr-10 rounded-xl"
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          />
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          
          {/* Loading indicator inside input */}
          {isLoading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
          
          {/* Clear button */}
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {/* Input type hint badge */}
          {inputHint && (
            <Badge 
              variant="secondary" 
              className={cn(
                "absolute -top-2 left-3 text-[10px] px-1.5 py-0",
                inputHint.color
              )}
            >
              <inputHint.icon className="w-2.5 h-2.5 mr-0.5" />
              {inputHint.label}
            </Badge>
          )}
        </div>

        <Button 
          type="submit" 
          size="lg" 
          className="h-12 sm:h-14 px-4 sm:px-6 rounded-xl gap-1 sm:gap-2 shrink-0"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">Buscar</span>
        </Button>
      </form>

      {/* Match Type Indicator */}
      {matchType && totalCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1">
            {matchType === 'cpf' && <CreditCard className="w-3 h-3" />}
            {matchType === 'nb' && <Hash className="w-3 h-3" />}
            {matchType === 'telefone' && <Phone className="w-3 h-3" />}
            {matchType === 'nome' && <User className="w-3 h-3" />}
            Encontrado por {matchType.toUpperCase()}
          </Badge>
          <span className="text-muted-foreground">
            {totalCount} resultado(s)
          </span>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Keyboard className="w-3 h-3" />
        <span>Busca automática após 3 caracteres • Enter para busca imediata</span>
      </div>

      {/* Recent Searches */}
      {showHistory && recentSearches.length > 0 && (
        <div className="mt-4 p-3 sm:p-4 rounded-xl bg-background border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Buscas recentes
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleClearHistory}
            >
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 5).map((search, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                className="rounded-full h-7 text-xs"
                onMouseDown={() => handleRecentClick(search)}
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
