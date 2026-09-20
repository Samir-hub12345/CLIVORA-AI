"use client";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { useAuth } from "@/lib/auth";

export function DashboardShell({ title, description, children, refresh }: { title: string; description: string; children: React.ReactNode; refresh?: () => void }) {
  const { user } = useAuth();
  return <div className="min-h-screen bg-slate-50 flex flex-col"><Header />
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-white p-6">
        <div><p className="text-xs text-teal-700 uppercase font-bold tracking-wider mb-2">{user?.role} workspace</p>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="text-sm text-slate-600 mt-2">{description}</p></div>
        {refresh && <button onClick={refresh} className="rounded-lg border px-4 py-2 text-sm hover:bg-teal-50">Refresh</button>}
      </div>{children}
    </main><Footer /></div>;
}
export function DataState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (loading) return <p className="p-8 text-teal-700" role="status">Loading your workspace…</p>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5" role="alert"><p>{error}</p><button onClick={retry} className="mt-3 underline font-semibold">Try again</button></div>;
  return null;
}
export function Stat({ title, value }: { title: string; value: number }) {
  return <div className="bg-white p-5 rounded-xl border border-slate-200"><p className="text-sm text-slate-500">{title}</p><p className="text-3xl font-bold text-teal-800 mt-2">{value}</p></div>;
}