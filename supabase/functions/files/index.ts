// Signed file URLs for people without a studio account:
//   { token }  → a valid, not revoked review link
//   { slug }   → a project published as a public case page
// Files stay in the private `assets` bucket; URLs expire after an hour.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { token, slug } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let project: { id: string; doc: any } | null = null;
    if (typeof token === 'string' && token.length >= 16) {
      const { data: link } = await admin
        .from('review_links')
        .select('project_id, revoked, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (link && !link.revoked && (!link.expires_at || new Date(link.expires_at) > new Date())) {
        const { data } = await admin.from('projects').select('id, doc').eq('id', link.project_id).maybeSingle();
        project = data;
      }
    } else if (typeof slug === 'string' && slug.length > 0) {
      const { data } = await admin.from('projects').select('id, doc').eq('public_slug', slug).eq('visibility', 'public').maybeSingle();
      project = data;
    }
    if (!project) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });

    const paths: string[] = [];
    for (const a of project.doc?.assets ?? []) {
      if (a.storagePath) paths.push(a.storagePath);
      if (a.thumbPath) paths.push(a.thumbPath);
    }
    const urls: Record<string, string> = {};
    if (paths.length) {
      const { data } = await admin.storage.from('assets').createSignedUrls(paths, 3600);
      for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
    }
    return new Response(JSON.stringify({ urls }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
