import { Link, NavLink, Outlet } from "react-router-dom";
import { Cloud, Search } from "lucide-react";
import CookieConsent from "./CookieConsent";
import PublicRouteSeo from "./PublicRouteSeo";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/smart-links", label: "Smart Links" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/social-media-glossary", label: "Glossary" },
  { to: "/category/monetization", label: "Guides" },
  { to: "/about", label: "About" },
];

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-100">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Creator Cloud</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? "text-white" : "text-gray-400 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/?q="
              className="hidden sm:inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              aria-label="Search articles"
            >
              <Search className="w-4 h-4" />
            </Link>
            <Link
              to="/signin"
              className="hidden sm:inline-flex text-sm font-medium text-gray-300 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
        <PublicRouteSeo />
      </main>

      <footer className="border-t border-white/5 bg-[#070707] mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Cloud className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold">Creator Cloud</span>
            </div>
            <p className="text-gray-500 leading-relaxed">
              Smart-link unlock tools plus practical creator economy guides for YouTubers, social creators,
              podcasters, and indie founders.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-300">Sections</h4>
            <ul className="space-y-2 text-gray-500">
              <li><Link to="/category/youtube" className="hover:text-white">YouTube</Link></li>
              <li><Link to="/category/tiktok" className="hover:text-white">TikTok</Link></li>
              <li><Link to="/category/monetization" className="hover:text-white">Monetization</Link></li>
              <li><Link to="/category/tools" className="hover:text-white">Tools</Link></li>
              <li><Link to="/category/growth" className="hover:text-white">Growth</Link></li>
              <li><Link to="/category/analytics" className="hover:text-white">Analytics</Link></li>
              <li><Link to="/category/newsletter" className="hover:text-white">Newsletter</Link></li>
              <li><Link to="/smart-links" className="hover:text-white">Smart Links</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white">How it works</Link></li>
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/social-media-glossary" className="hover:text-white">Glossary</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-300">Company</h4>
            <ul className="space-y-2 text-gray-500">
              <li><Link to="/about" className="hover:text-white">About</Link></li>
              <li><Link to="/editorial-policy" className="hover:text-white">Editorial Policy</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><a href="/sitemap.xml" className="hover:text-white">Sitemap</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-300">Legal</h4>
            <ul className="space-y-2 text-gray-500">
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link to="/dmca" className="hover:text-white">DMCA / Copyright</Link></li>
              <li><Link to="/disclosure" className="hover:text-white">Ad Disclosure</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-gray-600">
            <span>© {new Date().getFullYear()} Creator Cloud. All rights reserved.</span>
            <span>
              We may earn a commission when you click affiliate links. Editorial is independent.
            </span>
          </div>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
}
