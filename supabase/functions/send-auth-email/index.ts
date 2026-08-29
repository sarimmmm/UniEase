// Supabase Auth "Send Email" Hook target.
//
// Supabase Auth calls this function (instead of its own rate-limited
// built-in mailer) for every outgoing auth email -- signup, magic link,
// recovery, email change, reauthentication. Supabase gives the whole
// hook call a hard 5-second wall-clock budget, run inside the same
// transaction as the auth operation itself -- if the budget is missed,
// the entire signup/recovery/etc. is rolled back, not just the email.
//
// The real email delivery chain here (n8n, self-hosted, can cold-start
// -> Gmail API -> back) routinely blows past 5 seconds on its own. So:
// verify the signature (fast, no network), ack Supabase immediately,
// and do the actual n8n call as a background task via
// EdgeRuntime.waitUntil() -- the documented Supabase pattern for
// "ack fast, keep working". Supabase's timeout now only ever measures
// the signature check, never n8n's latency, so a cold n8n instance can
// no longer fail a signup.
//
// Required secret (set via `supabase secrets set` or the dashboard):
//   SEND_EMAIL_HOOK_SECRET -- from Authentication > Hooks > Send Email Hook

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const N8N_WEBHOOK_URL = 'https://aliasgharcs0-n8n-management.hf.space/webhook/uniease-auth-send-email';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 405 });
  }

  const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  try {
    const wh = new Webhook(hookSecret);
    wh.verify(payload, headers);
  } catch (err) {
    console.error('Send Email Hook signature verification failed', err);
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: 'Invalid webhook signature' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Forward the exact signed request on to n8n so its own signature
  // verification node (checking the same secret, 5-minute timestamp
  // tolerance) accepts it unchanged -- no need to re-sign.
  const forwardToN8n = async () => {
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'webhook-id': headers['webhook-id'] ?? '',
          'webhook-timestamp': headers['webhook-timestamp'] ?? '',
          'webhook-signature': headers['webhook-signature'] ?? '',
        },
        body: payload,
      });
      if (!n8nResponse.ok) {
        const detail = await n8nResponse.text().catch(() => '');
        throw new Error(`n8n webhook returned ${n8nResponse.status}: ${detail}`);
      }
    } catch (err) {
      console.error('Failed to forward auth email to n8n', err);
    }
  };

  // @ts-ignore -- EdgeRuntime is a Supabase Edge Functions global, not in Deno's own lib types.
  EdgeRuntime.waitUntil(forwardToN8n());

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
