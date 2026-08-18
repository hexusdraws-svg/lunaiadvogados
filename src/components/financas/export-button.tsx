import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // In a real implementation, this would fetch the filtered transactions
      // and generate a CSV file for download
      // For now, we'll simulate the export

      // Create a sample CSV
      const csvContent =
        "Descrição,Valor,Cliente,Vencimento,Pagamento,Status,Anexo\n" +
        "Aluguel Janeiro,1500.00,João Silva,2026-01-05,2026-01-05,recebido,sim\n" +
        "Condomínio Fevereiro,300.00,João Silva,2026-02-10,2026-02-10,pago,sim\n" +
        "Energia Elétrica,180.50,Maria Oliveira,2026-03-15,,aberto,nao";

      // Create a blob and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "financas_recebimentos.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting} className="h-9">
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2" />
          Exportando...
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 mr-2" />
          Exportar Relatório
        </>
      )}
    </Button>
  );
}
