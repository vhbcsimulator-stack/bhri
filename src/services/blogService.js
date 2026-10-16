/**
 * Service to fetch and parse Blog and News data from Google Sheets & Google Drive.
 */

const SHEET_ID = import.meta.env.VITE_BLOGS_SHEET_ID || '1kjT32In422t_VI0XO0JunxQMoM9a4rwd-a9HvuZEgvE';
const GOOGLE_DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '';
const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';

// In-memory cache to ensure snappy UX
let cachedBlogs = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

// Pre-resolved metadata cache for Google Drive images (improves SEO & Google Image search rankings for CEO, Company, and Partners)
export const DRIVE_IMAGE_SEO_METADATA = {
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

/**
 * Converts a raw Google Drive filename into a clean, human-readable SEO alt text.
 */
export function cleanAltTextFromFileName(fileName) {
  if (!fileName) return '';
  let clean = fileName.replace(/\.[a-zA-Z0-9]+$/i, '');
  clean = clean.replace(/[-_]+/g, ' ');
  // Ensure space before opening parenthesis e.g. "Escay(5)" -> "Escay (Photo 5)"
  clean = clean.replace(/(\S)\((\d+)\)/g, '$1 (Photo $2)');
  clean = clean.replace(/\bvhbc\b/gi, 'VHermosa Bright Corporation (VHBC)');
  clean = clean.replace(/\blamudi\b/gi, 'Lamudi Philippines');
  clean = clean.replace(/\batty\b/gi, 'Atty.');
  clean = clean.replace(/\badrian carlo escay\b/gi, 'Adrian Carlo Escay');
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Parses any Google Drive URL into its type, ID, and optional filename
 */
export function parseDriveUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let cleanUrl = url.trim();
  let customName = '';

  // Format 1: Markdown [FileName.jpg](https://...)
  const mdMatch = cleanUrl.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (mdMatch) {
    customName = mdMatch[1].trim();
    cleanUrl = mdMatch[2].trim();
  }

  // Format 2: "FileName.jpg: https://..." or "FileName.jpg - https://..."
  const prefixMatch = cleanUrl.match(/^([^:\n\r]+?)\s*[:\-]\s*(https?:\/\/\S+)$/);
  if (!customName && prefixMatch) {
    customName = prefixMatch[1].trim();
    cleanUrl = prefixMatch[2].trim();
  }

  // Format 3: "https://... (FileName.jpg)"
  const suffixMatch = cleanUrl.match(/^(https?:\/\/\S+)\s*\(([^)]+)\)$/);
  if (!customName && suffixMatch) {
    cleanUrl = suffixMatch[1].trim();
    customName = suffixMatch[2].trim();
  }

  // Format 4: Quotes `"FileName.jpg" https://...`
  const quoteMatch = cleanUrl.match(/^["']([^"']+)["']\s*(https?:\/\/\S+)$/);
  if (!customName && quoteMatch) {
    customName = quoteMatch[1].trim();
    cleanUrl = quoteMatch[2].trim();
  }

  // Format 5: Space-separated filename with extension `FileName.jpg https://...`
  const spaceMatch = cleanUrl.match(/^([a-zA-Z0-9_\-\.\s]+\.(?:jpe?g|png|webp|gif|svg|avif))\s+(https?:\/\/\S+)$/i);
  if (!customName && spaceMatch) {
    customName = spaceMatch[1].trim();
    cleanUrl = spaceMatch[2].trim();
  }

  // Format 6: Query parameter ?name=... or ?title=... or ?filename=...
  if (!customName) {
    const qMatch = cleanUrl.match(/[?&](?:name|title|filename)=([^&#]+)/i);
    if (qMatch) {
      customName = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
    }
  }

  // Format 7: Hash anchor #name=... or #filename=... or #FileName.jpg
  if (!customName) {
    const hashMatch = cleanUrl.match(/#(?:(?:name|title|filename)=)?([a-zA-Z0-9_\-\.\s%]+)/i);
    if (hashMatch && hashMatch[1]) {
      const decodedHash = decodeURIComponent(hashMatch[1].replace(/\+/g, ' ')).trim();
      if (decodedHash && !decodedHash.startsWith('usp=')) {
        customName = decodedHash;
      }
    }
  }

  // Folder patterns: /drive/folders/{id} or /drive/u/0/folders/{id}
  const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return {
      type: 'folder',
      id: folderMatch[1],
      name: customName || 'Folder',
      originalUrl: cleanUrl
    };
  }

  // File patterns: /file/d/{id} or ?id={id}
  const fileMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return {
      type: 'file',
      id: fileMatch[1],
      name: customName || '',
      originalUrl: cleanUrl
    };
  }

  // Direct image URL
  const directMatch = cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i);
  if (directMatch) {
    if (!customName) {
      const urlPath = cleanUrl.split('?')[0];
      const parts = urlPath.split('/');
      customName = parts[parts.length - 1];
    }
    return {
      type: 'direct',
      url: cleanUrl,
      name: customName || 'Image',
      originalUrl: cleanUrl
    };
  }

  // Fallback if plain ID provided (typically 28-33 chars)
  if (cleanUrl.match(/^[a-zA-Z0-9_-]{25,}$/)) {
    return {
      type: 'file',
      id: cleanUrl,
      name: customName || '',
      originalUrl: `https://drive.google.com/file/d/${cleanUrl}/view`
    };
  }

  return {
    type: 'unknown',
    name: customName,
    originalUrl: cleanUrl
  };
}

/**
 * Returns a high-resolution, WebP-compressed Google CDN direct image URL from a file ID.
 * Supports on-the-fly resizing and WebP conversion via Fife CDN parameters.
 */
export function getDriveDirectImageUrl(fileId, options = {}) {
  if (!fileId) return '';
  const { width = 1200, webp = true, raw = false } = options;
  if (raw) return `https://lh3.googleusercontent.com/d/${fileId}`;
  const param = `=w${width}${webp ? '-rw' : ''}`;
  return `https://lh3.googleusercontent.com/d/${fileId}${param}`;
}

/**
 * Fetches all images from a Google Drive folder.
 * Uses Google Drive API v3 if API key is provided, or Apps Script if available.
 */
export async function fetchFolderImages(folderId) {
  if (!folderId) return [];

  // 1. Google Drive API v3 (if user configured key)
  if (GOOGLE_DRIVE_API_KEY) {
    try {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType contains 'image/'`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink)&key=${GOOGLE_DRIVE_API_KEY}`);
      if (res.ok) {
        const json = await res.json();
        if (json.files && json.files.length > 0) {
          return json.files.map((f) => ({
            id: f.id,
            name: f.name,
            url: getDriveDirectImageUrl(f.id),
            thumbnailUrl: f.thumbnailLink || getDriveDirectImageUrl(f.id)
          }));
        }
      }
    } catch (err) {
      console.warn('Drive API fetch error:', err);
    }
  }

  // 2. Google Apps Script Web App (if configured)
  if (APPS_SCRIPT_URL) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?folderId=${encodeURIComponent(folderId)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          return json.map((item) => ({
            id: item.id,
            name: item.name || 'Photo',
            url: item.url || getDriveDirectImageUrl(item.id),
            thumbnailUrl: item.thumbnailUrl || getDriveDirectImageUrl(item.id)
          }));
        }
      }
    } catch (err) {
      console.warn('Apps Script fetch error:', err);
    }
  }

  return [];
}

