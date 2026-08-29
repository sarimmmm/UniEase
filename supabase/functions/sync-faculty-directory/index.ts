// Daily faculty directory sync.
//
// Scheduled via pg_cron + pg_net every 24 hours. Discovers every
// department page linked from the FAST-NUCES Multan homepage nav
// (https://mtn.nu.edu.pk/school-*/ and /department-*/), scrapes each
// one's faculty grid, and adds any faculty member (matched by email)
// not already in the `faculty` table.
//
// Deliberately add-only: it never overwrites name/department/office_hours
// on an existing row, so it can't silently undo an admin's manual edit or
// removal made through /admin/faculty (e.g. the campus director, who is
// intentionally excluded below and would otherwise get re-added on every
// run since he's still listed on the live CS department page).
//
// Auth: this function is invoked only by our own pg_cron job, not by
// end users, so it checks a shared secret header instead of a Supabase
// JWT (verify_jwt is disabled for it, same as send-auth-email).
//   Required secret: FACULTY_SYNC_SECRET

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const HOMEPAGE_URL = 'https://mtn.nu.edu.pk/';
const DEFAULT_CAMPUS = 'Multan';
const DEFAULT_OFFICE_HOURS = 'By appointment — contact via email';

// Faculty intentionally excluded from the public directory even though
// they're listed on the source site (e.g. leadership, not teaching staff).
const EXCLUDED_EMAILS = new Set<string>([
  'shahzad.sarfraz@nu.edu.pk', // campus director
]);

interface ScrapedFaculty {
  name: string;
  email: string;
  department: string;
}

function discoverDepartmentUrls(homepageHtml: string): string[] {
  const matches = homepageHtml.matchAll(/href="(https:\/\/mtn\.nu\.edu\.pk\/(?:school|department)-[a-z]+\/?)"/g);
  const urls = new Set<string>();
  for (const m of matches) urls.add(m[1]);
  return Array.from(urls);
}

function extractDepartmentName(pageHtml: string, fallbackUrl: string): string {
  const titleMatch = pageHtml.match(/<title>\s*Department of ([^–\-|]+)[–\-|]/i);
  if (titleMatch) return titleMatch[1].replace(/\s+/g, ' ').trim();
  return fallbackUrl.replace(/^https?:\/\/[^/]+\//, '').replace(/[/-]/g, ' ').trim();
}

function extractFaculty(pageHtml: string, department: string): ScrapedFaculty[] {
  const results: ScrapedFaculty[] = [];
  const blocks = pageHtml.split('unitech-teacher__thumb').slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/<h4>\s*<a[^>]*>([^<]+)<\/a>/);
    const emailMatch = block.match(/([a-zA-Z0-9._%+-]+@nu\.edu\.pk)/i);
    if (!nameMatch || !emailMatch) continue;
    const name = nameMatch[1].replace(/\s+/g, ' ').trim();
    const email = emailMatch[1].toLowerCase();
    if (!name || EXCLUDED_EMAILS.has(email)) continue;
    results.push({ name, email, department });
  }
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('FACULTY_SYNC_SECRET') ?? '';
  const providedSecret = req.headers.get('x-sync-secret') ?? '';
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const log: string[] = [];
  let scraped: ScrapedFaculty[] = [];

  try {
    const homepageRes = await fetch(HOMEPAGE_URL);
    const homepageHtml = await homepageRes.text();
    const departmentUrls = discoverDepartmentUrls(homepageHtml);
    log.push(`Discovered ${departmentUrls.length} department page(s): ${departmentUrls.join(', ')}`);

    for (const url of departmentUrls) {
      try {
        const res = await fetch(url);
        const html = await res.text();
        const department = extractDepartmentName(html, url);
        const faculty = extractFaculty(html, department);
        log.push(`${url} -> "${department}": ${faculty.length} faculty found`);
        scraped = scraped.concat(faculty);
      } catch (err) {
        log.push(`Failed to fetch/parse ${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch homepage',
      detail: err instanceof Error ? err.message : String(err),
      log,
    }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const { data: existing, error: existingError } = await supabase
    .from('faculty')
    .select('email, display_order');
  if (existingError) {
    return new Response(JSON.stringify({ error: existingError.message, log }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existingEmails = new Set((existing ?? []).map((f) => f.email.toLowerCase()));
  let nextOrder = Math.max(0, ...(existing ?? []).map((f) => f.display_order ?? 0)) + 1;

  const toInsert = [];
  for (const f of scraped) {
    if (existingEmails.has(f.email)) continue;
    existingEmails.add(f.email); // dedupe within this run too
    toInsert.push({
      name: f.name,
      department: f.department,
      email: f.email,
      office_hours: DEFAULT_OFFICE_HOURS,
      campus: DEFAULT_CAMPUS,
      display_order: nextOrder++,
    });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('faculty').insert(toInsert);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message, log }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  log.push(`Added ${toInsert.length} new faculty member(s): ${toInsert.map((f) => f.name).join(', ') || 'none'}`);

  return new Response(JSON.stringify({ success: true, added: toInsert.length, log }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
