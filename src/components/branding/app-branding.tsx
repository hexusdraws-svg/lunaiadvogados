import { APP_NAME } from "@/lib/version";

const LOGO_PATH = "/logos/logo.png";

function LogoImage({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_PATH}
      alt={APP_NAME}
      className={`h-6 w-6 object-contain ${className ?? ""}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
      }}
    />
  );
}

export { LogoImage };

export function AppBranding({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoImage />
      <span className="text-lg font-bold tracking-tight">
        <span className="text-foreground">Lun</span>
        <span className="text-primary-foreground bg-primary px-1.5 py-0.5 rounded text-sm font-semibold">
          AI
        </span>
        <span className="text-foreground"> Juris</span>
      </span>
    </div>
  );
}

export function AppBrandingSmall({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <LogoImage />
      <span className="text-sm font-bold tracking-tight">
        <span className="text-foreground">Lun</span>
        <span className="text-primary-foreground bg-primary px-1 py-0.5 rounded text-xs font-semibold">
          AI
        </span>
        <span className="text-foreground"> Juris</span>
      </span>
    </div>
  );
}