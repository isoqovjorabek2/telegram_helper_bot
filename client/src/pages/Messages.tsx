import { Layout } from "@/components/Layout";
import { useMessages } from "@/hooks/use-telegram";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function MessagesPage() {
  const { data: messages, isLoading } = useMessages();
  const [search, setSearch] = useState("");

  const filteredMessages = messages?.filter(m => 
    m.content?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.username?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Full history of messages received by the bot.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search history..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading messages...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="bg-card p-12 rounded-2xl border border-border/50 text-center text-muted-foreground">
            No messages found.
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div key={msg.id} className="bg-card rounded-xl p-4 border border-border/50 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {msg.user?.firstName} {msg.user?.lastName}
                  </span>
                  <span className="text-sm text-muted-foreground">@{msg.user?.username}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {msg.createdAt && format(new Date(msg.createdAt), 'PP pp')}
                </span>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg text-sm text-foreground/90">
                {msg.content || <span className="italic text-muted-foreground">Media content (not displayed)</span>}
              </div>
              <div className="mt-2 text-xs font-mono text-muted-foreground truncate">
                ID: {msg.messageId}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
