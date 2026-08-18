import type { UseCliente } from "@/hooks/use-clientes";
import type { Processo } from "@/lib/processos";
import type { Database } from "@/integrations/supabase/types";
import {
  buildClientValuesFromRow,
  buildDateValues,
  buildContractValues,
  buildProfissionalValues,
  buildPropertyValues,
} from "./contracts";

type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type ProcessoRow = Database["public"]["Tables"]["processos"]["Row"];

export interface ContractDataContext {
  cliente: ClienteRow | UseCliente | null;
  processo: ProcessoRow | Processo | null;
  company?: {
    nome?: string | null;
    nuit?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    email?: string | null;
    website?: string | null;
  } | null;
  profissional?: {
    nome?: string | null;
    cargo?: string | null;
    contacto?: string | null;
    email?: string | null;
  } | null;
  contract?: {
    numero?: string | null;
    valor?: string | number | null;
    inicio?: string | null;
    fim?: string | null;
    duracao?: string | null;
  } | null;
  property?: {
    location?: string | null;
    type?: string | null;
    salePrice?: number | null;
    rentPrice?: number | null;
    description?: string | null;
    reference?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
  } | null;
}

export interface ContractDataPayload {
  clientValues: Record<string, string>;
  dateValues: Record<string, string>;
  contractValues: Record<string, string>;
  professionalValues: Record<string, string>;
  propertyValues: Record<string, string>;
  mergedValues: Record<string, string>;
}

export class ContractDataBuilder {
  static build(context: ContractDataContext): ContractDataPayload {
    const clientValues = context.cliente
      ? buildClientValuesFromRow(context.cliente)
      : {};
    const dateValues = buildDateValues();
    const contractValues = context.contract
      ? buildContractValues(
          context.contract.numero || "",
          context.contract.valor,
          context.contract.inicio,
          context.contract.fim,
          context.contract.duracao,
        )
      : {};
    const professionalValues = context.profissional
      ? buildProfissionalValues(context.profissional)
      : {};
    const propertyValues = context.property
      ? buildPropertyValues(context.property)
      : {};

    const mergedValues = {
      ...dateValues,
      ...contractValues,
      ...clientValues,
      ...professionalValues,
      ...propertyValues,
    };

    return {
      clientValues,
      dateValues,
      contractValues,
      professionalValues,
      propertyValues,
      mergedValues,
    };
  }
}
