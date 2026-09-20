"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LogOut, Menu, X, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { dashboardPath, navigationByRole } from "@/lib/permissions";

export function Header() {
  const pathname = usePathname(); const { user, logout } = useAuth();
  const [open, setOpen] = useState(false); const [lowBandwidth, setLowBandwidth] = useState(false);
  useEffect(() => {
    const enabled = localStorage.getItem("clinova_low_bandwidth") === "true";
    setLowBandwidth(enabled); document.documentElement.classList.toggle("low-bandwidth", enabled);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  const items = user ? navigationByRole[user.role] || [] : [
    { label: "Home", href: "/" }, { label: "Demo examples", href: "/demo" },
  ];
  const links = items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
    aria-current={pathname === item.href ? "page" : undefined}
    className={"px-3 py-2 rounded-lg text-xs font-semibold " + (pathname === item.href ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50")}>{item.label}</Link>);
  return <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 min-h-16 flex items-center justify-between gap-3 py-3">
      <Link href={user ? dashboardPath(user.role) : "/"} className="flex items-center gap-2 shrink-0">
        <span className="p-2 bg-teal-600 rounded-xl text-white"><Activity className="h-5 w-5" /></span>
        <span className="font-black tracking-tight text-lg">CLINOVA <span className="text-teal-700">AI</span></span>
      </Link>
      <nav aria-label="Main navigation" className="hidden xl:flex items-center gap-1">{links}</nav>
      <div className="flex items-center gap-2">
        <button aria-label="Toggle low bandwidth mode" aria-pressed={lowBandwidth} onClick={() => {
          const enabled = !lowBandwidth; setLowBandwidth(enabled);
          localStorage.setItem("clinova_low_bandwidth", String(enabled));
          document.documentElement.classList.toggle("low-bandwidth", enabled);
        }} className={"hidden sm:inline-flex p-2 rounded-lg " + (lowBandwidth ? "bg-amber-100 text-amber-900" : "text-slate-500")}><WifiOff size={16} /></button>
        {user ? <>
          <div className="hidden sm:block text-right"><div className="text-xs font-semibold max-w-36 truncate">{user.full_name}</div><div className="text-[10px] uppercase text-teal-700">{user.role}</div></div>
          <button onClick={logout} aria-label="Sign out" title="Sign out" className="p-2 text-slate-600 hover:bg-rose-50 rounded-lg"><LogOut size={18} /></button>
        </> : <Link href="/login" className="bg-teal-700 text-white text-xs px-4 py-2 rounded-lg">Sign in</Link>}
        <button aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" className="xl:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="xl:hidden border-t p-3 flex flex-col">{links}</nav>}
  </header>;
}