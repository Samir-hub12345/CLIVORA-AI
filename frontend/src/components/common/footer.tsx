import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4">
        <p>© {new Date().getFullYear()} Clinova AI. Clinical Decision Support System. Confidential & Secure.</p>
      </div>
    </footer>
  );
};
