/**
 * Serverless function for Vercel: /api/sitemap-blogs
 * Dynamically fetches live blogs and photos from Google Sheet in real-time.
 * Every time an article or photo is added to Google Sheets, it is immediately
 * included in this XML sitemap for Google Search and Google Images.
 */

const SHEET_ID = process.env.VITE_BLOGS_SHEET_ID || '1kjT32In422t_VI0XO0JunxQMoM9a4rwd-a9HvuZEgvE';
const SITE_URL = process.env.VITE_SITE_URL || 'https://bhri.com.ph';

// Helper to escape XML characters
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

export default async function handler(req, res) {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
    
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      throw new Error(`Google Sheet returned HTTP ${response.status}`);
    }

    const text = await response.text();
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error('Failed to parse Google Sheet JSON response');
    }

    const data = JSON.parse(jsonMatch[1]);
    const rows = data.table?.rows || [];

    const blogs = [];
    rows.forEach((r, idx) => {
      if (!r || !r.c) return;
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
        isoDate: isoDate || currentDate,
        images
      });
    });

    const allImages = blogs.flatMap((b) => b.images);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/blogs</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${allImages.map((img) => `    <image:image>
      <image:loc>${xmlEscape(img.url)}</image:loc>
      <image:title>${xmlEscape(img.title)}</image:title>
      <image:caption>${xmlEscape(img.caption)}</image:caption>
      <image:geo_location>Cavite, Philippines</image:geo_location>
    </image:image>`).join('\n')}
  </url>
${blogs.map((b) => `  <url>
    <loc>${SITE_URL}/blogs#${b.id}</loc>
    <lastmod>${b.isoDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
${b.images.map((img) => `    <image:image>
      <image:loc>${xmlEscape(img.url)}</image:loc>
      <image:title>${xmlEscape(img.title)}</image:title>
      <image:caption>${xmlEscape(img.caption)}</image:caption>
      <image:geo_location>Cavite, Philippines</image:geo_location>
    </image:image>`).join('\n')}
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache on Vercel Edge for 10 minutes, allows revalidation in background
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Error generating dynamic blog sitemap:', error);
    // In case of error, send standard empty or minimal XML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/blogs</loc></url></urlset>`);
  }
}
