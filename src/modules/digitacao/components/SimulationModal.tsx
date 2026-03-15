import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useJoinBankAPI } from '@/modules/baseoff/hooks/useJoinBankAPI';
import { toast } from 'sonner';
import { SimulationItem, PRODUCT_OPTIONS } from '../types';

interface SimulationModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (sim: SimulationItem) => void;
}

export function SimulationModal({ open, onClose, onAdd }: SimulationModalProps) {
  const api = useJoinBankAPI();
  const [product, setProduct] = useState('inss_port_refin');
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [selectedRuleName, setSelectedRuleName] = useState('');
  const [hasInsurance, setHasInsurance] = useState(false);

  // Portabilidade
  const [originLenderCode, setOriginLenderCode] = useState('');
  const [originLenderName, setOriginLenderName] = useState('');
  const [originContractNumber, setOriginContractNumber] = useState('');
  const [originRate, setOriginRate] = useState(0);
  const [originTerm, setOriginTerm] = useState(96);
  const [originInstallmentsRemaining, setOriginInstallmentsRemaining] = useState(84);
  const [originInstallmentValue, setOriginInstallmentValue] = useState(0);
  const [originDueBalance, setOriginDueBalance] = useState(0);

  // Refinanciamento
  const [refinRate, setRefinRate] = useState(1.80);
  const [refinTerm, setRefinTerm] = useState(96);
  const [refinInstallmentValue, setRefinInstallmentValue] = useState(0);
  const [refinContractValue, setRefinContractValue] = useState(0);

  // Resultado
  const [changeValue, setChangeValue] = useState(0);
  const [iofValue, setIofValue] = useState(0);
  const [calculating, setCalculating] = useState(false);

  const operationCode = product === 'inss_novo' ? 1 : product === 'inss_refin' ? 2 : product === 'inss_port' ? 3 : 4;
  const needsPort = operationCode >= 3;
  const needsRefin = operationCode === 2 || operationCode === 4;

  useEffect(() => {
    if (!open) return;
    setSelectedRuleId('');
    setRules([]);
    api.listRules(operationCode).then(data => {
      if (data?.items || Array.isArray(data)) {
        setRules(data?.items || data);
      }
    });
  }, [operationCode, open]);

  const handleCalculate = async () => {
    if (!selectedRuleId) { toast.error('Selecione uma tabela'); return; }
    setCalculating(true);
    try {
      const payload: any = {
        ruleId: selectedRuleId,
        hasInsurance,
        term: needsRefin ? refinTerm : originTerm,
        rate: needsRefin ? refinRate : originRate,
        referenceCode: null,
      };
      if (refinInstallmentValue > 0) payload.installmentValue = refinInstallmentValue;
      if (needsPort) {
        payload.originContract = {
          lenderCode: parseInt(originLenderCode) || 0,
          contractNumber: originContractNumber,
          term: originTerm,
          installmentsRemaining: originInstallmentsRemaining,
          installmentValue: originInstallmentValue,
          dueBalanceValue: originDueBalance,
        };
      }
      if (needsRefin && needsPort) {
        payload.refinancing = {
          term: refinTerm,
          rate: refinRate,
          installmentValue: refinInstallmentValue,
        };
      }
      const result = await api.calculate(payload);
      if (result) {
        setChangeValue(result.changeValue || 0);
        setIofValue(result.iofValue || 0);
        if (result.loanValue) setRefinContractValue(result.loanValue);
        toast.success('Cálculo realizado!');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedRuleId) { toast.error('Selecione uma tabela'); return; }
    const sim: SimulationItem = {
      id: crypto.randomUUID(),
      product: PRODUCT_OPTIONS.find(p => p.code === product)?.label || product,
      ruleId: selectedRuleId,
      ruleName: selectedRuleName,
      operationType: operationCode,
      originLenderCode,
      originLenderName,
      originContractNumber,
      originRate,
      originTerm,
      originInstallmentsRemaining,
      originInstallmentValue,
      originDueBalance,
      refinRate,
      refinTerm,
      refinInstallmentValue,
      refinContractValue,
      changeValue,
      iofValue,
      firstDueDate: '',
      lastDueDate: '',
      calcResult: null,
      hasInsurance,
    };
    onAdd(sim);
    onClose();
  };

  const inputCls = 'h-11 text-sm';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Simulação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Produto + Tabela */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Produto</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_OPTIONS.map(p => (
                    <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tabela</Label>
              {rules.length > 0 ? (
                <Select value={selectedRuleId} onValueChange={v => {
                  setSelectedRuleId(v);
                  const r = rules.find((r: any) => r.id === v);
                  setSelectedRuleName(r?.name || r?.product?.name || '');
                }}>
                  <SelectTrigger className="h-11 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {rules.map((rule: any, idx: number) => (
                      <SelectItem key={rule.id || idx} value={rule.id || ''} className="text-xs">
                        {rule.name || rule.product?.name || `Tabela ${idx + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted rounded-md mt-1 h-11">
                  {api.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {api.loading ? 'Carregando...' : 'Sem tabelas'}
                </div>
              )}
            </div>
          </div>

          {/* Portabilidade */}
          {needsPort && (
            <>
              <Separator />
              <p className="text-sm font-bold">Portabilidade</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Banco de Origem</Label>
                  <Input className={inputCls} value={originLenderCode} onChange={e => setOriginLenderCode(e.target.value)} placeholder="335 - BANCO DIGIO" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Número do Contrato</Label>
                  <Input className={inputCls} value={originContractNumber} onChange={e => setOriginContractNumber(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Taxa Port.</Label>
                  <Input type="number" step="0.001" className={inputCls} value={originRate || ''} onChange={e => setOriginRate(parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo Orig.</Label>
                  <Input type="number" className={inputCls} value={originTerm} onChange={e => setOriginTerm(parseInt(e.target.value) || 0)} inputMode="numeric" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Parc. Rest.</Label>
                  <Input type="number" className={inputCls} value={originInstallmentsRemaining} onChange={e => setOriginInstallmentsRemaining(parseInt(e.target.value) || 0)} inputMode="numeric" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vl. Parcela</Label>
                  <Input type="number" step="0.01" className={inputCls} value={originInstallmentValue || ''} onChange={e => setOriginInstallmentValue(parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Saldo Dev.</Label>
                  <Input type="number" step="0.01" className={inputCls} value={originDueBalance || ''} onChange={e => setOriginDueBalance(parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
              </div>
            </>
          )}

          {/* Refinanciamento */}
          {needsRefin && (
            <>
              <Separator />
              <p className="text-sm font-bold">Refinanciamento</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Taxa</Label>
                  <Input type="number" step="0.01" className={inputCls} value={refinRate} onChange={e => setRefinRate(parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo</Label>
                  <Input type="number" className={inputCls} value={refinTerm} onChange={e => setRefinTerm(parseInt(e.target.value) || 0)} inputMode="numeric" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vl. Parcela</Label>
                  <Input type="number" step="0.01" className={inputCls} value={refinInstallmentValue || ''} onChange={e => setRefinInstallmentValue(parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vl. Contrato</Label>
                  <Input type="number" step="0.01" className={inputCls} value={refinContractValue || ''} onChange={e => setRefinContractValue(parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
              </div>
            </>
          )}

          {/* Seguro */}
          <div className="flex items-center gap-2 py-1">
            <Switch checked={hasInsurance} onCheckedChange={setHasInsurance} />
            <Label className="text-sm">Incluir Seguro</Label>
          </div>

          {/* Resultado */}
          {(changeValue > 0 || iofValue > 0) && (
            <div className="flex gap-6 py-2">
              <div>
                <span className="text-xs text-muted-foreground">Valor do Troco</span>
                <p className="text-lg font-bold text-primary">{changeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Valor do IOF</span>
                <p className="text-lg font-bold">{iofValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
            ⓘ O valor liberado é uma simulação com base na data de hoje e será recalculado na data do pagamento da proposta.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleCalculate} disabled={calculating || !selectedRuleId}>
              {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simular
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedRuleId}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
