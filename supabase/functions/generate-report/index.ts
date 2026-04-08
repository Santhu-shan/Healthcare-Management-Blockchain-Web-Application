import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claims.claims.sub;
    const { patientId } = await req.json();

    if (!patientId) {
      return new Response(JSON.stringify({ error: 'patientId required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found' }), { status: 404, headers: corsHeaders });
    }

    // Fetch vitals
    const { data: vitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(50);

    // Fetch blockchain transactions
    const { data: transactions } = await supabase
      .from('blockchain_transactions')
      .select('tx_hash, status, verified, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    // Fetch alerts
    const { data: alerts } = await supabase
      .from('alert_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(20);

    const report = {
      generated_at: new Date().toISOString(),
      generated_by: userId,
      patient: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        room_number: patient.room_number,
        diagnosis: patient.diagnosis,
        admission_date: patient.admission_date,
      },
      vitals_summary: {
        total_records: (vitals || []).length,
        latest: vitals?.[0] || null,
        alert_count: (vitals || []).filter((v: any) => v.status === 'ALERT').length,
      },
      blockchain_verification: {
        total_transactions: (transactions || []).length,
        verified_count: (transactions || []).filter((t: any) => t.verified).length,
        tx_hashes: (transactions || []).map((t: any) => t.tx_hash),
      },
      alerts_summary: {
        total: (alerts || []).length,
        unacknowledged: (alerts || []).filter((a: any) => !a.acknowledged).length,
        critical: (alerts || []).filter((a: any) => a.severity === 'critical').length,
      },
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
