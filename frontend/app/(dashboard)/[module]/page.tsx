"use client";

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { use } from 'react';

export default function StubPage({ params }: { params: Promise<{ module: string }> }) {
  const resolvedParams = use(params);

  // Try to parse the module name, handling URL encoding just in case
  let moduleName = 'Module';
  try {
    const decoded = decodeURIComponent(resolvedParams.module);
    moduleName = decoded.charAt(0).toUpperCase() + decoded.slice(1);
  } catch (e) {
    moduleName = resolvedParams.module;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-[18px] border border-[var(--border-strong)] bg-[var(--card)] flex items-center justify-center text-[var(--color-electric-cyan)] shadow-lg">
        <LayoutDashboard size={32} />
      </div>
      <div>
        <div className="text-2xl font-extrabold tracking-tight mb-2">{moduleName}</div>
        <div className="text-[13px] text-[var(--foreground-variant)] font-medium max-w-[380px] mx-auto">
          This feature is currently under development. Please check back later for updates.
        </div>
      </div>
      <Link 
        href="/"
        className="mt-2 px-[18px] py-[10px] rounded-[10px] border border-[var(--border-strong)] bg-[rgba(128,128,128,0.05)] text-[var(--foreground)] text-[12.5px] font-bold hover:border-[#9d7cff] transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
