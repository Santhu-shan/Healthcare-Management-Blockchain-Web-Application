import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, MessageSquare, Save, Link2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getContractAddress, setContractAddress } from '@/lib/ethereum';

export default function Settings() {
  const { user } = useAuth();
  const { requestPushPermission } = useNotifications();
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contractAddr, setContractAddr] = useState(getContractAddress());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadPrefs();
  }, [user]);

  const loadPrefs = async () => {
    const { data } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user!.id)
      .single();
    if (data) {
      setPushEnabled(data.push_enabled);
      setSmsEnabled(data.sms_enabled);
      setPhoneNumber(data.phone_number || '');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Save contract address to localStorage
    if (contractAddr) setContractAddress(contractAddr);

    const prefs = { user_id: user.id, push_enabled: pushEnabled, sms_enabled: smsEnabled, phone_number: phoneNumber || null };
    const { data: existing } = await (supabase as any).from('notification_preferences').select('id').eq('user_id', user.id).single();
    if (existing) {
      await (supabase as any).from('notification_preferences').update(prefs).eq('user_id', user.id);
    } else {
      await (supabase as any).from('notification_preferences').insert(prefs);
    }
    toast({ title: 'Settings saved' });
    setSaving(false);
  };

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestPushPermission();
      if (!granted) {
        toast({ title: 'Push notifications blocked', description: 'Please enable in browser settings', variant: 'destructive' });
        return;
      }
    }
    setPushEnabled(checked);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" /> Settings
          </h1>
          <p className="text-muted-foreground">Configure notifications and blockchain integration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Smart Contract</CardTitle>
            <CardDescription>Set the deployed HybridPatientMonitor contract address (Sepolia)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract">Contract Address</Label>
              <Input
                id="contract"
                placeholder="0x..."
                value={contractAddr}
                onChange={e => setContractAddr(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Deploy HybridPatientMonitor.sol via Remix, then paste the address here.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Push Notifications</CardTitle>
            <CardDescription>Receive browser notifications for alerts and tamper detection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push">Enable browser push notifications</Label>
              <Switch id="push" checked={pushEnabled} onCheckedChange={handlePushToggle} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> SMS Notifications</CardTitle>
            <CardDescription>Receive SMS alerts for critical events (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sms">Enable SMS notifications</Label>
              <Switch id="sms" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
            </div>
            {smsEnabled && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number (with country code)</Label>
                <Input id="phone" placeholder="+1234567890" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </Layout>
  );
}