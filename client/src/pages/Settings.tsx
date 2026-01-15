import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your dashboard and bot preferences.</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Bot Configuration</CardTitle>
            <CardDescription>Manage how your bot behaves and responds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-name">Bot Name</Label>
              <Input id="bot-name" defaultValue="MyTelegramBot" />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable bot responses.
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Log Debug Data</Label>
                <p className="text-sm text-muted-foreground">
                  Store full raw JSON payloads from Telegram.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
          <div className="p-6 pt-0">
             <Button>Save Changes</Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>Manage your Telegram Bot Token.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid gap-2">
               <Label htmlFor="token">Bot Token</Label>
               <Input id="token" type="password" value="72813:AAExxxxxx....." disabled />
               <p className="text-xs text-muted-foreground">Token is managed via environment variables.</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
