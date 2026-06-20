import Link from "next/link";
import { HiOutlineHome } from "react-icons/hi2";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-4 text-center">
      <h1 className="text-[10rem] font-extrabold leading-none gradient-text">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-text-primary">Page Not Found</h2>
      <p className="mt-2 max-w-md text-text-muted">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="btn-primary mt-8 inline-flex items-center gap-2"
      >
        <HiOutlineHome className="h-5 w-5" />
        Back to Home
      </Link>
    </div>
  );
}
