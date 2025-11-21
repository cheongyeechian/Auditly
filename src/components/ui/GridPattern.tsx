export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  className,
  ...props
}: {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: any;
  className?: string;
  [key: string]: any;
}) {
  const id = "grid-pattern-id";

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30 mask-image:linear-gradient(to_bottom_right,white,transparent,transparent) ${className}`}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}

