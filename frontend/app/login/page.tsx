"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuMail,
  LuLock,
  LuEye,
  LuEyeOff,
  LuUser,
} from "react-icons/lu";
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
        body: JSON.stringify(payload),
      });

      const data = typeof response.json === "function" ? await response.json() : response;

      if (data.data?.accessToken && data.data?.user) {
        login(data.data.accessToken, data.data.user);
        router.push("/dashboard");
      } else {
        throw new Error(data.message || data.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-cafe-bg px-4">
      {/* Subtle ambient */}
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-72 w-72 rounded-full bg-cafe-accent/6 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-cafe-surface/30 blur-[60px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo size={46} showText linked={false} />
          </Link>

          <h1 className="mt-8 text-3xl">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>

          <p className="mt-3 text-sm text-cafe-text-secondary font-sans">
            {isRegister
              ? "Register your ODFE cafe workspace"
              : "Sign in to your ODFE account"}
          </p>
        </div>

        {/* Form card */}
        <div className="glass-panel p-8">
          {error && (
            <div className="mb-4 rounded-btn border border-[rgba(180,60,30,0.15)] bg-[rgba(180,60,30,0.06)] p-3 text-sm text-[#B43C1E] font-sans">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-cafe-text-secondary font-sans">
                  Full Name
                </label>
                <div className="relative">
                  <LuUser className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-secondary/50" strokeWidth={1.5} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    className="input-field pl-11"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-cafe-text-secondary font-sans">
                Email
              </label>
              <div className="relative">
                <LuMail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-secondary/50" strokeWidth={1.5} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cafe-text-secondary font-sans">
                Password
              </label>
              <div className="relative">
                <LuLock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-secondary/50" strokeWidth={1.5} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder={isRegister ? "Create password" : "Enter password"}
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cafe-text-secondary/50 hover:text-cafe-accent transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <LuEyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <LuEye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-cafe-text-secondary font-sans">
                  Cafe Name <span className="text-cafe-text-secondary/40">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="cafeName"
                  value={formData.cafeName}
                  onChange={handleChange}
                  placeholder="ODFE Cafe"
                  className="input-field"
                />
              </div>
            )}

            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-cafe-text-secondary font-sans cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-cafe-border accent-cafe-dark"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-cafe-accent hover:text-cafe-hover transition-colors font-sans"
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary block w-full text-center !py-3"
            >
              {isLoading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-cafe-text-secondary font-sans">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="font-medium text-cafe-accent hover:text-cafe-hover transition-colors"
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