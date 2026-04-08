import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { patientId, alertMessage, severity } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get doctors assigned to this patient with SMS enabled
    const { data: assignments } = await supabase
      .from('patient_doctor_assignments')
      .select('doctor_id')
      .eq('patient_id', patientId);

    if (!assignments?.length) {
      return new Response(JSON.stringify({ message: 'No assigned doctors' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const doctorIds = assignments.map(a => a.doctor_id);
    const { data: doctors } = await supabase
      .from('doctors')
      .select('user_id')
      .in('id', doctorIds);

    const userIds = doctors?.map(d => d.user_id).filter(Boolean) || [];

    // Check notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', userIds)
      .eq('sms_enabled', true);

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER');

    const results: string[] = [];

    if (twilioSid && twilioAuth && twilioFrom && prefs?.length) {
      for (const pref of prefs) {
        if (!(pref as any).phone_number) continue;
        try {
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: (pref as any).phone_number,
              From: twilioFrom,
              Body: `[IPMS ${severity}] ${alertMessage}`,
            }),
          });
          results.push(`SMS sent to ${(pref as any).phone_number}: ${resp.status}`);
        } catch (e) {
          results.push(`SMS failed: ${e.message}`);
        }
      }
    } else {
      results.push('Twilio not configured or no SMS-enabled users');
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
