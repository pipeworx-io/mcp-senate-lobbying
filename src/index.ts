interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * US Senate Lobbying Disclosure (LDA) MCP.
 *
 * Keyless access to the US Senate Lobbying Disclosure Act database
 * (lda.senate.gov) — ~1.9M federal lobbying filings: who is lobbying the US
 * government, on whose behalf (client), on what issues, and for how much money.
 * Registrants/lobbying firms report `income` (what the client paid them);
 * in-house lobbyists report `expenses` (what they spent lobbying for
 * themselves). Unique federal-transparency data, demand-adjacent to congress
 * and edgar. Anonymous rate limit is ~15 req/min.
 */


const BASE = 'https://lda.senate.gov/api/v1';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_filings',
    description:
      "Search US Senate Lobbying Disclosure Act (LDA) filings — federal lobbying disclosures showing who is lobbying the US government, for which client, on what issues, and for how much. Lobbying FIRMS/registrants report `income` (what the client paid them); IN-HOUSE lobbyists report `expenses` (what they spent on their own lobbying). Provide at least one filter. Keyless.",
    inputSchema: {
      type: 'object',
      properties: {
        registrant_name: {
          type: 'string',
          description: 'Lobbying firm / registrant name, e.g. "akin", "Brownstein". Partial match.',
        },
        client_name: {
          type: 'string',
          description: 'Client name — who hired the lobbyist, e.g. "Google", "Pfizer". Partial match.',
        },
        filing_year: { type: 'number', description: 'Filing year, e.g. 2024.' },
        issue: {
          type: 'string',
          description:
            'General issue area code from list_issue_codes, e.g. "TAX", "HCR" (Health), "ENV", "DEF", "TRD".',
        },
        filing_type: {
          type: 'string',
          description:
            'Optional filing type code, e.g. "Q1"/"Q2"/"Q3"/"Q4" (quarterly reports), "RR" (registration). Use to narrow to a specific period/form.',
        },
        limit: { type: 'number', description: 'Max results, default 10, max 25.' },
      },
    },
  },
  {
    name: 'get_filing',
    description:
      'Get the full detail of a single LDA lobbying filing by its filing UUID — registrant, client, income/expenses, every lobbying activity (issue + description + named lobbyists), foreign entities, and affiliated organizations. Example filing_uuid: "306576ff-0ef4-4269-b5fa-1a2256685950". Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        filing_uuid: {
          type: 'string',
          description:
            'Filing UUID from search_filings, e.g. "306576ff-0ef4-4269-b5fa-1a2256685950".',
        },
      },
      required: ['filing_uuid'],
    },
  },
  {
    name: 'list_issue_codes',
    description:
      'List the valid general issue area codes used by LDA filings (the values accepted by the `issue` filter on search_filings), e.g. TAX=Taxation, HCR=Health Issues, ENV=Environment. Keyless.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_filings':
        return searchFilings(args);
      case 'get_filing':
        return getFiling(args);
      case 'list_issue_codes':
        return listIssueCodes();
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function ldaGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${BASE}${path}${qs}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (res.status === 429) {
    return { error: 'Senate LDA rate limit (anonymous ~15/min) — retry shortly.' };
  }
  if (res.status === 404) return { error: 'not found' };
  if (!res.ok) return { error: `Senate LDA: ${res.status} ${(await res.text()).slice(0, 200)}` };
  return res.json();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function arr(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}

function mapFiling(raw: Record<string, unknown>, opts?: { full?: boolean }): Record<string, unknown> {
  const registrant = obj(raw.registrant);
  const client = obj(raw.client);
  const activities = arr(raw.lobbying_activities);

  if (!opts?.full) {
    const issues: string[] = [];
    for (const a of activities) {
      const d = a.general_issue_code_display;
      if (typeof d === 'string' && d && !issues.includes(d)) issues.push(d);
    }
    return {
      filing_uuid: raw.filing_uuid,
      registrant: registrant.name ?? null,
      client: client.name ?? null,
      client_description: client.general_description ?? null,
      filing_year: raw.filing_year,
      period: raw.filing_period_display ?? null,
      type: raw.filing_type_display ?? null,
      income: num(raw.income),
      expenses: num(raw.expenses),
      issues: issues.slice(0, 8),
      document_url: raw.filing_document_url ?? null,
      posted: raw.dt_posted ?? null,
    };
  }

  return {
    filing_uuid: raw.filing_uuid,
    registrant: {
      name: registrant.name ?? null,
      description: registrant.description ?? null,
      contact: registrant.contact_name ?? null,
    },
    client: {
      name: client.name ?? null,
      description: client.general_description ?? null,
      state: client.state_display ?? null,
      country: client.country_display ?? null,
    },
    filing_year: raw.filing_year,
    period: raw.filing_period_display ?? null,
    type: raw.filing_type_display ?? null,
    income: num(raw.income),
    expenses: num(raw.expenses),
    lobbying_activities: activities.map((a) => ({
      issue: a.general_issue_code_display ?? null,
      description:
        typeof a.description === 'string' ? a.description.slice(0, 300) : a.description ?? null,
      lobbyist_names: arr(a.lobbyists)
        .slice(0, 10)
        .map((l) => {
          const lob = obj(l.lobbyist);
          return [lob.first_name, lob.last_name].filter(Boolean).join(' ').trim();
        })
        .filter(Boolean),
    })),
    foreign_entities: arr(raw.foreign_entities).map((f) => ({
      name: f.name ?? null,
      country: f.country_display ?? f.country ?? null,
    })),
    affiliated_organizations: arr(raw.affiliated_organizations)
      .map((o) => o.name)
      .filter(Boolean),
    document_url: raw.filing_document_url ?? null,
    posted: raw.dt_posted ?? null,
  };
}

async function searchFilings(args: Record<string, unknown>): Promise<unknown> {
  const params: Record<string, string> = {};
  if (typeof args.registrant_name === 'string' && args.registrant_name.trim())
    params.registrant_name = args.registrant_name.trim();
  if (typeof args.client_name === 'string' && args.client_name.trim())
    params.client_name = args.client_name.trim();
  if (typeof args.filing_year === 'number') params.filing_year = String(args.filing_year);
  if (typeof args.issue === 'string' && args.issue.trim())
    params.lobbying_activity_issue = args.issue.trim().toUpperCase();
  if (typeof args.filing_type === 'string' && args.filing_type.trim())
    params.filing_type = args.filing_type.trim();

  if (Object.keys(params).length === 0)
    return { error: 'provide at least one filter (registrant_name, client_name, filing_year, issue, or filing_type)' };

  let limit = typeof args.limit === 'number' ? Math.floor(args.limit) : 10;
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  if (limit > 25) limit = 25;
  params.page_size = String(limit);
  params.page = '1';

  const data = await ldaGet('/filings/', params);
  if (data && typeof data === 'object' && 'error' in data) return data;

  const d = obj(data);
  const results = arr(d.results);
  return {
    total: d.count ?? null,
    count: results.length,
    filings: results.map((r) => mapFiling(r)),
  };
}

async function getFiling(args: Record<string, unknown>): Promise<unknown> {
  const uuid = typeof args.filing_uuid === 'string' ? args.filing_uuid.trim() : '';
  if (!uuid) return { error: 'provide a filing_uuid', filing_uuid: args.filing_uuid ?? null };

  const data = await ldaGet(`/filings/${encodeURIComponent(uuid)}/`);
  if (data && typeof data === 'object' && 'error' in data) return data;

  return mapFiling(obj(data), { full: true });
}

async function listIssueCodes(): Promise<unknown> {
  const data = await ldaGet('/constants/filing/lobbyingactivityissues/');
  if (data && typeof data === 'object' && !Array.isArray(data) && 'error' in data) return data;

  const list = arr(data);
  return {
    count: list.length,
    issues: list.map((i) => ({ code: i.value, name: i.name })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
