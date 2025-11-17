import { cn } from "@/lib/utils";

type GradientCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  contentClassName?: string;
  headerRight?: React.ReactNode;
};

export function GradientCard({
  title,
  children,
  icon,
  className,
  contentClassName,
  headerRight,
  ...rest
}: GradientCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-black text-white shadow-[0px_18px_40px_rgba(255,167,48,0.25)]",
        className
      )}
      {...rest}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 w-40 h-40 bg-[radial-gradient(circle_at_top_left,rgba(255,195,35,0.2)_0%,rgba(255,195,35,0.2)_40%,rgba(255,195,35,0.08)_60%,transparent_80%)]" />
        <div className="absolute inset-0 backdrop-blur-[18px]" />
      </div>

      <div className="relative z-10 p-4 md:p-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-lg">{icon}</span> : null}
            <h3 className="text-sm md:text-xl lg:text-2xl font-semibold text-[#FFC323] mb-2">{title}</h3>
          </div>
          {headerRight}
        </header>
        <div className={cn("mt-4 text-sm text-white/80", contentClassName)}>{children}</div>
      </div>
    </div>
  );
}


