// Vercel Serverless Function: /api/resolve-filename
// Ported 1:1 strictly following backend/src/tools/name_extractor.py

function _get_filename_from_headers(headers) {
    const contentDisposition = headers.get 
        ? (headers.get('content-disposition') || '') 
        : (headers['content-disposition'] || '');

    if (contentDisposition.includes('filename=')) {
        let match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
            return match[1];
        }
        match = contentDisposition.match(/filename=([^;]+)/);
        if (match) {
            return match[1].trim();
        }
    }
    return null;
}

function _get_url_basename(urlStr) {
    try {
        const parsed = new URL(urlStr);
        const path = parsed.pathname;
        const lastSlash = path.lastIndexOf('/');
        const basename = lastSlash !== -1 ? path.substring(lastSlash + 1) : path;
        return basename || null;
    } catch {
        return null;
    }
}

async function resolve_filename(url) {
    // 1. Direct oEmbed check for YouTube videos
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await fetch(oembedUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(3000),
            });
            if (response.ok) {
                const oembedData = await response.json();
                const title = oembedData.title;
                if (title) {
                    return title;
                }
            }
        } catch {
            // pass
        }
    }

    try {
        let headers = null;
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                redirect: 'follow',
                signal: AbortSignal.timeout(3000),
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            headers = response.headers;
        } catch {
            // pass
        }

        const contentDisposition = headers 
            ? (headers.get ? headers.get('content-disposition') : headers['content-disposition']) 
            : null;

        if (!contentDisposition) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(3000),
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                });
                headers = response.headers;
                // Close/cancel body stream so we don't download the file content
                if (response.body && response.body.cancel) {
                    response.body.cancel().catch(() => {});
                }
            } catch {
                // pass
            }
        }

        let filename = headers ? _get_filename_from_headers(headers) : null;

        if (!filename) {
            filename = _get_url_basename(url);
        }

        if (!filename) {
            filename = 'download';
        }

        return filename;
    } catch {
        try {
            return _get_url_basename(url) || 'download';
        } catch {
            return 'download';
        }
    }
}

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    // Securely allow local development hosts, Vercel deployments, or custom domain
    const isAllowedOrigin = !origin || 
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^https?:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin) ||
        (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN);

    if (origin && isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        if (origin && !isAllowedOrigin) {
            return res.status(403).end();
        }
        return res.status(200).end();
    }

    const { url } = req.query || {};

    if (!url) {
        return res.status(400).json({ detail: 'URL parameter is required' });
    }

    try {
        const filename = await resolve_filename(url);
        return res.status(200).json({ filename });
    } catch (err) {
        return res.status(400).json({ detail: err.message || 'Failed to resolve filename' });
    }
}
