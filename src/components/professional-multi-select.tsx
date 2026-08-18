import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ProfessionalMultiSelectProps {
  professionals: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProfessionalMultiSelect({
  professionals,
  selectedIds,
  onSelect,
  placeholder = "Selecionar profissionais...",
  disabled = false,
}: ProfessionalMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter((sid) => sid !== id)
      : [...selectedIds, id];
    onSelect(newIds);
  };

  const selectedProfessionals = professionals.filter((p) => selectedIds.includes(p.id));

  const getRoleLabel = (role?: string) => {
    if (!role) return "";
    if (role === "lawyer") return "Advogado";
    if (role === "admin") return "Administrador";
    return role;
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 items-center">
              {selectedProfessionals.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedProfessionals.map((p) => (
                  <Badge key={p.id} variant="secondary" className="mr-1">
                    {p.name}
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar profissional..." />
            <CommandEmpty>
              {professionals.length === 0
                ? "Carregando profissionais..."
                : "Nenhum profissional encontrado."}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {professionals.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => handleSelect(p.id)}
                  className="flex flex-col items-start"
                >
                  <div className="flex w-full items-center">
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        selectedIds.includes(p.id)
                          ? "bg-primary border-primary"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className={cn("h-3 w-3 text-primary-foreground")} />
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  {p.role && (
                    <span className="ml-6 mt-0.5 text-xs text-muted-foreground">
                      {getRoleLabel(p.role)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
