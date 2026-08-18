import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SelectContent } from "@/components/ui/select";
import { SelectItem } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";

export function AddTransactionModal({ transactionType, onClose, onSuccess }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    client_id: "",
    due_date: "",
    payment_date: "",
    payment_method: "",
    frequency: "nenhum",
    observations: "",
  });

  const [clients, setClients] = useState([]);

  // Mock client data - in a real app, this would come from Supabase
  // useEffect(() => {
  //   setClients([
  //     { id: "1", nome: "João Silva" },
  //     { id: "2", nome: "Maria Oliveira" },
  //     { id: "3", nome: "Carlos Santos" },
  //   ]);
  // }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real implementation, this would call the Supabase API
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="p-6">
        <div className="mb-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            {t("cancel")}
          </Button>

          <Button onClick={handleSubmit} className="w-full mt-2">
            {transactionType === "receita" ? "Adicionar Recebimento" : "Adicionar Despesa"}
          </Button>
        </div>
      </div>
    </>
  );
}