/**
 * Fetches and parses rows from the connected Google Sheet
 */
export async function fetchBlogsFromSheet({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cachedBlogs && (now - lastFetchTime < CACHE_TTL)) {
    return cachedBlogs;
  }

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const res = await fetch(gvizUrl);
    if (!res.ok) {
      throw new Error(`Google Sheet response status: ${res.status}`);
    }

    const text = await res.text();
    // Strip google.visualization.Query.setResponse wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error('Unable to parse Google Sheet JSON response');
    }

    const data = JSON.parse(jsonMatch[1]);
    const rows = data.table?.rows || [];

    if (rows.length === 0) {
      cachedBlogs = [];
      lastFetchTime = now;
      return [];
    }

    // Determine header positions from table.cols or row 0
    const cols = data.table?.cols || [];
    let headerRowIndex = 0;
    let dateColIndex = -1;
    let driveColIndex = -1;
    let titleColIndex = -1;
    let captionColIndex = -1;

    // 1. Inspect table.cols labels (Google Sheets API often puts headers here)
    cols.forEach((col, idx) => {
      const label = String(col?.label || '').toLowerCase().trim();
      if (label.includes('date') || label.includes('time') || label.includes('day') || label.includes('publish')) {
        dateColIndex = idx;
      } else if (label.includes('drive') || label.includes('link') || label.includes('image') || label.includes('folder') || label.includes('url')) {
        driveColIndex = idx;
      } else if (label.includes('title') || label.includes('headline') || label.includes('subject')) {
        titleColIndex = idx;
      } else if (label.includes('caption') || label.includes('desc') || label.includes('content') || label.includes('body')) {
        captionColIndex = idx;
      }
    });

    // 2. If table.cols didn't contain headers, check row 0
    if (driveColIndex === -1 && rows.length > 0) {
      const row0Cells = rows[0]?.c?.map((c) => (c?.v !== null && c?.v !== undefined ? String(c.v).toLowerCase().trim() : '')) || [];
      const hasHeaderRow = row0Cells.some((val) => val.includes('date') || val.includes('drive') || val.includes('link') || val.includes('title') || val.includes('caption') || val.includes('image'));

      if (hasHeaderRow) {
        headerRowIndex = 1;
        row0Cells.forEach((val, idx) => {
          if (val.includes('date') || val.includes('time') || val.includes('day') || val.includes('publish')) {
            dateColIndex = idx;
          } else if (val.includes('drive') || val.includes('link') || val.includes('image') || val.includes('folder') || val.includes('url')) {
            driveColIndex = idx;
          } else if (val.includes('title') || val.includes('headline') || val.includes('subject')) {
            titleColIndex = idx;
          } else if (val.includes('caption') || val.includes('desc') || val.includes('content') || val.includes('body')) {
            captionColIndex = idx;
          }
        });
      }
    }

    // Default fallbacks if any column wasn't explicitly labeled
    if (dateColIndex === -1 && driveColIndex === 1) dateColIndex = 0;
    if (driveColIndex === -1) driveColIndex = dateColIndex === 0 ? 1 : 0;
    if (titleColIndex === -1) titleColIndex = driveColIndex + 1;
    if (captionColIndex === -1) captionColIndex = titleColIndex + 1;

    const parsedBlogs = [];

    for (let i = headerRowIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.c) continue;

      const rawDateCell = dateColIndex !== -1 ? row.c[dateColIndex] : null;
      const rawDriveLink = driveColIndex !== -1 && row.c[driveColIndex]?.v ? String(row.c[driveColIndex].v).trim() : '';
      const rawTitle = titleColIndex !== -1 && row.c[titleColIndex]?.v ? String(row.c[titleColIndex].v).trim() : '';
      const rawCaption = captionColIndex !== -1 && row.c[captionColIndex]?.v ? String(row.c[captionColIndex].v).trim() : '';

      // Skip completely blank rows
      if (!rawDriveLink && !rawTitle && !rawCaption) continue;

      // Format Date string accurately from Sheet + compute ISO date for Search Engine schemas
      let displayDate = '';
      let isoDate = '';
      if (rawDateCell) {
        if (rawDateCell.f && typeof rawDateCell.f === 'string' && rawDateCell.f.trim()) {
          displayDate = rawDateCell.f.trim();
        }
        if (rawDateCell.v) {
          const vStr = String(rawDateCell.v).trim();
          const gvizMatch = vStr.match(/Date\((\d+),(\d+),(\d+)/);
          if (gvizMatch) {
            const y = parseInt(gvizMatch[1], 10);
            const m = parseInt(gvizMatch[2], 10);
            const dNum = parseInt(gvizMatch[3], 10);
            const d = new Date(y, m, dNum);
            if (!isNaN(d.getTime())) {
              if (!displayDate) {
                displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
              isoDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
            }
          } else {
            const parsedD = new Date(vStr);
            if (!isNaN(parsedD.getTime()) && !/^\d+$/.test(vStr)) {
              if (!displayDate) {
                displayDate = parsedD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
              isoDate = parsedD.toISOString().split('T')[0];
            } else if (!displayDate) {
              displayDate = vStr;
            }
          }
        }
      }

      if (!displayDate) {
        const fallbackD = new Date(Date.now() - (rows.length - i) * 86400000);
        displayDate = fallbackD.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        isoDate = fallbackD.toISOString().split('T')[0];
      }
      if (!isoDate && displayDate) {
        const parsedFallback = new Date(displayDate);
        if (!isNaN(parsedFallback.getTime())) {
          isoDate = parsedFallback.toISOString().split('T')[0];
        }
      }

      // Determine display title and excerpt first so images can use them for contextual alt text
      let title = rawTitle;
      let excerpt = rawCaption;

      if (!title) {
        const captionLines = rawCaption.split('\n').map((l) => l.trim()).filter(Boolean);
        title = captionLines[0] || 'Community & Company Update';
        excerpt = captionLines.slice(1).join(' ') || rawCaption;
        if (title.length > 90) {
          title = title.slice(0, 85) + '...';
        }
      } else {
        excerpt = rawCaption.replace(/\n+/g, ' ').trim();
      }

      // Extract direct image link(s) (supports single or multiple comma/newline-separated links)
      let images = [];
      let isFolder = false;
      let folderId = null;

      const individualLinks = rawDriveLink
        .split(/[\r\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const link of individualLinks) {
        const parsed = parseDriveUrl(link);
        if (!parsed) continue;

        // Generate clean SEO-friendly name / alt text based on file name or title + caption
        const imageIndex = images.length + 1;
        let fileName = parsed.name || '';
        const cachedMeta = parsed.id ? DRIVE_IMAGE_SEO_METADATA[parsed.id] : null;

        let cleanAltText = '';
        let imageTitle = '';
        let imageCaption = '';

        if (cachedMeta) {
          imageTitle = cachedMeta.title;
          cleanAltText = cachedMeta.alt;
          imageCaption = cachedMeta.caption;
        } else if (fileName) {
          cleanAltText = cleanAltTextFromFileName(fileName);
          imageTitle = cleanAltText;
          imageCaption = excerpt ? excerpt.slice(0, 140).trim() : cleanAltText;
        } else {
          const captionSnippet = excerpt ? ` - ${excerpt.slice(0, 70).trim()}` : '';
          imageTitle = `${title}${images.length > 0 ? ` (Photo ${imageIndex})` : ''}`;
          cleanAltText = `${title}${captionSnippet} | Bright Hermosa Realty Inc.`;
          imageCaption = excerpt ? excerpt.slice(0, 140).trim() : title;
        }

        // Ensure title and clean names strip raw extensions like .png or .jpg
        imageTitle = imageTitle.replace(/\.[a-zA-Z0-9]+$/i, '').trim();

        if (parsed.type === 'file') {
          images.push({
            id: parsed.id,
            url: getDriveDirectImageUrl(parsed.id, { width: 1600, webp: true }),
            thumbnailUrl: getDriveDirectImageUrl(parsed.id, { width: 800, webp: true }),
            previewUrl: getDriveDirectImageUrl(parsed.id, { width: 320, webp: true }),
            rawUrl: getDriveDirectImageUrl(parsed.id, { raw: true }),
            name: imageTitle,
            title: imageTitle,
            caption: imageCaption,
            fileName: fileName,
            altText: cleanAltText
          });
        } else if (parsed.type === 'direct') {
          images.push({
            id: 'direct-' + images.length,
            url: parsed.url,
            thumbnailUrl: parsed.url,
            previewUrl: parsed.url,
            rawUrl: parsed.url,
            name: imageTitle,
            title: imageTitle,
            caption: imageCaption,
            fileName: fileName,
            altText: cleanAltText
          });
        } else if (parsed.type === 'folder') {
          isFolder = true;
          folderId = parsed.id;
        }
      }

      // If only a folder link was provided and no direct files were found, try fetching folder images
      if (images.length === 0 && isFolder && folderId) {
        const folderImgs = await fetchFolderImages(folderId);
        if (folderImgs.length > 0) {
          images = folderImgs.map((f, fIdx) => {
            const rawName = f.name || `${title} - Image ${fIdx + 1}`;
            const cleanAlt = rawName.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
            const fullAlt = `${cleanAlt} | Bright Hermosa Realty Inc.`;
            return {
              ...f,
              name: cleanAlt,
              title: cleanAlt,
              caption: `${title} - Photo ${fIdx + 1}`,
              altText: fullAlt
            };
          });
        }
      }

      parsedBlogs.push({
        id: `blog-${i}`,
        rowIndex: i + 1,
        title,
        caption: rawCaption,
        excerpt,
        rawDriveLink,
        isFolder,
        folderId,
        images,
        date: displayDate,
        isoDate: isoDate || '2026-09-24'
      });
    }

    // Newest rows first (reverse)
    parsedBlogs.reverse();

    cachedBlogs = parsedBlogs;
    lastFetchTime = now;
    return parsedBlogs;
  } catch (error) {
    console.error('Failed to fetch blogs from Google Sheet:', error);
    throw error;
  }
}
