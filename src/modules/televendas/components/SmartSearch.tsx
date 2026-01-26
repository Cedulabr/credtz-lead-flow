import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, User, Phone, CreditCard, Hash, Loader2 } from "lucide-react";
import { Televenda, STATUS_CONFIG } from "../types";
import { formatCPF } from "../utils";
import { cn } from "@/lib/utils";

interface SmartSearchProps {
  value: string;
  onChange: (value: string) => void;
  televendas: Televenda[];
  onSelectResult?: (tv: Televenda) => void;
  placeholder?: string;
}

interface SearchResult {
  televenda: Televenda;
  matchType: "nome" | "cpf" | "telefone" | "id";
  highlight: string;
}

export const SmartSearch = ({
  value,
  onChange,
  televendas,
  onSelectResult,
  placeholder = "Buscar por nome, CPF, telefone ou ID...",
}: SmartSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(value), 150);
    return () => clearTimeout(timer);
  }, [value]);

  // Smart search with multiple match types
  const searchResults = useMemo((): SearchResult[] => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];

    const searchLower = debouncedSearch.toLowerCase().trim();
    const searchDigits = debouncedSearch.replace(/\D/g, "");
    const results: SearchResult[] = [];

    televendas.forEach((tv) => {
      // Match by name (partial, case insensitive)
      if (tv.nome.toLowerCase().includes(searchLower)) {
        results.push({
          televenda: tv,
          matchType: "nome",
          highlight: tv.nome,
        });
        return;
      }

      // Match by CPF (digits only)
      if (searchDigits.length >= 3) {
        const cpfDigits = tv.cpf.replace(/\D/g, "");
        if (cpfDigits.includes(searchDigits)) {
          results.push({
            televenda: tv,
            matchType: "cpf",
            highlight: formatCPF(tv.cpf),
          });
          return;
        }
      }

      // Match by phone
      if (searchDigits.length >= 4 && tv.telefone) {
        const phoneDigits = tv.telefone.replace(/\D/g, "");
        if (phoneDigits.includes(searchDigits)) {
          results.push({
            televenda: tv,
            matchType: "telefone",
            highlight: tv.telefone,
          });
          return;
        }
      }

      // Match by ID (partial)
      if (tv.id.toLowerCase().includes(searchLower)) {
        results.push({
          televenda: tv,
          matchType: "id",
          highlight: tv.id.substring(0, 8) + "...",
        });
      }
    });

    return results.slice(0, 8); // Limit results
  }, [debouncedSearch, televendas]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % searchResults.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev === 0 ? searchResults.length - 1 : prev - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelect(searchResults[selectedIndex].televenda);
          }
          break;
        case "Escape":
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, searchResults, selectedIndex]
  );

  const handleSelect = (tv: Televenda) => {
    if (onSelectResult) {
      onSelectResult(tv);
    }
    onChange(tv.nome);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Show dropdown when typing
  useEffect(() => {
    if (value.length >= 2 && searchResults.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [value, searchResults.length]);

  const getMatchIcon = (type: string) => {
    switch (type) {
      case "nome":
        return <User className="h-4 w-4" />;
      case "cpf":
        return <CreditCard className="h-4 w-4" />;
      case "telefone":
        return <Phone className="h-4 w-4" />;
      case "id":
        return <Hash className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getMatchLabel = (type: string) => {
    switch (type) {
      case "nome":
        return "Nome";
      case "cpf":
        return "CPF";
      case "telefone":
        return "Telefone";
      case "id":
        return "ID";
      default:
        return "";
    }
  };

  const isSearching = value !== debouncedSearch;

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= 2 && searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "h-14 pl-12 pr-12 text-base rounded-xl border-2 transition-all",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            isOpen && "rounded-b-none border-b-transparent"
          )}
        />
        {isSearching && (
          <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
        )}
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && searchResults.length > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full bg-popover border-2 border-t-0 border-primary rounded-b-xl shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <p className="text-xs text-muted-foreground px-2">
                {searchResults.length} resultado(s) encontrado(s)
              </p>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {searchResults.map((result, index) => {
                const statusConfig = STATUS_CONFIG[result.televenda.status];
                return (
                  <li key={result.televenda.id}>
                    <button
                      onClick={() => handleSelect(result.televenda)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full p-3 flex items-center gap-3 text-left transition-colors",
                        index === selectedIndex
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      )}
                    >
                      {/* Match type indicator */}
                      <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
                        {getMatchIcon(result.matchType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">
                            {result.televenda.nome}
                          </span>
                          {statusConfig && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-2 py-0.5 flex-shrink-0",
                                statusConfig.bgColor
                              )}
                            >
                              {statusConfig.emoji} {statusConfig.shortLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {getMatchLabel(result.matchType)}
                            </Badge>
                            <span className="font-mono">{result.highlight}</span>
                          </span>
                          <span className="text-xs">•</span>
                          <span className="text-xs truncate">
                            {result.televenda.banco} • {result.televenda.tipo_operacao}
                          </span>
                        </div>
                      </div>

                      {/* Value */}
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-primary">
                          R$ {result.televenda.parcela.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="p-2 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground px-2">
                Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑</kbd>{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↓</kbd> para
                navegar e <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>{" "}
                para selecionar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results hint */}
      <AnimatePresence>
        {isOpen && value.length >= 2 && searchResults.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full bg-popover border-2 border-t-0 border-primary rounded-b-xl shadow-lg p-4"
          >
            <div className="text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nenhum resultado encontrado</p>
              <p className="text-sm">Tente buscar por outro termo</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
