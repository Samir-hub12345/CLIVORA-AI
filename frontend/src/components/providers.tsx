"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth";
import { RouteAccess } from "@/components/common/role-guard";
import { ConnectivityProvider } from "@/lib/connectivity";
import { NetworkToast } from "@/components/common/network-toast";
import { DevNetworkDebug } from "@/components/common/dev-network-debug";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        <RouteAccess>
          {children}
        </RouteAccess>
        <NetworkToast />
        <DevNetworkDebug />
      </AuthProvider>
    </ConnectivityProvider>
  );
}
