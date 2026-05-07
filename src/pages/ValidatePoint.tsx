import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ValidatePoint() {
  const { hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!hash) return;
      const { data } = await (supabase as any).rpc('validate_time_clock_pdf', { p_hash: hash });
      setRecord(Array.isArray(data) ? data[0] : data);
      setLoading(false);
    })();
  }, [hash]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Validação de Espelho de Ponto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : record ? (
            <>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <div className="font-semibold text-emerald-700">Documento autêntico</div>
                  <div className="text-xs text-muted-foreground">Hash verificado contra o registro original.</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Período:</span><br />
                  {format(parseISO(record.period_start), "dd/MM/yyyy")} a {format(parseISO(record.period_end), "dd/MM/yyyy")}
                </div>
                <div><span className="text-muted-foreground">Gerado em:</span><br />
                  {format(parseISO(record.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                <div className="col-span-2 break-all">
                  <span className="text-muted-foreground">Hash:</span><br />
                  <code className="text-xs">{record.hash}</code>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">Documento não encontrado</div>
                <div className="text-xs text-muted-foreground">Este hash não corresponde a nenhum espelho emitido.</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
