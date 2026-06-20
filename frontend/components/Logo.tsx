import React, { memo } from "react";
import Link from "next/link";

interface LogoProps {
  size?: number;
  linked?: boolean;
  className?: string;
  showText?: boolean;
}

/**
 * Reusable ODFE logo with instant, flicker-free theme switching.
 *
 * Both images are always in the DOM. CSS opacity (driven by .dark class on <html>)
 * toggles visibility. No React state, no re-renders, no fetch on switch.
 * Both logos are preloaded via <link rel="preload"> in layout.tsx for zero-delay switching.
 */
function LogoComponent({
  size = 36,
  linked = true,
  className = "",
  showText = false,
}: LogoProps) {
  const logo = (
    <div
      className={`logo-wrapper inline-flex items-center gap-2 ${className}`}
    >
      <div
        className="logo-img-container relative shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src="/light_logo.jpeg"
          alt="ODFE"
          width={size}
          height={size}
          className="logo-light absolute inset-0 h-full w-full rounded-xl object-contain"
          draggable={false}
        />
        <img
          src="/dark_logo.jpeg"
          alt="ODFE"
          width={size}
          height={size}
          className="logo-dark absolute inset-0 h-full w-full rounded-xl object-contain"
          draggable={false}
        />
      </div>
      {showText && (
        <span className="text-lg font-bold text-text-primary">ODFE</span>
      )}
    </div>
  );

  if (linked) {
    return (
      <Link href="/" className="inline-flex items-center">
        {logo}
      </Link>
    );
  }

  return logo;
}

export const Logo = memo(LogoComponent);
export default Logo;
