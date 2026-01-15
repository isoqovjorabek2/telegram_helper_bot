import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { useUsers, useMessages } from "@/hooks/use-telegram";
import { Users, MessageCircle, Activity, RefreshCw, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Dashboard() {
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useMessages();
  const [search, setSearch] = useState("");

  const handleRefresh = () => {
    refetchUsers();
    refetchMessages();
  };

  const isLoading = usersLoading || messagesLoading;
  
  // Basic Stats
  const totalUsers = users?.length || 0;
  const totalMessages = messages?.length || 0;
  const activeUsers = users?.length || 0; // In a real app, filter by recent activity

  // Filtered Messages
  const recentMessages = messages
    ?.filter(m => 
      m.content?.toLowerCase().includes(search.toLowerCase()) || 
      m.user?.username?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 10) || [];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening with your bot.</p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          className="gap-2 bg-card hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Users" 
          value={totalUsers} 
          icon={Users} 
          trend="+12%"
          description="from last month"
          color="primary"
        />
        <StatCard 
          title="Messages Received" 
          value={totalMessages} 
          icon={MessageCircle} 
          trend="+24%"
          description="active engagement"
          color="accent"
        />
        <StatCard 
          title="Bot Status" 
          value="Online" 
          icon={Activity} 
          description="Uptime: 99.9%"
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Messages Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display">Recent Messages</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                className="pl-9 bg-card border-border/50 focus:bg-background transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {messagesLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading feed...</div>
            ) : recentMessages.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No messages yet</h3>
                <p className="text-muted-foreground mt-1 max-w-xs">
                  Messages sent to your bot will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={msg.id} 
                    className="p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shrink-0">
                        {msg.user?.firstName?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm text-foreground truncate">
                            {msg.user?.firstName} {msg.user?.lastName}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">@{msg.user?.username || "unknown"}</span>
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {msg.createdAt && formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed break-words">
                          {msg.content || <span className="italic text-muted-foreground">Non-text message</span>}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User List Sidebar */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display">Active Users</h2>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-2">
            {usersLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading users...</div>
            ) : (users?.length || 0) === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-1">
                {users?.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-default">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
                      {user.firstName?.[0] || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.languageCode?.toUpperCase() || "EN"} • ID: {user.telegramId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-2 mt-2 pt-2 border-t border-border/50">
              <Button variant="outline" className="w-full text-xs h-9">
                <Send className="w-3 h-3 mr-2" />
                Broadcast Message
              </Button>
            </div>
          </div>
          
          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/10">
            <h3 className="font-bold text-primary mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Check out the documentation to learn how to add more commands to your bot.
            </p>
            <Button className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30">
              Read Docs
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
