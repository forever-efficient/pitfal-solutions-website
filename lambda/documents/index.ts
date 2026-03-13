import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import {
  LightsailClient,
  GetInstanceCommand,
  CreateInstancesFromSnapshotCommand,
  CreateInstanceSnapshotCommand,
  DeleteInstanceCommand,
  DeleteInstanceSnapshotCommand,
  GetInstanceSnapshotsCommand,
  OpenInstancePublicPortsCommand,
  GetOperationCommand,
} from '@aws-sdk/client-lightsail';
import { Route53Client, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ADMIN_TABLE = process.env.ADMIN_TABLE!;
const DOCUSEAL_INTERNAL_URL = process.env.DOCUSEAL_INTERNAL_URL!;
const DOCUSEAL_API_KEY_SSM_PATH = process.env.DOCUSEAL_API_KEY_SSM_PATH!;
const ROUTE53_ZONE_ID = process.env.ROUTE53_ZONE_ID!;
const DOCUSEAL_ORIGIN_DNS_NAME = process.env.DOCUSEAL_ORIGIN_DNS_NAME!;
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET!;
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || '*';
const AWS_REGION = process.env.AWS_REGION || 'us-west-2';
const INSTANCE_NAME = 'pitfal-prod-docuseal';
const SNAPSHOT_NAME = 'docuseal-latest';
const SSM_OPERATION_PATH = '/pitfal/docuseal-operation';

const ssmClient = new SSMClient({ region: AWS_REGION });
const lightsailClient = new LightsailClient({ region: AWS_REGION });
const route53Client = new Route53Client({ region: AWS_REGION });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }));

// Cache API key in memory between invocations
let cachedApiKey: string | null = null;

async function getDocuSealApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const res = await ssmClient.send(
    new GetParameterCommand({
      Name: DOCUSEAL_API_KEY_SSM_PATH,
      WithDecryption: true,
    })
  );
  cachedApiKey = res.Parameter?.Value || '';
  return cachedApiKey;
}

function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = CORS_ALLOWED_ORIGINS.split(',');
  const matchedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': matchedOrigin || '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  origin?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

function successResponse(data: unknown, origin?: string): APIGatewayProxyResult {
  return jsonResponse(200, { success: true, data }, origin);
}

function errorResponse(
  statusCode: number,
  message: string,
  origin?: string
): APIGatewayProxyResult {
  return jsonResponse(statusCode, { success: false, error: message }, origin);
}

// Admin auth check — validate Bearer token or cookie against DynamoDB sessions
// Matches shared/session.ts format: PK=ADMIN#${id}, SK=${token}
// Cookie value is base64-encoded "id:token"
async function isAuthenticated(event: APIGatewayProxyEvent): Promise<boolean> {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  const cookieHeader = event.headers?.Cookie || event.headers?.cookie;

  let encodedToken: string | null = null;

  // Check Authorization header first
  if (authHeader?.startsWith('Bearer ')) {
    encodedToken = authHeader.slice(7);
  }
  // Fall back to cookie
  else if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)pitfal_admin_session=([^;]+)/);
    if (match) encodedToken = match[1];
  }

  if (!encodedToken) return false;

  try {
    // Decode base64 token → "id:sessionToken"
    const decoded = Buffer.from(encodedToken, 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return false;
    const id = decoded.substring(0, colonIndex);
    const token = decoded.substring(colonIndex + 1);
    if (!id || !token) return false;

    const result = await ddbClient.send(
      new GetCommand({
        TableName: ADMIN_TABLE,
        Key: { pk: `ADMIN#${id}`, sk: token },
      })
    );

    if (!result.Item) return false;

    // Check expiry (stored as Unix seconds)
    const expiresAt = result.Item.expiresAt;
    if (expiresAt && Math.floor(Date.now() / 1000) > expiresAt) return false;

    return true;
  } catch {
    return false;
  }
}

