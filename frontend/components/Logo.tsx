import React, { memo } from "react";
import Link from "next/link";

interface LogoProps {
  size?: number;
  linked?: boolean;
  className?: string;
  showText?: boolean;
}

function LogoComponent({
  size = 42,
  linked = true,
  className = "",
  showText = false,
}: LogoProps) {
  const logo = (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/dark_logo.jpeg"
        alt="ODFE"
        width={size}
        height={size}
        className="rounded-xl object-contain"
        draggable={false}
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight text-cafe-text font-display">
          ODFE
        </span>
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
