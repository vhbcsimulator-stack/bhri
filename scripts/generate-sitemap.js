import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Helper to load env vars from .env file manually
const loadEnv = () => {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if any
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
};

loadEnv();

// Base URL (VITE_SITE_URL in .env, fallback to default production domain)
const siteUrl = process.env.VITE_SITE_URL || 'https://bhri.com.ph';
console.log(`Generating sitemaps for site URL: ${siteUrl}`);

const publicDir = path.resolve(__dirname, '../public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 2. Read everything from Supabase. There is no static fallback: emitting a
// sitemap built from stale bundled data would publish wrong URLs, so a failed
// fetch fails the build instead.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseGet = async (query) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required to generate the sitemaps.');
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });

  if (!res.ok) {
    throw new Error(`Supabase request "${query}" failed with status ${res.status}: ${await res.text()}`);
  }

  return res.json();
};

const fetchProperties = async () => {
  console.log('Fetching live properties from Supabase database...');
  const rows = await supabaseGet('properties?select=id,updated_at&order=created_at.asc');
  console.log(`Fetched ${rows.length} active properties from Supabase.`);

  return rows.map(p => ({
    id: p.id,
    updatedAt: p.updated_at ? p.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]
  }));
};

const fetchCareerRoles = async () => {
  console.log('Fetching live career roles from Supabase database...');
  const rows = await supabaseGet('site_content?select=content&id=eq.career');
  const roles = rows[0]?.content?.roles?.items ?? [];
  console.log(`Fetched ${roles.length} career roles from Supabase.`);

  return roles;
};

// 3. Helper to escape XML characters
const xmlEscape = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Pre-resolved image metadata for highest Google Image ranking
const DRIVE_IMAGE_SEO_METADATA = {
  '11ZpZfZQGM1ldDLRu6LMvA0_sTs-eFpd8': {
    title: 'VHBC and Lamudi Philippines Partnership Agreement Signing with Atty. Adrian Carlo Escay',
    caption: 'Atty. Adrian Carlo Escay and Lamudi Philippines executive formalizing real estate development partnership.',
    alt: 'Atty. Adrian Carlo Escay President and CEO of VHBC and Bright Hermosa Realty at Lamudi Philippines partnership signing'
  },
  '1VFv4n5JhpfN6h2mKFZ4ie3lCFIT589IG': {
    title: 'VHBC Strategic Digital Presence Partnership with Lamudi Philippines',
    caption: 'Official partnership ceremony between VHermosa Bright Corporation and Lamudi Philippines.',
    alt: 'VHermosa Bright Corporation and Lamudi Philippines strategic partnership contract signing with Atty. Adrian Carlo Escay'
  },
  '1_qFpEvMpC7pNFYtL3QAH1Nkh7mccSUKt': {
    title: 'VHBC and Lamudi Philippines Delegation and Real Estate Leaders',
    caption: 'Executive delegation of VHBC and Lamudi Philippines celebrating digital real estate collaboration.',
    alt: 'VHBC and Lamudi Philippines executive team celebrating nationwide real estate marketplace partnership'
  },
  '1c6MJXM11vAhl644feng73HDR_sTMK-YW': {
    title: 'Atty. Adrian Carlo Escay Signing Partnership Document with Lamudi Philippines',
    caption: 'Atty. Adrian Carlo Escay formalizing digital marketing and real estate distribution contract.',
    alt: 'Atty. Adrian Carlo Escay President and CEO of VHBC signing official partnership contract with Lamudi Philippines'
  },
  '1eSHtj1v6KZRYU2LrKMHAvj4yCkKbFi8M': {
    title: 'VHBC Executive Team and Lamudi Leadership Partnership Group Photo',
    caption: 'Group photo of VHermosa Bright Corporation management and Lamudi Philippines representatives.',
    alt: 'VHermosa Bright Corporation executive team with Lamudi Philippines leaders at real estate partnership launch'
  },
  '1tu83lfvBKriQroDOKHnnI7le32-4xTng': {
    title: 'VHBC and Lamudi Philippines Handshake Formalizing Partnership',
    caption: 'Handshake between Atty. Adrian Carlo Escay and Lamudi Philippines leadership.',
    alt: 'Atty. Adrian Carlo Escay shaking hands with Lamudi Philippines executive at partnership agreement ceremony'
  },
  '1L2w2j-Vlv2Nz3wQX3WqJTWYx4n-LCKfg': {
    title: 'Atty. Adrian Carlo Escay - President and Chief Executive Officer',
    caption: 'Official executive portrait of Atty. Adrian Carlo Escay, President and CEO of VHermosa Bright Corporation (VHBC) and Bright Hermosa Realty.',
    alt: 'Atty. Adrian Carlo Escay President and Chief Executive Officer of VHermosa Bright Corporation and Bright Hermosa Realty Inc.'
  }
};

