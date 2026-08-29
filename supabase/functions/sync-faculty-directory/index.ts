// Faculty directory sync -- all 5 scrapeable FAST-NUCES campuses.
//
// Scheduled via pg_cron + pg_net every 30 days. Each campus's site uses a
// completely different WordPress/theme, so each gets its own small parser
// below rather than one generic one. islamabad (isb.nu.edu.pk) is
// deliberately excluded -- it serves broken/cloaked output to non-browser
// clients and isn't reliably scrapeable (or safe to scrape).
//
// Deliberately add-only: it never overwrites name/department/office_hours
// on an existing row (matched by email), so it can't silently undo an
// admin's manual edit or removal made through /admin/faculty (e.g. the
// Multan campus director, who is still listed on the live CS page and is
// excluded below so he doesn't get re-added on every run).
//
// Auth: invoked only by our own pg_cron job, not by end users, so it
// checks a shared secret header instead of a Supabase JWT (verify_jwt is
// disabled for it, same as send-auth-email).
//   Required secret: FACULTY_SYNC_SECRET

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const DEFAULT_CAMPUS_OFFICE = 'By appointment — contact via email';

// Faculty intentionally excluded from the public directory even though
// they're listed on a source site (e.g. leadership, not teaching staff).
const EXCLUDED_EMAILS = new Set<string>([
  'shahzad.sarfraz@nu.edu.pk', // Multan campus director
]);

const GENERIC_EMAIL = /^(admissions|info|contact|registrar|careers|hr|it|helpdesk)[.@]/i;

interface ScrapedFaculty {
  name: string;
  email: string;
  department: string;
  campus: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}

