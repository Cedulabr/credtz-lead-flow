import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CreditCard, Search, Loader2, FileText } from 'lucide-react';
import { useDigitacao } from './hooks/useDigitacao';
import { ProposalCard } from './components/ProposalCard';
import { ProposalDetail } from './components/ProposalDetail';
import { DigitacaoForm } from './components/DigitacaoForm';
import { Proposal, STATUS_MAP } from './types';

export function DigitacaoModule() {
  const { proposals, loading, statusFilter, setStatusFilter, fetchProposals, searchClientByCPF } = useDigitacao();
  const [showForm, setShowForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = proposals.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (p.client_name?.toLowerCase().includes(q) || p.client_cpf?.includes(q));
  });

  if (showForm) {
    return (
      <DigitacaoForm
        onClose={() => setShowForm(false)}
        onSuccess={fetchProposals}
        searchClientByCPF={searchClientByCPF}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-lg">Digitação</h1>
          </div>
          <Badge variant="secondary" className="text-xs">{proposals.length} propostas</Badge>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { value: 'all', label: 'Todas' },
            ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label })),
          ].map(opt => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 text-xs h-8"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {proposals.length === 0 ? 'Nenhuma proposta ainda' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Toque no botão + para criar sua primeira digitação</p>
          </div>
        ) : (
          filtered.map(p => (
            <ProposalCard key={p.id} proposal={p} onClick={() => setSelectedProposal(p)} />
          ))
        )}
      </div>

      {/* FAB */}
      <Button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-20 md:bottom-8 md:right-8"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Detail Sheet */}
      <ProposalDetail proposal={selectedProposal} onClose={() => setSelectedProposal(null)} />
    </div>
  );
}
