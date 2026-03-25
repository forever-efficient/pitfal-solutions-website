/**
 * Lambda@Edge (viewer-request) for injecting Open Graph meta tags
 * into gallery pages when requested by social media crawlers.
 *
 * Handles two URL patterns:
 *   /client/?id={galleryId}           — client gallery (fetched by primary key)
 *   /portfolio/{category}/{slug}/     — portfolio gallery (fetched by slug GSI)
 *
 * For crawlers: returns a minimal HTML page with OG tags (hero image, title, description).
 * For regular users: rewrites the URI to append /index.html and passes through to S3.
 *
 * Deployed in us-east-1 (CloudFront requirement), queries DynamoDB in us-west-2.
 * No environment variables (Lambda@Edge constraint) — config is hardcoded.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

// Lambda@Edge cannot use environment variables — hardcode config
const GALLERIES_TABLE = 'pitfal-prod-galleries';
const DYNAMODB_REGION = 'us-west-2';
const MEDIA_URL = 'https://www.pitfal.solutions/media';
const SITE_URL = 'https://www.pitfal.solutions';
const SITE_NAME = 'Pitfal Solutions';

// Lazy-init DynamoDB client (reused across warm invocations)
let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({ region: DYNAMODB_REGION });
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

// Crawler User-Agent patterns for link preview bots
const CRAWLER_PATTERN =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Applebot|Pinterest|Embedly|Quora Link Preview|outbrain|vkShare|redditbot|Rogerbot|SocialFlow|iframely/i;

interface GalleryRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  slug: string;
  heroImage?: string;
  images?: Array<{ key: string; alt?: string }>;
  type?: string;
}

/**
 * Parse the gallery ID from a /client/?id={galleryId} query string.
 */
function parseClientGalleryId(uri: string, querystring: string): string | null {
  const clean = uri.replace(/\/+$/, '');
  if (clean !== '/client') return null;
  if (!querystring) return null;

  const params = new URLSearchParams(querystring);
  return params.get('id') || null;
}

/**
 * Parse gallery category and slug from a URI like /portfolio/events/smith-wedding/
 */
function parsePortfolioPath(uri: string): { category: string; slug: string } | null {
  const clean = uri.replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);

  // Expect: ['portfolio', category, slug]
  if (parts.length !== 3 || parts[0] !== 'portfolio') {
    return null;
  }

  return { category: parts[1], slug: parts[2] };
}

/**
 * Fetch a gallery by its primary key (id).
 */
async function fetchGalleryById(id: string): Promise<GalleryRecord | null> {
  const db = getDocClient();

  const result = await db.send(
    new GetCommand({
      TableName: GALLERIES_TABLE,
      Key: { id },
    })
  );

  return (result.Item as GalleryRecord) || null;
}

/**
 * Fetch a gallery by slug via the slug-index GSI, then verify the category matches.
 */
async function fetchGalleryBySlug(category: string, slug: string): Promise<GalleryRecord | null> {
  const db = getDocClient();

  const result = await db.send(
    new QueryCommand({
      TableName: GALLERIES_TABLE,
      IndexName: 'slug-index',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
      Limit: 10,
    })
  );

  const galleries = (result.Items || []) as GalleryRecord[];
  return galleries.find(g => g.category === category) || null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get the 1200w thumbnail URL for an image key.
 * Mirrors the thumbnail-generator convention: gallery/{id}/{name}.jpg → processed/{id}/{name}/1200w.webp
 */
function getThumbnailUrl(key: string): string {
  const baseName = key.replace(/\.[^/.]+$/, '');
  const processedPath = baseName.startsWith('gallery/')
    ? baseName.replace(/^gallery\//, 'processed/')
    : `processed/${baseName}`;
  return `${MEDIA_URL}/${processedPath}/1200w.webp`;
}

/**
 * Build a minimal HTML page with Open Graph meta tags.
 */
function buildOgHtml(gallery: GalleryRecord, url: string): string {
  const title = escapeHtml(gallery.title);
  const description = escapeHtml(
    gallery.description || `${gallery.title} — Photography by ${SITE_NAME}`
  );

  // Use hero image, or fall back to first gallery image — use 1200w thumbnail for fast loading
  const imageKey = gallery.heroImage || gallery.images?.[0]?.key;
  const imageUrl = imageKey ? getThumbnailUrl(imageKey) : '';

  const imageTag = imageUrl
    ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} | ${SITE_NAME}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
${imageTag}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
</head>
<body></body>
</html>`;
}

export const handler = async (
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;
  const querystring = request.querystring || '';

  // Check if this is a crawler
  const userAgent = request.headers['user-agent']?.[0]?.value || '';
  const isCrawler = CRAWLER_PATTERN.test(userAgent);

  if (isCrawler) {
    try {
      let gallery: GalleryRecord | null = null;
      let ogUrl = '';

      // Try client gallery: /client/?id={galleryId}
      const galleryId = parseClientGalleryId(uri, querystring);
      if (galleryId) {
        gallery = await fetchGalleryById(galleryId);
        ogUrl = `${SITE_URL}/client/?id=${galleryId}`;
      }

      // Try portfolio gallery: /portfolio/{category}/{slug}
      if (!gallery) {
        const parsed = parsePortfolioPath(uri);
        if (parsed) {
          gallery = await fetchGalleryBySlug(parsed.category, parsed.slug);
          ogUrl = `${SITE_URL}/portfolio/${parsed.category}/${parsed.slug}/`;
        }
      }

      if (gallery) {
        const html = buildOgHtml(gallery, ogUrl);
        return {
          status: '200',
          statusDescription: 'OK',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-cache' }],
          },
          body: html,
        };
      }
    } catch {
      // On error, fall through to normal request handling
    }
  }

  // Non-crawler or gallery not found: rewrite URI for S3 static hosting
  // Same logic as the url_rewrite CloudFront Function
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }

  return request;
};
