import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { StepProps, tipoLeadToConvenio, UF_TO_DDDS } from "./types";
import { TagsField } from "./fields/TagsField";
import { DDDField } from "./fields/DDDField";
import { EstadoField } from "./fields/EstadoField";
import { ContractFiltersSection } from "./fields/ContractFiltersSection";
import { PhoneAlertBanner } from "./fields/PhoneAlertBanner";

interface StepPerfilProps extends StepProps {
  /** Sinalizado pelo wrapper quando o usuário clicou Próximo. Retorna se pode avançar. */
  registerCanAdvance?: (fn: () => Promise<boolean>) => void;
}

export const StepPerfil = memo(function StepPerfil({ data, onUpdate, registerCanAdvance }: StepPerfilProps) {
  const [estadoError, setEstadoError] = useState<string | null>(null);
  const [phoneCheck, setPhoneCheck] = useState<{ total: number; with_phone: number } | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Refs para acessar o último estado dentro do callback registrado
  const dataRef = useRef(data);
  dataRef.current = data;

  const isServidor = data.tipoLead === 'servidor';
  // Aviso de telefone vale para todos os convênios (inclui Servidor)
  const usesPhoneAlert = !!data.tipoLead;

  // Reset banner quando filtros relevantes mudam
  useEffect(() => {
    setPhoneCheck(null);
  }, [data.tipoLead, data.ddds, data.tags]);

  const runPhoneCheck = useCallback(async (): Promise<{ total: number; with_phone: number } | null> => {
    const d = dataRef.current;
    setPhoneLoading(true);
    try {
      const { data: res, error } = await supabase.rpc('count_leads_with_phone', {
        convenio_filter: tipoLeadToConvenio(d.tipoLead),
        ddd_filter: d.ddds.length ? d.ddds : null,
        tag_filter: d.tags.length ? d.tags : null,
      });
      if (error) throw error;
      const row = (res || [])[0] || { total: 0, with_phone: 0 };
      const result = { total: Number(row.total), with_phone: Number(row.with_phone) };
      setPhoneCheck(result);
      return result;
    } catch (e) {
      console.error('count_leads_with_phone failed', e);
      return null;
    } finally {
      setPhoneLoading(false);
    }
  }, []);

  // Registra a lógica de validação ao avançar
  useEffect(() => {
    if (!registerCanAdvance) return;

    registerCanAdvance(async () => {
      const d = dataRef.current;

      // Servidor Público: estado é obrigatório
      if (d.tipoLead === 'servidor') {
        if (!d.uf) {
          setEstadoError('Selecione o estado para continuar');
          return false;
        }
        setEstadoError(null);
        // Garantir que ddds derivados estejam aplicados (auto-região pelo estado)
        const auto = UF_TO_DDDS[d.uf] || [];
        if (auto.length && d.ddds.join(',') !== auto.join(',')) {
          onUpdate({ ddds: auto });
        }
        return true;
      }

      // INSS/SIAPE/CLT: alerta de telefone
      if (usesPhoneAlert) {
        // Se já respondeu nesse ciclo, deixa avançar
        if (d.requireTelefone !== null) return true;

        // Se já checou e não tem leads com telefone, avança direto
        if (phoneCheck) {
          if (phoneCheck.with_phone === 0) {
            onUpdate({ requireTelefone: false });
            return true;
          }
          // tem telefone mas usuário ainda não escolheu → bloqueia
          return false;
        }

        const r = await runPhoneCheck();
        if (!r || r.with_phone === 0) {
          onUpdate({ requireTelefone: false });
          return true;
        }
        // banner aparece e usuário precisa escolher
        return false;
      }

      return true;
    });
  }, [registerCanAdvance, runPhoneCheck, phoneCheck, usesPhoneAlert, onUpdate]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-base font-semibold">Defina o perfil desejado</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isServidor ? 'O estado é obrigatório' : 'Todos os filtros são opcionais'}
        </p>
      </div>

      {/* Banner de telefone (apenas após query, INSS/SIAPE/CLT) */}
      {usesPhoneAlert && (phoneLoading || (phoneCheck && phoneCheck.with_phone > 0 && data.requireTelefone === null)) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <PhoneAlertBanner
            withPhone={phoneCheck?.with_phone || 0}
            total={phoneCheck?.total || 0}
            isLoading={phoneLoading}
            onChoose={(req) => onUpdate({ requireTelefone: req })}
          />
        </motion.div>
      )}

      {isServidor ? (
        <>
          <EstadoField
            value={data.uf}
            onChange={(uf) => {
              setEstadoError(null);
              onUpdate({
                uf,
                ddds: uf ? (UF_TO_DDDS[uf] || []) : [],
              });
            }}
            error={estadoError}
          />
          <ContractFiltersSection data={data} onUpdate={onUpdate} defaultExpanded />
        </>
      ) : (
        <>
          <TagsField selected={data.tags} onChange={(tags) => onUpdate({ tags })} />
          <DDDField selected={data.ddds} onChange={(ddds) => onUpdate({ ddds })} />
        </>
      )}
    </div>
  );
});
