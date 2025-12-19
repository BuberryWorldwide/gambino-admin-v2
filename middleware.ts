import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Known security scanner and bot user agents to block
const BLOCKED_USER_AGENTS = [
  'mozilla/5.0 (compatible; mozilla observatory',
  'observatory',
  'securityheaders',
  'ssllabs',
  'qualys',
  'nessus',
  'nikto',
  'nmap',
  'sqlmap',
  'burpsuite',
  'owasp',
  'acunetix',
  'netsparker',
  'appscan',
  'webinspect',
  'arachni',
  'skipfish',
  'wpscan',
  'nuclei',
  'httpx',
  'curl/',
  'wget/',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'java/',
  'libwww-perl',
  'scrapy',
  'phantomjs',
  'headlesschrome',
  'lighthouse',
  'pagespeed',
  'gtmetrix',
  'pingdom',
  'uptimerobot',
  'statuscake',
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // Block known scanner user agents
  const isBlocked = BLOCKED_USER_AGENTS.some(blocked =>
    userAgent.includes(blocked.toLowerCase())
  );

  if (isBlocked) {
    // Return 403 Forbidden with no useful information
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden'
    });
  }

  // Block requests with no user agent (common for basic scanners)
  if (!userAgent || userAgent.length < 10) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden'
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
