import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-shopnavy border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-shopblue flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <span className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-widest block mb-1">
          404 ERROR
        </span>
        <h1 className="text-2xl font-black text-white mb-2">Page Not Found</h1>
        <p className="text-xs text-slate-400 mb-6 font-sans">
          The requested route does not exist or has moved. Return to safety via the dashboard.
        </p>
        <Link
          to="/dashboard"
          className="w-full py-3 rounded-xl bg-shopblue hover:bg-shopblue-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

