import { useRef } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { MapPin, Video as VideoIcon, Briefcase, Tag } from "lucide-react";
import { formatPrice, toDrivePreview, type Property } from "@/lib/sheets";

function getEmbedUrl(url: string, autoplay: boolean): string | null {
  const drive = toDrivePreview(url);
  if (drive) return drive;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  if (yt)
    return `https://www.youtube.com/embed/${yt[1]}?${autoplay ? "autoplay=1&" : ""}mute=1&controls=1&modestbranding=1&rel=0&loop=1&playlist=${yt[1]}`;
  const vm = /vimeo\.com\/(\d+)/.exec(url);
  if (vm)
    return `https://player.vimeo.com/video/${vm[1]}?${autoplay ? "autoplay=1&" : ""}muted=1&loop=1`;
  return null;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

export function PropertyCard({ property }: { property: Property }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useI18n();
  const direct = property.videoUrl && isDirectVideo(property.videoUrl);
  const embed = property.videoUrl && !direct ? getEmbedUrl(property.videoUrl, true) : null;

  const status =
    property.salePrice != null && property.rentPrice != null
      ? "Ativo & Inativo"
      : property.salePrice != null
        ? t("active")
        : property.rentPrice != null
          ? t("inactive")
          : "Disponível";

  return (
    <article
      className="group glass relative flex flex-col overflow-hidden rounded-2xl border border-border transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_30px_80px_-30px_oklch(0.55_0.2_260_/_50%)]"
      onMouseEnter={() => direct && videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => direct && videoRef.current?.pause()}
    >
      {/* Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/40">
        {direct ? (
          <video
            ref={videoRef}
            src={property.videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : embed ? (
          <iframe
            src={embed}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--gradient-primary)]/15">
            <VideoIcon className="h-12 w-12 text-primary/40" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />

        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <Briefcase className="h-3 w-3" /> {property.type || "Registo"}
        </div>
        <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur">
          <Tag className="h-3 w-3" /> {status}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3 w-3" /> {property.location || "Sem local"}
            </p>
            <p className="mt-1 text-sm font-semibold capitalize text-foreground">
              Registo {property.type || "—"}
            </p>
          </div>
        </div>

        <p className="line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {property.description || "Sem detalhes disponíveis."}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div className="rounded-lg bg-secondary/40 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("amount")}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {formatPrice(property.salePrice)}
            </p>
            {property.saleRange && (
              <p className="text-[10px] text-muted-foreground/80">{property.saleRange}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-primary/80">
              Valor mensal
            </p>
            <p className="mt-0.5 text-sm font-semibold text-primary">
              {formatPrice(property.rentPrice)}
            </p>
            {property.rentRange && (
              <p className="text-[10px] text-primary/70">{property.rentRange}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
