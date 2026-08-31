import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import PublicLayout from "./components/PublicLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PasswordGate from "./components/PasswordGate";
import AdSenseScript from "./components/AdSenseScript";


// Public site
import HomePage from "./pages/HomePage";
import BlogPostPage from "./pages/BlogPostPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import DMCAPage from "./pages/DMCAPage";
import DisclosurePage from "./pages/DisclosurePage";
import EditorialPolicyPage from "./pages/EditorialPolicyPage";
import SmartLinksPage from "./pages/SmartLinksPage";
import SocialMediaGlossaryPage from "./pages/SocialMediaGlossaryPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import PricingPage from "./pages/PricingPage";

// Bridge & callback (kept noindex via robots.txt)
import UnlockYouTubePage from "./pages/UnlockYouTubePage";
import UnlockFacebookPage from "./pages/UnlockFacebookPage";
import ShortRedirectPage from "./pages/ShortRedirectPage";
import YouTubeCallbackPage from "./pages/YouTubeCallbackPage";
import ArticleUnlockPage from "./pages/ArticleUnlockPage";

// Admin dashboard (gated)
import Index from "./pages/Index";
import UploadPage from "./pages/UploadPage";
import BulkUploadPage from "./pages/BulkUploadPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SocialPage from "./pages/SocialPage";
import SettingsPage from "./pages/SettingsPage";
import MyVideosPage from "./pages/MyVideosPage";
import IgAutoReplyPage from "./pages/IgAutoReplyPage";
import TwitterPage from "./pages/TwitterPage";
import ThreadsPage from "./pages/ThreadsPage";
import FacebookAutoPostPage from "./pages/FacebookAutoPostPage";

// User-facing auth + dashboard
import SignInPage from "./pages/SignInPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import UserAuthGate from "./components/UserAuthGate";
import OAuthConsentPage from "./pages/OAuthConsentPage";


import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Gated = ({ children }: { children: React.ReactNode }) => (
  <PasswordGate>{children}</PasswordGate>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AdSenseScript />
        <Routes>
            {/* Public blog */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:category" element={<HomePage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/dmca" element={<DMCAPage />} />
              <Route path="/disclosure" element={<DisclosurePage />} />
              <Route path="/editorial-policy" element={<EditorialPolicyPage />} />
              <Route path="/smart-links" element={<SmartLinksPage />} />
              <Route path="/social-media-glossary" element={<SocialMediaGlossaryPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/pricing" element={<PricingPage />} />
            </Route>

            {/* Bridge / unlock pages — noindex via robots, kept outside PublicLayout */}
            <Route path="/u/fb/:postId" element={<UnlockFacebookPage />} />
            <Route path="/u/:videoId" element={<UnlockYouTubePage />} />
            <Route path="/article/:id" element={<ArticleUnlockPage />} />
            <Route path="/s/:code" element={<ShortRedirectPage />} />
            <Route path="/youtube-callback" element={<YouTubeCallbackPage />} />

            {/* User sign-in + dashboard (any Google account) */}
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignInPage />} />
            <Route path="/dashboard" element={<UserAuthGate><UserDashboardPage /></UserAuthGate>} />

            {/* OAuth 2.1 consent screen for MCP clients */}
            <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />



            {/* Password-gated admin dashboard (COMBO_WICK only) */}
            <Route path="/admin" element={<Gated><AppLayout /></Gated>}>
              <Route index element={<Index />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="bulk-upload" element={<BulkUploadPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="social" element={<SocialPage />} />
              <Route path="my-videos" element={<MyVideosPage />} />
              <Route path="ig-auto-reply" element={<IgAutoReplyPage />} />
              <Route path="twitter" element={<TwitterPage />} />
              <Route path="threads" element={<ThreadsPage />} />
              <Route path="fb-auto-post" element={<FacebookAutoPostPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
