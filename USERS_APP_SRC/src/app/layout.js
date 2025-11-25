import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Gambino Users • Farm Luck, Mine Destiny',
  description: 'User onboarding, dashboards, and leaderboard for Gambino.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-neutral-100 relative">
        {/* Reduced global floating particles for mobile performance */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40 md:opacity-60">
          {/* Minimal particles that won't affect mobile scrolling */}
          <div className="absolute top-10 left-[10%] w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-400/20 md:bg-yellow-400/30 rounded-full animate-pulse delay-0"></div>
          <div className="absolute top-20 right-[15%] w-1 h-1 md:w-1.5 md:h-1.5 bg-amber-300/25 md:bg-amber-300/40 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-[30%] left-[20%] w-1.5 h-1.5 md:w-2.5 md:h-2.5 bg-yellow-500/15 md:bg-yellow-500/25 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute top-[60%] left-[30%] w-1 h-1 md:w-1.5 md:h-1.5 bg-yellow-300/20 md:bg-yellow-300/30 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-20 left-[15%] w-1.5 h-1.5 md:w-2.5 md:h-2.5 bg-amber-500/20 md:bg-amber-500/30 rounded-full animate-pulse delay-2500"></div>
          
          {/* Micro sparkles - hidden on small screens */}
          <div className="hidden md:block absolute top-[25%] left-[50%] w-1 h-1 bg-yellow-200/40 rounded-full animate-ping" style={{animationDuration: '3s', animationDelay: '0.5s'}}></div>
          <div className="hidden md:block absolute top-[70%] left-[60%] w-1 h-1 bg-amber-200/40 rounded-full animate-ping" style={{animationDuration: '2.5s', animationDelay: '1.2s'}}></div>
        </div>

        {/* Simplified background shapes for mobile */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-30 md:opacity-60">
          {/* Mobile-optimized gradient orbs */}
          <div className="absolute -top-20 -right-20 md:-top-40 md:-right-40 w-48 h-48 md:w-80 md:h-80 bg-gradient-to-br from-yellow-500/6 md:from-yellow-500/8 to-amber-600/3 md:to-amber-600/4 rounded-full blur-2xl md:blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 md:-bottom-40 md:-left-40 w-40 h-40 md:w-72 md:h-72 bg-gradient-to-tr from-amber-600/8 md:from-amber-600/10 to-yellow-500/3 md:to-yellow-500/4 rounded-full blur-2xl md:blur-3xl"></div>
          
          {/* Minimal grid overlay - much lighter on mobile */}
          <div className="absolute inset-0 opacity-[0.02] md:opacity-[0.08]">
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(234, 179, 8, 0.25) 1px, transparent 0)',
                backgroundSize: '60px 60px'
              }}
            ></div>
          </div>
          
          {/* Geometric shapes - hidden on mobile to improve performance */}
          <div className="hidden md:block absolute top-1/3 left-1/5 w-16 h-16 border border-yellow-500/8 rounded-lg rotate-45 animate-spin" style={{animationDuration: '30s'}}></div>
        </div>

        {/* App content with proper mobile handling */}
        <div className="relative z-10 min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}