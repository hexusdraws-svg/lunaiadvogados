import { useState } from "react";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function ViewAttachmentModal({ attachmentUrl, attachmentType, onClose }) {
  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-start">
        <h2 className="text-xl font-semibold">Visualizar Anexo</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-4">
        {attachmentType === "pdf" ? (
          <div className="border rounded-lg overflow-hidden h-[500px]">
            <iframe
              src={attachmentUrl}
              title="Documento PDF"
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden h-[500px]">
            <img src={attachmentUrl} alt="Anexo" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              window.open(attachmentUrl, "_blank");
            }}
          >
            Abrir em nova aba
          </Button>
          <Button ml-2 onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
