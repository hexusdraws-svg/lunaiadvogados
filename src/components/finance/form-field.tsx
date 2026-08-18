import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Value = string | number | null | undefined;

export function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: Value;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

export function SelectField({ label, value, onValueChange, placeholder, options, disabled, className }: SelectFieldProps) {
  return (
    <FormField label={label} className={className}>
      <Select value={value ?? ""} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

interface TextFieldProps {
  label: string;
  value: Value;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
}

export function TextField({ label, value, onChange, placeholder, type = "text", disabled, className }: TextFieldProps) {
  return (
    <FormField label={label} className={className}>
      <Input
        type={type}
        className="h-9 text-xs"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </FormField>
  );
}

interface NumberFieldProps {
  label?: string;
  value: Value;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NumberField({ label, value, onChange, placeholder, disabled, className }: NumberFieldProps) {
  const field = (
    <Input
      type="number"
      className="h-9 text-xs"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
  if (!label) return <div className={cn(className)}>{field}</div>;
  return <FormField label={label} className={className}>{field}</FormField>;
}

interface FreeTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function FreeTextField({ label, value, onChange, placeholder, rows = 2, className }: FreeTextFieldProps) {
  return (
    <FormField label={label} className={className}>
      <Textarea
        className="text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </FormField>
  );
}
