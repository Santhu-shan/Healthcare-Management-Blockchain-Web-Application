import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrityAlertPayload {
  txHash: string;
  patientId: string;
  expectedHash: string;
  actualHash: string;
  detectedAt: string;
  recipientEmail?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured - email notifications disabled');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email notifications not configured. Add RESEND_API_KEY to enable.',
          emailSent: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload: IntegrityAlertPayload = await req.json();
    
    console.log('Received integrity alert:', {
      txHash: payload.txHash,
      patientId: payload.patientId,
      detectedAt: payload.detectedAt,
    });

    // Default recipient email - in production, this would come from user settings
    const recipientEmail = payload.recipientEmail || 'admin@example.com';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .hash { font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px; word-break: break-all; font-size: 12px; }
            .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Data Integrity Alert</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>Critical:</strong> A blockchain data integrity violation has been detected. 
                This may indicate unauthorized data modification or tampering.
              </div>
              
              <h3>Alert Details</h3>
              <p><strong>Patient ID:</strong> ${payload.patientId}</p>
              <p><strong>Transaction Hash:</strong></p>
              <div class="hash">${payload.txHash}</div>
              
              <p><strong>Detected At:</strong> ${new Date(payload.detectedAt).toLocaleString()}</p>
              
              <h3>Hash Mismatch</h3>
              <p><strong>Expected Hash (On-Chain):</strong></p>
              <div class="hash">${payload.expectedHash}</div>
              
              <p><strong>Actual Hash (Local Data):</strong></p>
              <div class="hash">${payload.actualHash}</div>
              
              <a href="https://sepolia.etherscan.io/tx/${payload.txHash}" class="btn">
                View on Etherscan
              </a>
            </div>
            <div class="footer">
              <p>This is an automated alert from IPMS Blockchain Healthcare System</p>
              <p>Please investigate this incident immediately.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'IPMS Alerts <alerts@resend.dev>',
        to: [recipientEmail],
        subject: `🚨 Data Integrity Alert - Patient ${payload.patientId.slice(0, 8)}...`,
        html: emailHtml,
      }),
    });

    const responseData = await res.json();
    
    if (!res.ok) {
      console.error('Resend API error:', responseData);
      throw new Error(responseData.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Integrity alert email sent',
        emailId: responseData.id,
        emailSent: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending integrity alert:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        emailSent: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
