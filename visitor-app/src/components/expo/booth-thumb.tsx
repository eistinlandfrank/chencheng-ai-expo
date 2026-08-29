import Image from "next/image";
import { cn } from "@/utils/utils";
import { type Booth, CATEGORY_LABEL } from "@/lib/expo/booths";

/** Booth media with a deterministic gradient fallback for records without assets. */
export function BoothThumb({
  booth,
  className,
  showPlay,
}: {
  booth: Booth;
  className?: string;
  showPlay?: boolean;
}) {
  const hasImage = booth.image.startsWith("/") || booth.image.startsWith("http");

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        className,
      )}
      style={
        hasImage
          ? undefined
          : {
              background: `linear-gradient(135deg, ${booth.image} 0%, ${booth.image}cc 60%, #10271d 140%)`,
            }
      }
      aria-hidden
    >
      {hasImage && (
        <>
          <Image
            src={booth.image}
            alt=""
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        </>
      )}
      <span className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
        {booth.id}
      </span>
      {!hasImage && (
        <span className="pointer-events-none select-none text-4xl font-black tracking-tight text-white/85">
          {booth.name.slice(0, 2)}
        </span>
      )}
      <span className="absolute bottom-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
        {CATEGORY_LABEL[booth.category]}
      </span>
      {showPlay && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-0.5 size-6 fill-primary">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      )}
    </div>
  );
}
