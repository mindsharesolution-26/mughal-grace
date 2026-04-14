import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-factory-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-factory-black to-factory-black" />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
              <span className="block">Factory Intelligence</span>
              <span className="block text-primary-400">for Knitting Mills</span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-neutral-400">
              Complete production tracking, inventory management, and business intelligence
              for medium-sized knitting factories. Built for Pakistan's textile industry.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-xl text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-factory"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-xl text-neutral-300 bg-factory-gray hover:bg-factory-light transition-colors border border-factory-border"
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="Yarn Inventory"
              description="Track yarn boxes, cones, and vendor balances with complete weight tracking"
              icon="📦"
            />
            <FeatureCard
              title="Production Tracking"
              description="Monitor machine status, shifts, and daily production logs in real-time"
              icon="🏭"
            />
            <FeatureCard
              title="Roll Lifecycle"
              description="End-to-end tracking from grey stock through dyeing to finished goods"
              icon="🧵"
            />
            <FeatureCard
              title="Dyeing Management"
              description="Track weight gain/loss, vendor performance, and dyeing costs"
              icon="🎨"
            />
            <FeatureCard
              title="Sales & Ledger"
              description="Customer orders, invoicing, and outstanding balance tracking"
              icon="💰"
            />
            <FeatureCard
              title="WhatsApp Reports"
              description="Get daily reports and query data via WhatsApp in Urdu/English"
              icon="📱"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-factory-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-neutral-500 text-sm">
          <p>© 2024 Mughal Grace. Built for Pakistan's textile industry.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-factory-dark border border-factory-border hover:border-primary-500/50 transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-neutral-400 text-sm">{description}</p>
    </div>
  );
}
