'use client';

import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 lg:p-8 xl:p-10 pt-20 md:pt-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

