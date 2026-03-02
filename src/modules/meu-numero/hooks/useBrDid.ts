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

  // Fix #2: adquirir_did needs CN + NUMERO + SIP_TRUNK
  const adquirirDid = useCallback(
    (cn: number, numero: string) => callApi("adquirir_did", { CN: cn, NUMERO: numero, SIP_TRUNK: 0 }),
    [callApi]
  );

  // Fix #9: cancelar_did needs CN + NUMERO
  const cancelarDid = useCallback(
    (cn: number, numero: string) => callApi("cancelar_did", { CN: cn, NUMERO: numero }),
    [callApi]
  );

  // Fix #8: configurar_sip uses NUMERO_TRANSFERIR
  const configurarSip = useCallback(
    (numero: string, numeroTransferir: string) =>
      callApi("configurar_sip", { NUMERO: numero, NUMERO_TRANSFERIR: numeroTransferir }),
    [callApi]
  );

  const desconfigurarSip = useCallback(
    (numero: string) => callApi("desconfigurar_sip", { NUMERO: numero }),
    [callApi]
  );

  // Fix #3: whatsapp uses lowercase params
  const whatsappConfigurar = useCallback(
    (numero: string, urlRetorno: string) =>
      callApi("whatsapp_configurar", { numero, url_retorno: urlRetorno }),
    [callApi]
  );

  // Fix #7: getCdrs uses PERIODO in MMAAAA format
  const getCdrs = useCallback(
    (numero: string, mes: number, ano: number) => {
      const periodo = String(mes).padStart(2, "0") + String(ano);
      return callApi("get_cdrs", { NUMERO: numero, PERIODO: periodo });
    },
    [callApi]
  );

  // Fix #4: criar_plano uses correct field names with spaces
  const criarPlano = useCallback(
    (params: ActionParams) => callApi("criar_plano", params),
    [callApi]
  );

  // Fix #5: criar_cliente uses all required fields
  const criarCliente = useCallback(
    (params: ActionParams) => callApi("criar_cliente", params),
    [callApi]
  );

  // Fix #6: montar_cliente_plano_dids uses correct param names
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