// -- Multan + Chiniot-Faisalabad: "unitech-teacher" WordPress theme --
// Department pages are auto-discovered from each campus homepage's nav
// (/school-*/, /department-*/), so a newly added department is picked up
// automatically without a code change here.
async function scrapeUnitechCampus(homepageUrl: string, campus: string, log: string[]): Promise<ScrapedFaculty[]> {
  const results: ScrapedFaculty[] = [];
  const homepageHtml = await fetchText(homepageUrl);
  const origin = new URL(homepageUrl).origin;
  const urls = new Set<string>();
  for (const m of homepageHtml.matchAll(/href="(https:\/\/[a-z0-9.]+\.nu\.edu\.pk\/(?:school|department)-[a-z]+\/?)"/gi)) {
    if (m[1].startsWith(origin)) urls.add(m[1]);
  }
  log.push(`[${campus}] discovered ${urls.size} department page(s)`);

  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const titleMatch = html.match(/<title>\s*Department of ([^–\-|]+)[–\-|]/i);
      const department = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : url;
      const blocks = html.split('unitech-teacher__thumb').slice(1);
      let found = 0;
      for (const block of blocks) {
        const nameMatch = block.match(/<h4>\s*<a[^>]*>([^<]+)<\/a>/);
        const emailMatch = block.match(/([a-zA-Z0-9._%+-]+@nu\.edu\.pk)/i);
        if (!nameMatch || !emailMatch) continue;
        const name = nameMatch[1].replace(/\s+/g, ' ').trim();
        const email = emailMatch[1].toLowerCase();
        if (!name || EXCLUDED_EMAILS.has(email) || GENERIC_EMAIL.test(email)) continue;
        results.push({ name, email, department, campus });
        found++;
      }
      log.push(`[${campus}] ${url} -> "${department}": ${found} faculty`);
    } catch (err) {
      log.push(`[${campus}] failed ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}

// -- Peshawar: "faculty-list" / "faculty-member" theme --
// No reliable nav discovery; department pages follow a known
// <slug>-faculty naming convention.
async function scrapePeshawar(log: string[]): Promise<ScrapedFaculty[]> {
  const departments: Record<string, string> = {
    ce: 'Computer Engineering',
    cs: 'Computer Science',
    ee: 'Electrical Engineering',
    sh: 'Science and Humanities',
  };
  const results: ScrapedFaculty[] = [];
  for (const [slug, department] of Object.entries(departments)) {
    try {
      const html = await fetchText(`https://pwr.nu.edu.pk/${slug}-faculty`);
      const blocks = html.split('faculty-member').slice(1);
      let found = 0;
      for (const block of blocks) {
        const nameMatch = block.match(/<h2>\s*<a[^>]*>([^<]+)<\/a>/);
        const emailMatch = block.match(/([a-zA-Z0-9._%+-]+@nu\.edu\.pk)/i);
        if (!nameMatch || !emailMatch) continue;
        const name = nameMatch[1].replace(/\s+/g, ' ').trim();
        const email = emailMatch[1].toLowerCase();
        if (!name || EXCLUDED_EMAILS.has(email) || GENERIC_EMAIL.test(email)) continue;
        results.push({ name, email, department, campus: 'Peshawar' });
        found++;
      }
      log.push(`[Peshawar] ${slug}-faculty -> "${department}": ${found} faculty`);
    } catch (err) {
      log.push(`[Peshawar] failed ${slug}-faculty: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}

// -- Karachi: "gdlr-core-personnel-list" (Kingster) theme --
async function scrapeKarachi(log: string[]): Promise<ScrapedFaculty[]> {
  const pages: Record<string, string> = {
    'faculty-php': 'Computer Science',
    'department-of-artificial-intelligence': 'Artificial Intelligence',
    'department-of-cyber-security': 'Cyber Security',
    'department-of-electrical-engineering': 'Electrical Engineering',
    'department-of-management-sciences': 'Management Sciences',
    'department-of-sciences-humanities': 'Sciences and Humanities',
    'department-of-software-engineering': 'Software Engineering',
  };
  const results: ScrapedFaculty[] = [];
  for (const [slug, department] of Object.entries(pages)) {
    try {
      const html = await fetchText(`https://khi.nu.edu.pk/${slug}/`);
      const blocks = html.split('gdlr-core-personnel-list-column').slice(1);
      let found = 0;
      for (const block of blocks) {
        const nameMatch = block.match(/gdlr-core-personnel-list-title[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
        const emailMatch = block.match(/kingster-type-email[^>]*>[\s\S]*?([a-zA-Z0-9._%+-]+@nu\.edu\.pk)/i);
        if (!nameMatch || !emailMatch) continue;
        const name = nameMatch[1].replace(/\s+/g, ' ').replace(/\s*,\s*$/, '').trim();
        const email = emailMatch[1].toLowerCase();
        if (!name || EXCLUDED_EMAILS.has(email) || GENERIC_EMAIL.test(email)) continue;
        results.push({ name, email, department, campus: 'Karachi' });
        found++;
      }
      log.push(`[Karachi] ${slug} -> "${department}": ${found} faculty`);
    } catch (err) {
      log.push(`[Karachi] failed ${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}

// -- Lahore: "facultyCard" theme, one consolidated page, no department
// attribution available in the source markup -- everyone lands under the
// generic "Faculty" bucket.
async function scrapeLahore(log: string[]): Promise<ScrapedFaculty[]> {
  const results: ScrapedFaculty[] = [];
  try {
    const html = await fetchText('https://lhr.nu.edu.pk/faculty/');
    const blocks = html.split('facultyCard').slice(1);
    let found = 0;
    for (const block of blocks) {
      const nameMatch = block.match(/<h5[^>]*>\s*([^<]+?)\s*<\/h5>/);
      const emailMatch = block.match(/([a-zA-Z0-9._%+-]+@nu\.edu\.pk)/i);
      if (!nameMatch || !emailMatch) continue;
      const name = nameMatch[1].replace(/\s+/g, ' ').trim();
      const email = emailMatch[1].toLowerCase();
      if (!name || EXCLUDED_EMAILS.has(email) || GENERIC_EMAIL.test(email)) continue;
      results.push({ name, email, department: 'Faculty', campus: 'Lahore' });
      found++;
    }
    log.push(`[Lahore] faculty/ -> ${found} faculty`);
  } catch (err) {
    log.push(`[Lahore] failed: ${err instanceof Error ? err.message : String(err)}`);
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

  const sources: Array<() => Promise<ScrapedFaculty[]>> = [
    () => scrapeUnitechCampus('https://mtn.nu.edu.pk/', 'Multan', log),
    () => scrapeUnitechCampus('https://cfd.nu.edu.pk/', 'Chiniot-Faisalabad', log),
    () => scrapePeshawar(log),
    () => scrapeKarachi(log),
    () => scrapeLahore(log),
  ];

  for (const source of sources) {
    try {
      scraped = scraped.concat(await source());
    } catch (err) {
      log.push(`source failed: ${err instanceof Error ? err.message : String(err)}`);
    }
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
      office_hours: DEFAULT_CAMPUS_OFFICE,
      campus: f.campus,
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

  log.push(`Added ${toInsert.length} new faculty member(s) across ${sources.length} campus source(s)`);

  return new Response(JSON.stringify({ success: true, added: toInsert.length, log }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
