"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineUser,
} from "react-icons/hi2";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/utils/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    cafeName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isRegister ? "/auth/signup" : "/auth/login";
      
      const payload = isRegister 
        ? { name: formData.name, email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password };

      const response = await fetchApi(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Authentication failed");
      }

      // Successful auth
      if (data.data?.accessToken && data.data?.user) {
        login(data.data.accessToken, data.data.user);
        router.push("/dashboard");
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mesh px-4">
      <div className="absolute inset-0 bg-noise" />
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo size={46} showText linked={false} />
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-text-primary">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            {isRegister
              ? "Register your ODFE cafe workspace"
              : "Sign in to your ODFE account"}
          </p>
        </div>

        <div className="glass-strong p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">
                  Full Name
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Mohamed Saif"
                    className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] py-3 pl-11 pr-4 text-sm text-text-primary placeholder-surface-500 outline-none transition-colors focus:border-brand-500/50 focus:bg-[var(--glass-border)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-text-secondary">
                Email
              </label>
              <div className="relative">
                <HiOutlineEnvelope className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] py-3 pl-11 pr-4 text-sm text-text-primary placeholder-surface-500 outline-none transition-colors focus:border-brand-500/50 focus:bg-[var(--glass-border)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-secondary">
                Password
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder={isRegister ? "Create password" : "Enter password"}
                  className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] py-3 pl-11 pr-11 text-sm text-text-primary placeholder-surface-500 outline-none transition-colors focus:border-brand-500/50 focus:bg-[var(--glass-border)]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-primary"
                >
                  {showPassword ? (
                    <HiOutlineEyeSlash className="h-5 w-5" />
                  ) : (
                    <HiOutlineEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">
                  Cafe Name (Optional)
                </label>
                <input
                  type="text"
                  name="cafeName"
                  value={formData.cafeName}
                  onChange={handleChange}
                  placeholder="ODFE Cafe"
                  className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] px-4 py-3 text-sm text-text-primary placeholder-surface-500 outline-none transition-colors focus:border-brand-500/50 focus:bg-[var(--glass-border)]"
                />
              </div>
            )}

            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border bg-[var(--glass-secondary)] accent-brand-500"
                  />
                  Remember me
                </label>

                <a
                  href="#"
                  className="text-sm font-medium text-brand-400 hover:text-brand-300"
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary block w-full text-center !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Please wait..." : (isRegister ? "Create Account" : "Sign In")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              {isRegister ? "Already have an account?" : "Don’t have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="font-medium text-brand-400 hover:text-brand-300"
              >
                {isRegister ? "Sign In" : "Register"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}