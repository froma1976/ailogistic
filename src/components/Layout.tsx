import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-white shadow-sm">
                    <h1 className="text-xl font-bold text-slate-800">FERLOGISTIC</h1>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded hover:bg-slate-100">
                        <Menu size={24} />
                    </button>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