const fetchBlogs = async () => {
  const sheetId = process.env.VITE_BLOGS_SHEET_ID || '1kjT32In422t_VI0XO0JunxQMoM9a4rwd-a9HvuZEgvE';
  console.log(`Fetching live blogs and photos from Google Sheet (${sheetId})...`);

  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`);
    if (!res.ok) throw new Error(`Google Sheet returned ${res.status}`);
    const text = await res.text();
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!jsonMatch || !jsonMatch[1]) throw new Error('Invalid Google Sheet JSON format');
    const data = JSON.parse(jsonMatch[1]);
    const rows = data.table?.rows || [];

    const blogs = [];
    rows.forEach((r, idx) => {
      if (!r || !r.c) return;
      const rawDate = r.c[0]?.f || r.c[0]?.v || '';
      const rawDriveLink = r.c[1]?.v ? String(r.c[1].v).trim() : '';
      const title = r.c[2]?.v ? String(r.c[2].v).trim() : 'Community Milestone';
      const caption = r.c[3]?.v ? String(r.c[3].v).trim() : '';

      if (!rawDriveLink && !title) return;

      let isoDate = '';
      if (r.c[0]?.v) {
        const vStr = String(r.c[0].v);
        const gvizMatch = vStr.match(/Date\((\d+),(\d+),(\d+)/);
        if (gvizMatch) {
          const y = parseInt(gvizMatch[1], 10);
          const m = parseInt(gvizMatch[2], 10);
          const d = parseInt(gvizMatch[3], 10);
          isoDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }

      const links = rawDriveLink.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
      const images = [];

      links.forEach((link, lIdx) => {
        const idMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          const fileId = idMatch[1];
          const cached = DRIVE_IMAGE_SEO_METADATA[fileId];
          const imgTitle = cached?.title || `${title} - Photo ${lIdx + 1} | Bright Hermosa Realty`;
          const imgCaption = cached?.caption || (caption ? caption.slice(0, 160).trim() : title);
          const highResUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1600-rw`;

          images.push({
            id: fileId,
            url: highResUrl,
            title: imgTitle,
            caption: imgCaption
          });
        }
      });

      blogs.push({
        id: `blog-${idx}`,
        title,
        caption,
        isoDate: isoDate || new Date().toISOString().split('T')[0],
        images
      });
    });

    console.log(`Parsed ${blogs.length} blog posts with ${blogs.reduce((sum, b) => sum + b.images.length, 0)} indexed images.`);
    return blogs;
  } catch (err) {
    console.warn('Failed to fetch blogs from Google Sheet, proceeding with fallback:', err.message);
    return [];
  }
};

const main = async () => {
  const currentDate = new Date().toISOString().split('T')[0];
  const [properties, roles, blogs] = await Promise.all([fetchProperties(), fetchCareerRoles(), fetchBlogs()]);

  // A. Generate sitemap_index.xml
  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap-main.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-properties.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-blogs.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-careers.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap_index.xml'), sitemapIndexXml.trim());
  console.log('Created: public/sitemap_index.xml');

  // B. Generate sitemap-main.xml
  const mainPages = [
    { path: '', changefreq: 'weekly', priority: '1.0' },
    { path: '/about', changefreq: 'monthly', priority: '0.8' },
    { path: '/properties', changefreq: 'weekly', priority: '0.9' },
    { path: '/blogs', changefreq: 'weekly', priority: '0.8' },
    { path: '/careers', changefreq: 'monthly', priority: '0.7' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { path: '/terms', changefreq: 'yearly', priority: '0.3' },
    { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
    { path: '/sitemap', changefreq: 'monthly', priority: '0.4' }
  ];

  const sitemapMainXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${mainPages.map(page => `  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap-main.xml'), sitemapMainXml.trim());
  console.log('Created: public/sitemap-main.xml');

  // C. Generate sitemap-properties.xml
  const sitemapPropertiesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${properties.map(p => `  <url>
    <loc>${siteUrl}/properties/${p.id}</loc>
    <lastmod>${p.updatedAt || currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap-properties.xml'), sitemapPropertiesXml.trim());
  console.log('Created: public/sitemap-properties.xml');

  // D. sitemap-blogs.xml is served dynamically in real-time by /api/sitemap-blogs
  // so new articles in Google Sheet immediately appear on Google without requiring a rebuild.
  console.log('Registered dynamic sitemap: /sitemap-blogs.xml (handled by /api/sitemap-blogs.js)');

  // E. Generate sitemap-careers.xml
  const sitemapCareersXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${roles.map(role => `  <url>
    <loc>${siteUrl}/careers/${role.id}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap-careers.xml'), sitemapCareersXml.trim());
  console.log('Created: public/sitemap-careers.xml');

  // E. Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap_index.xml
`;

  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt.trim());
  console.log('Created: public/robots.txt');

  console.log('All sitemap files and robots.txt have been generated successfully.');
};

main().catch(err => {
  console.error('Fatal error generating sitemaps:', err);
  process.exit(1);
});
