import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionParams = Record<string, any>;

export function useBrDid() {
  const [loading, setLoading] = useState(false);

  const callApi = useCallback(async (action: string, params: ActionParams = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("brdid-api", {
        body: { action, params },
      });

      if (error) {
        console.error("BR DID API error:", error);
        toast.error(`Erro na API: ${error.message}`);
        return null;
      }

      if (!data?.success) {
        toast.error(data?.error || "Erro desconhecido na API BR DID");
        return null;
      }

      return data.data;
    } catch (err: any) {
      console.error("BR DID call failed:", err);
      toast.error("Falha ao conectar com a API BR DID");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarLocalidades = useCallback(() => callApi("buscar_localidades"), [callApi]);

  const buscarNumeros = useCallback(
    (areaLocal: string) => callApi("buscar_numeros", { AREA_LOCAL: areaLocal }),
    [callApi]
  );

  const consultarDid = useCallback(
    (numero: string) => callApi("consultar_did", { NUMERO: numero }),
    [callApi]
  );

  const adquirirDid = useCallback(
    (codigo: number) => callApi("adquirir_did", { CODIGO: codigo }),
    [callApi]
  );

  const cancelarDid = useCallback(
    (numero: string) => callApi("cancelar_did", { NUMERO: numero }),
    [callApi]
  );

  const configurarSip = useCallback(
    (numero: string, destino: string) =>
      callApi("configurar_sip", { NUMERO: numero, DESTINO: destino }),
    [callApi]
  );

  const desconfigurarSip = useCallback(
    (numero: string) => callApi("desconfigurar_sip", { NUMERO: numero }),
    [callApi]
  );

  const whatsappConfigurar = useCallback(
    (numero: string, webhook: string) =>
      callApi("whatsapp_configurar", { NUMERO: numero, WEBHOOK: webhook }),
    [callApi]
  );

  const getCdrs = useCallback(
    (numero: string, mes: number, ano: number) =>
      callApi("get_cdrs", { NUMERO: numero, MES: mes, ANO: ano }),
    [callApi]
  );

  const criarPlano = useCallback(
    (params: ActionParams) => callApi("criar_plano", params),
    [callApi]
  );

  const criarCliente = useCallback(
    (params: ActionParams) => callApi("criar_cliente", params),
    [callApi]
  );

  const montarClientePlanoDids = useCallback(
    (params: ActionParams) => callApi("montar_cliente_plano_dids", params),
    [callApi]
  );

  const listarClientes = useCallback(() => callApi("listar_clientes"), [callApi]);
  const listarPlanos = useCallback(() => callApi("listar_planos"), [callApi]);

  return {
    loading,
    buscarLocalidades,
    buscarNumeros,
    consultarDid,
    adquirirDid,
    cancelarDid,
    configurarSip,
    desconfigurarSip,
    whatsappConfigurar,
    getCdrs,
    criarPlano,
    criarCliente,
    montarClientePlanoDids,
    listarClientes,
    listarPlanos,
  };
}
