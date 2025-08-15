import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Edit } from "lucide-react";

interface AdminCommissionEditProps {
  selectedBank: string;
  selectedProduct: string;
  banksProducts: any[];
  onUpdate: () => void;
}

export function AdminCommissionEdit({ 
  selectedBank, 
  selectedProduct, 
  banksProducts, 
  onUpdate 
}: AdminCommissionEditProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editCommission, setEditCommission] = useState("");
  const [editRepasse, setEditRepasse] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const currentProduct = banksProducts.find(
    bp => bp.bank_name === selectedBank && bp.product_name === selectedProduct
  );

  const isAdmin = user?.role === 'admin';

  const handleUpdateCommission = async () => {
    if (!currentProduct || !editCommission || !editRepasse) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para atualizar",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Atualizar a comissão base no banco/produto
      const { error: updateError } = await supabase
        .from('banks_products')
        .update({
          base_commission_percentage: parseFloat(editCommission)
        })
        .eq('id', currentProduct.id);

      if (updateError) throw updateError;

      // Criar ou atualizar configuração de repasse para o usuário
      const { error: upsertError } = await supabase
        .from('user_commission_config')
        .upsert({
          user_id: user?.id,
          bank_product_id: currentProduct.id,
          commission_percentage: parseFloat(editRepasse),
          created_by: user?.id
        });

      if (upsertError) throw upsertError;

      // Salvar na tabela de comissão (commission_table)
      const { error: commissionTableError } = await supabase
        .from('commission_table')
        .upsert({
          bank_name: selectedBank,
          product_name: selectedProduct,
          commission_percentage: parseFloat(editCommission),
          user_percentage: parseFloat(editRepasse),
          term: currentProduct.term,
          created_by: user?.id
        });

      if (commissionTableError) throw commissionTableError;

      toast({
        title: "Comissão atualizada! ✅",
        description: "As configurações foram salvas com sucesso.",
      });

      setIsEditing(false);
      setEditCommission("");
      setEditRepasse("");
      onUpdate();

    } catch (error) {
      console.error('Erro ao atualizar comissão:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar comissão.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!currentProduct) return null;

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium">Prazo:</span>
          <span>{currentProduct.term}</span>
        </div>
        
        {!isEditing ? (
          <>
            <div className="flex justify-between items-center">
              <span className="font-medium">Comissão Base:</span>
              <span>{currentProduct.base_commission_percentage}%</span>
            </div>
            {isAdmin && (
              <div className="flex justify-center mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setEditCommission(currentProduct.base_commission_percentage.toString());
                    setEditRepasse(""); // Admin define o repasse
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar Comissão
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 mt-4 p-4 bg-card rounded-lg border">
            <div>
              <Label htmlFor="editCommission">Comissão Total (%)</Label>
              <Input
                id="editCommission"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={editCommission}
                onChange={(e) => setEditCommission(e.target.value)}
                placeholder="Ex: 3.5"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="editRepasse">Repasse para Usuário (%)</Label>
              <Input
                id="editRepasse"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={editRepasse}
                onChange={(e) => setEditRepasse(e.target.value)}
                placeholder="Ex: 2.8"
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateCommission}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? "Atualizando..." : "Atualizar Comissão"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditCommission("");
                  setEditRepasse("");
                }}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {selectedBank === 'Banco BRB' && (
          <div className="mt-2 p-2 bg-primary/10 rounded">
            <p className="text-sm text-primary-foreground">
              <strong>Banco BRB:</strong> Modalidades INSS e SIAPE disponíveis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}