// Get current operation state from SSM
async function getOperationState(): Promise<{
  state: string;
  operationId: string;
  timestamp: string;
  error?: string;
}> {
  try {
    const res = await ssmClient.send(new GetParameterCommand({ Name: SSM_OPERATION_PATH }));
    return JSON.parse(res.Parameter?.Value || '{}');
  } catch {
    return { state: 'off', operationId: '', timestamp: '' };
  }
}

// Set operation state in SSM
async function setOperationState(state: Record<string, string>): Promise<void> {
  await ssmClient.send(
    new PutParameterCommand({
      Name: SSM_OPERATION_PATH,
      Value: JSON.stringify(state),
      Type: 'String',
      Overwrite: true,
    })
  );
}

// Proxy a request to DocuSeal API
async function proxyToDocuSeal(
  method: string,
  path: string,
  body?: string
): Promise<{ status: number; data: unknown }> {
  const apiKey = await getDocuSealApiKey();
  const url = `${DOCUSEAL_INTERNAL_URL}/api${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-Auth-Token': apiKey,
      'Content-Type': 'application/json',
    },
    ...(body && method !== 'GET' ? { body } : {}),
  });

  const data = await res.json();
  return { status: res.status, data };
}

// Handler for GET /api/documents/status
async function handleStatus(origin?: string): Promise<APIGatewayProxyResult> {
  const opState = await getOperationState();

  // If starting or stopping, check if the Lightsail operation completed
  if (
    (opState.state === 'starting' || opState.state === 'stopping') &&
    opState.operationId
  ) {
    try {
      const op = await lightsailClient.send(
        new GetOperationCommand({
          operationId: opState.operationId,
        })
      );

      const opStatus = op.operation?.status;

      if (opStatus === 'Succeeded') {
        if (opState.state === 'starting') {
          // Instance is ready — open ports, update DNS, set state to running
          try {
            const instance = await lightsailClient.send(
              new GetInstanceCommand({
                instanceName: INSTANCE_NAME,
              })
            );
            const publicIp = instance.instance?.publicIpAddress;

            if (publicIp) {
              // Open port 3000
              await lightsailClient.send(
                new OpenInstancePublicPortsCommand({
                  instanceName: INSTANCE_NAME,
                  portInfo: { fromPort: 3000, toPort: 3000, protocol: 'tcp' },
                })
              );

              // Update Route 53 origin DNS
              await route53Client.send(
                new ChangeResourceRecordSetsCommand({
                  HostedZoneId: ROUTE53_ZONE_ID,
                  ChangeBatch: {
                    Changes: [
                      {
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                          Name: DOCUSEAL_ORIGIN_DNS_NAME,
                          Type: 'A',
                          TTL: 60,
                          ResourceRecords: [{ Value: publicIp }],
                        },
                      },
                    ],
                  },
                })
              );

              await setOperationState({
                state: 'running',
                operationId: '',
                timestamp: new Date().toISOString(),
              });
              return successResponse({ status: 'running', publicIp }, origin);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            await setOperationState({
              state: 'error',
              operationId: '',
              timestamp: new Date().toISOString(),
              error: msg,
            });
            return successResponse({ status: 'error', error: msg }, origin);
          }
        } else if (opState.state === 'stopping') {
          // Snapshot complete — delete instance, clean up DNS, delete old snapshots
          try {
            await lightsailClient.send(
              new DeleteInstanceCommand({
                instanceName: INSTANCE_NAME,
                forceDeleteAddOns: true,
              })
            );

            // Delete origin DNS record
            try {
              await route53Client.send(
                new ChangeResourceRecordSetsCommand({
                  HostedZoneId: ROUTE53_ZONE_ID,
                  ChangeBatch: {
                    Changes: [
                      {
                        Action: 'DELETE',
                        ResourceRecordSet: {
                          Name: DOCUSEAL_ORIGIN_DNS_NAME,
                          Type: 'A',
                          TTL: 60,
                          ResourceRecords: [{ Value: '127.0.0.1' }], // placeholder - need actual IP
                        },
                      },
                    ],
                  },
                })
              );
            } catch {
              // DNS record may not exist, ignore
            }

            // Clean up old snapshots (keep only the latest)
            const snapshots = await lightsailClient.send(
              new GetInstanceSnapshotsCommand({})
            );
            const docusealSnapshots = (snapshots.instanceSnapshots || []).filter(
              (s) => s.name?.startsWith('docuseal-') && s.name !== SNAPSHOT_NAME
            );
            for (const snap of docusealSnapshots) {
              if (snap.name) {
                await lightsailClient.send(
                  new DeleteInstanceSnapshotCommand({ instanceSnapshotName: snap.name })
                );
              }
            }

            await setOperationState({
              state: 'off',
              operationId: '',
              timestamp: new Date().toISOString(),
            });
            return successResponse({ status: 'off' }, origin);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            await setOperationState({
              state: 'error',
              operationId: '',
              timestamp: new Date().toISOString(),
              error: msg,
            });
            return successResponse({ status: 'error', error: msg }, origin);
          }
        }
      } else if (opStatus === 'Failed') {
        const msg =
          op.operation?.errorDetails?.map((d) => d.message).join(', ') ||
          'Operation failed';
        await setOperationState({
          state: 'error',
          operationId: '',
          timestamp: new Date().toISOString(),
          error: msg,
        });
        return successResponse({ status: 'error', error: msg }, origin);
      }

      // Still in progress
      return successResponse(
        { status: opState.state, operationId: opState.operationId },
        origin
      );
    } catch {
      // If GetOperation fails, just return current state
      return successResponse({ status: opState.state }, origin);
    }
  }

  return successResponse(
    { status: opState.state, ...(opState.error ? { error: opState.error } : {}) },
    origin
  );
}

// Handler for POST /api/documents/toggle
async function handleToggle(
  event: APIGatewayProxyEvent,
  origin?: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const action = body.action as 'enable' | 'disable';

  if (!action || !['enable', 'disable'].includes(action)) {
    return errorResponse(400, 'action must be "enable" or "disable"', origin);
  }

  const opState = await getOperationState();

  // Mutex check
  if (opState.state === 'starting' || opState.state === 'stopping') {
    return errorResponse(409, 'Operation in progress', origin);
  }

  if (action === 'enable') {
    // Check if instance already exists
    try {
      const instance = await lightsailClient.send(
        new GetInstanceCommand({ instanceName: INSTANCE_NAME })
      );
      if (instance.instance?.state?.name === 'running') {
        await setOperationState({
          state: 'running',
          operationId: '',
          timestamp: new Date().toISOString(),
        });
        return successResponse({ status: 'running' }, origin);
      }
    } catch {
      // Instance doesn't exist, proceed to create
    }

    await setOperationState({
      state: 'starting',
      operationId: '',
      timestamp: new Date().toISOString(),
    });

    try {
      // Check for existing snapshot
      let operationId = '';
      try {
        const snapshots = await lightsailClient.send(
          new GetInstanceSnapshotsCommand({})
        );
        const snapshot = (snapshots.instanceSnapshots || []).find(
          (s) => s.name === SNAPSHOT_NAME
        );

        if (snapshot) {
          // Restore from snapshot
          const result = await lightsailClient.send(
            new CreateInstancesFromSnapshotCommand({
              instanceNames: [INSTANCE_NAME],
              availabilityZone: `${AWS_REGION}a`,
              bundleId: 'nano_3_0',
              instanceSnapshotName: SNAPSHOT_NAME,
            })
          );
          operationId = result.operations?.[0]?.id || '';
        } else {
          // No snapshot — this shouldn't happen in toggle flow (first time uses Terraform)
          return errorResponse(
            500,
            'No snapshot found. Use Terraform to create the initial instance.',
            origin
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to check snapshots';
        await setOperationState({
          state: 'error',
          operationId: '',
          timestamp: new Date().toISOString(),
          error: msg,
        });
        return errorResponse(500, msg, origin);
      }

      await setOperationState({
        state: 'starting',
        operationId,
        timestamp: new Date().toISOString(),
      });
      return successResponse({ status: 'starting' }, origin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start';
      await setOperationState({
        state: 'error',
        operationId: '',
        timestamp: new Date().toISOString(),
        error: msg,
      });
      return errorResponse(500, msg, origin);
    }
  } else {
    // DISABLE flow
    // Check for pending submissions
    try {
      const apiKey = await getDocuSealApiKey();
      const res = await fetch(
        `${DOCUSEAL_INTERNAL_URL}/api/submissions?status=pending`,
        {
          headers: { 'X-Auth-Token': apiKey },
        }
      );

      if (res.ok) {
        const submissions = await res.json();
        const pendingCount = Array.isArray(submissions) ? submissions.length : 0;
        if (pendingCount > 0) {
          return errorResponse(
            409,
            `${pendingCount} document(s) pending signature. Complete or cancel them first.`,
            origin
          );
        }
      }
    } catch {
      // If we can't check, proceed anyway (DocuSeal might already be partially down)
    }

    await setOperationState({
      state: 'stopping',
      operationId: '',
      timestamp: new Date().toISOString(),
    });

    try {
      // Create snapshot
      const result = await lightsailClient.send(
        new CreateInstanceSnapshotCommand({
          instanceName: INSTANCE_NAME,
          instanceSnapshotName: SNAPSHOT_NAME,
        })
      );
      const operationId = result.operations?.[0]?.id || '';

      await setOperationState({
        state: 'stopping',
        operationId,
        timestamp: new Date().toISOString(),
      });
      return successResponse({ status: 'stopping' }, origin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create snapshot';
      await setOperationState({
        state: 'error',
        operationId: '',
        timestamp: new Date().toISOString(),
        error: msg,
      });
      return errorResponse(500, msg, origin);
    }
  }
}

// Main handler
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.origin || event.headers?.Origin;
  const method = event.httpMethod;
  const path = event.path;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(origin), body: '' };
  }

  // Auth check
  if (!(await isAuthenticated(event))) {
    return errorResponse(401, 'Unauthorized', origin);
  }

  // Route handling
  // Strip /api/documents prefix
  const route = path.replace(/^\/api\/documents\/?/, '');

  try {
    // GET /api/documents/status
    if (method === 'GET' && route === 'status') {
      return handleStatus(origin);
    }

    // POST /api/documents/toggle
    if (method === 'POST' && route === 'toggle') {
      return handleToggle(event, origin);
    }

    // GET /api/documents/templates
    if (method === 'GET' && route === 'templates') {
      const result = await proxyToDocuSeal('GET', '/templates');
      return successResponse(result.data, origin);
    }

    // POST /api/documents/templates (upload a template)
    if (method === 'POST' && route === 'templates') {
      const result = await proxyToDocuSeal('POST', '/templates', event.body || undefined);
      return successResponse(result.data, origin);
    }

    // POST /api/documents/send
    if (method === 'POST' && route === 'send') {
      // DocuSeal API: POST /api/submissions to create a submission and send
      const body = JSON.parse(event.body || '{}');
      const { templateId, recipients } = body;

      if (!templateId || !recipients || !Array.isArray(recipients)) {
        return errorResponse(400, 'templateId and recipients array required', origin);
      }

      // Create submission with submitters
      const submissionBody = JSON.stringify({
        template_id: templateId,
        send_email: true,
        submitters: recipients.map(
          (r: { name: string; email: string; role?: string }) => ({
            name: r.name,
            email: r.email,
            role: r.role || 'First Party',
          })
        ),
      });

      const result = await proxyToDocuSeal('POST', '/submissions', submissionBody);
      return successResponse(result.data, origin);
    }

    // GET /api/documents/submissions
    if (method === 'GET' && route === 'submissions') {
      const result = await proxyToDocuSeal('GET', '/submissions');
      return successResponse(result.data, origin);
    }

    // GET /api/documents/submissions/{id}
    const submissionMatch = route.match(/^submissions\/(\d+)$/);
    if (method === 'GET' && submissionMatch) {
      const id = submissionMatch[1];
      const result = await proxyToDocuSeal('GET', `/submissions/${id}`);
      return successResponse(result.data, origin);
    }

    return errorResponse(404, 'Not found', origin);
  } catch (err) {
    console.error('Documents handler error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(500, message, origin);
  }
}
