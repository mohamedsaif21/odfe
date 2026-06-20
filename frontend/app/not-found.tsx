import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cafe-bg px-4 text-center">
      <h1 className="text-[10rem] font-bold leading-none text-cafe-accent/20 font-display">404</h1>
      <h2 className="mt-4 text-2xl text-cafe-text">Page Not Found</h2>
      <p className="mt-2 max-w-md text-sm text-cafe-text-secondary font-sans">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="btn-primary mt-8 inline-flex items-center gap-2"
      >
        <LuArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to Home
      </Link>
    </div>
  );
}
