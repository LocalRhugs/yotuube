import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { Youtube, Facebook, Instagram, Eye, Users, TrendingUp, Video, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getFacebookPages, getPageInsights, getInstagramAccount } from "@/lib/facebook-api";

const Dashboard = () => {
  const [fbData, setFbData] = useState<{ pages: number; followers: number }>({ pages: 0, followers: 0 });
  const [igData, setIgData] = useState<{ accounts: number; followers: number }>({ accounts: 0, followers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getFacebookPages();
      if (res.success && res.data?.data) {
        const pages = res.data.data;
        let totalFbFollowers = 0;
        let igAccounts = 0;
        let totalIgFollowers = 0;

        for (const page of pages) {
          totalFbFollowers += page.fan_count || 0;
          const igRes = await getInstagramAccount(page.id);
          if (igRes.success && igRes.data?.instagram_business_account) {
            igAccounts++;
            totalIgFollowers += igRes.data.instagram_business_account.followers_count || 0;
          }
        }

        setFbData({ pages: pages.length, followers: totalFbFollowers });
        setIgData({ accounts: igAccounts, followers: totalIgFollowers });
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your content across all platforms</p>
      </motion.div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* YouTube - placeholder until connected */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-youtube">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">YouTube</h3>
              <p className="text-xs text-muted-foreground">Not connected</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Connect your Google account to manage YouTube channels</p>
        </motion.div>

        {/* Facebook - live data */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-facebook">
              <Facebook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Facebook</h3>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading..." : `${fbData.pages} page${fbData.pages !== 1 ? 's' : ''} connected`}
              </p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{fbData.followers.toLocaleString()} followers</span>
              <span className="text-success">● Active</span>
            </div>
          )}
        </motion.div>

        {/* Instagram - live data */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-instagram">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Instagram</h3>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading..." : igData.accounts > 0 ? `${igData.accounts} account${igData.accounts !== 1 ? 's' : ''} linked` : "No accounts linked"}
              </p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : igData.accounts > 0 ? (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{igData.followers.toLocaleString()} followers</span>
              <span className="text-success">● Active</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Link an Instagram Business account to a Facebook page</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
