"use client";

import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";
import { useMemo, useState } from "react";

type TiltSurfaceProps = React.ComponentProps<typeof Surface> & {
  maxTilt?: number;
};

const initialTransform = "perspective(1800px) rotateX(0deg) rotateY(0deg) translateZ(0)";

export function TiltSurface({
  children,
  className,
  maxTilt = 8,
  ...props
}: TiltSurfaceProps) {
  const [transform, setTransform] = useState(initialTransform);

  const style = useMemo(
    () => ({
      transform,
      transformStyle: "preserve-3d" as const,
      transition: transform === initialTransform ? "transform 260ms ease" : "transform 80ms linear",
    }),
    [transform],
  );

  return (
    <Surface
      {...props}
      className={cn("will-change-transform", className)}
      style={style}
      onMouseMove={(event) => {
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * maxTilt * 2;
        const rotateX = (0.5 - y) * maxTilt * 1.6;
        setTransform(
          `perspective(1800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`,
        );
      }}
      onMouseLeave={() => setTransform(initialTransform)}
    >
      {children}
    </Surface>
  );
}
