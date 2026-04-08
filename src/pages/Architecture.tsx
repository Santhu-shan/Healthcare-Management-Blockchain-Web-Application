import { Cpu, Database, Monitor, Radio } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  { icon: Radio, title: 'IoT Sensors', desc: 'Wearable devices capture patient vitals (heart rate, temperature, SpO₂) in real-time.', color: 'bg-warning/20 text-warning' },
  { icon: Cpu, title: 'Intelligence Layer', desc: 'AI algorithms analyze vitals against thresholds, detecting anomalies instantly.', color: 'bg-primary/20 text-primary' },
  { icon: Database, title: 'Blockchain Layer', desc: 'Records are immutably stored using hybrid consensus for fast, energy-efficient validation.', color: 'bg-block/20 text-block' },
  { icon: Monitor, title: 'Doctor Dashboard', desc: 'Healthcare providers view real-time data, alerts, and patient history securely.', color: 'bg-success/20 text-success' },
];

export default function Architecture() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">System Architecture</h1>
          <p className="text-muted-foreground">End-to-end data flow from IoT sensors to secure dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <Card key={step.title} className="relative">
              {i < steps.length - 1 && <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border z-10" />}
              <CardHeader className="pb-2">
                <div className={`h-12 w-12 rounded-xl ${step.color} flex items-center justify-center mb-2`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Hybrid Consensus Mechanism</CardTitle></CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <p>This system uses a <strong>Practical Byzantine Fault Tolerance (PBFT)</strong> inspired hybrid consensus:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Permissioned Network:</strong> Only pre-authorized hospital nodes participate</li>
              <li><strong>Fast Validation:</strong> ~50ms consensus vs minutes for PoW</li>
              <li><strong>Energy Efficient:</strong> No mining required, suitable for healthcare infrastructure</li>
              <li><strong>Fault Tolerant:</strong> System remains operational if minority of nodes fail</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
