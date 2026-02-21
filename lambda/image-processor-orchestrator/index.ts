import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const ADMIN_TABLE = process.env.ADMIN_TABLE!;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;
const IMAGENAI_API_KEY = process.env.IMAGENAI_API_KEY!;
const IMAGENAI_PROFILE_ID = process.env.IMAGENAI_PROFILE_ID || '';
const IMAGENAI_BASE_URL = 'https://api.imagen-ai.com/v1';

interface OrchestratorEvent {
  jobId: string;
  galleryId: string;
  rawKeys: string[];
}

async function updateJobStatus(
  jobId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const pk = `PROCESSING_JOB#${jobId}`;
  const expressions: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

  for (const [k, v] of Object.entries(updates)) {
    expressions.push(`#${k} = :${k}`);
    names[`#${k}`] = k;
    values[`:${k}`] = v;
  }

  await dynamo.send(new UpdateCommand({
    TableName: ADMIN_TABLE,
    Key: { pk, sk: pk },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

async function getS3ObjectAsBuffer(key: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: key,
  }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const handler = async (event: OrchestratorEvent): Promise<void> => {
  const { jobId, galleryId, rawKeys } = event;

  if (!IMAGENAI_API_KEY?.trim()) {
    throw new Error('IMAGENAI_API_KEY is not configured. Set the environment variable to enable RAW processing.');
  }
  if (!IMAGENAI_PROFILE_ID?.trim()) {
    throw new Error('IMAGENAI_PROFILE_ID is not configured. Set the environment variable to enable RAW processing.');
  }

  console.log(JSON.stringify({ level: 'INFO', message: 'Orchestrator started', jobId, galleryId, fileCount: rawKeys.length }));

  try {
    // Mark as uploading
    await updateJobStatus(jobId, { status: 'uploading' });

    // 1. Create ImagenAI project
    const createResponse = await fetch(`${IMAGENAI_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IMAGENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_key: IMAGENAI_PROFILE_ID,
        type: 'RAW',
      }),
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`ImagenAI project creation failed: ${createResponse.status} ${errText}`);
    }

    const { project_id } = await createResponse.json() as { project_id: string };
    console.log(JSON.stringify({ level: 'INFO', message: 'ImagenAI project created', jobId, project_id }));

    // 2. Upload each RAW file (process in chunks of 10 to respect Lambda timeout)
    const CHUNK_SIZE = 10;
    for (let i = 0; i < rawKeys.length; i += CHUNK_SIZE) {
      const chunk = rawKeys.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (key) => {
        const fileBuffer = await getS3ObjectAsBuffer(key);
        const filename = key.split('/').pop() || 'photo.raw';

        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]), filename);

        const uploadResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${project_id}/photos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${IMAGENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(`Failed to upload ${filename}: ${uploadResponse.status} ${errText}`);
        }
      }));
    }

    // 3. Start editing
    const startResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${project_id}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IMAGENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!startResponse.ok) {
      const errText = await startResponse.text();
      throw new Error(`Failed to start ImagenAI editing: ${startResponse.status} ${errText}`);
    }

    // 4. Update job record with project ID and processing status
    await updateJobStatus(jobId, {
      status: 'processing',
      imagenProjectId: project_id,
    });

    console.log(JSON.stringify({ level: 'INFO', message: 'Orchestrator complete', jobId, project_id }));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: 'ERROR', message: 'Orchestrator failed', jobId, error: errorMessage }));
    await updateJobStatus(jobId, {
      status: 'failed',
      error: errorMessage,
    });
  }
};
