"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth";
import { ConnectivityProvider } from "@/lib/connectivity";
import { NetworkToast } from "@/components/common/network-toast";
import { DevNetworkDebug } from "@/components/common/dev-network-debug";

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        {children}
        <NetworkToast />
        <DevNetworkDebug />
      </AuthProvider>
    </ConnectivityProvider>
  );
};
