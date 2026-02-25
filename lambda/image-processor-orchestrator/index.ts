import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const ADMIN_TABLE = process.env.ADMIN_TABLE!;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;
const IMAGENAI_API_KEY = process.env.IMAGENAI_API_KEY!;
const IMAGENAI_PROFILE_ID_JPG = process.env.IMAGENAI_PROFILE_ID_JPG || '';
const IMAGENAI_PROFILE_ID_RAW = process.env.IMAGENAI_PROFILE_ID_RAW || '';
const IMAGENAI_BASE_URL = 'https://api.imagen-ai.com/v1';

const JPG_EXTENSIONS = /\.(jpg|jpeg)$/i;

interface OrchestratorEvent {
  jobId: string;
  galleryId?: string;
  rawKeys: string[];
  source?: 'imagen' | 'legacy';
  profileId?: string;
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
  const { jobId, galleryId = '', rawKeys, source, profileId: eventProfileId } = event;

  if (!IMAGENAI_API_KEY?.trim()) {
    throw new Error('IMAGENAI_API_KEY is not configured. Set the environment variable to enable RAW processing.');
  }

  // Determine profile: use event override, or auto-detect from file extensions
  const isJpgBatch = rawKeys.every(key => JPG_EXTENSIONS.test(key));
  const profileId = eventProfileId || (isJpgBatch ? IMAGENAI_PROFILE_ID_JPG : IMAGENAI_PROFILE_ID_RAW);

  if (!profileId?.trim()) {
    throw new Error(`No ImagenAI profile configured for ${isJpgBatch ? 'JPG' : 'RAW'} files. Set the environment variable.`);
  }

  console.log(JSON.stringify({ level: 'INFO', message: 'Orchestrator started', jobId, galleryId, source, profileId, fileCount: rawKeys.length }));

  try {
    // Mark as uploading (include source so poller knows output path)
    await updateJobStatus(jobId, { status: 'uploading', ...(source && { source }) });

    // 1. Create ImagenAI project
    const createResponse = await fetch(`${IMAGENAI_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'x-api-key': IMAGENAI_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`ImagenAI project creation failed: ${createResponse.status} ${errText}`);
    }

    const createData = await createResponse.json() as Record<string, unknown>;
    const nested = (createData.data || {}) as Record<string, unknown>;
    const projectUuid = (nested.project_uuid || createData.project_uuid || createData.project_id || createData.id) as string;
    if (!projectUuid) {
      throw new Error(`ImagenAI project creation returned no UUID. Response: ${JSON.stringify(createData)}`);
    }
    console.log(JSON.stringify({ level: 'INFO', message: 'ImagenAI project created', jobId, projectUuid }));

    // 2. Get presigned upload links from ImagenAI
    const filesList = rawKeys.map(key => ({
      file_name: key.split('/').pop() || 'photo.raw',
    }));

    const linksResponse = await fetch(
      `${IMAGENAI_BASE_URL}/projects/${projectUuid}/get_temporary_upload_links`,
      {
        method: 'POST',
        headers: {
          'x-api-key': IMAGENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files_list: filesList }),
      }
    );

    if (!linksResponse.ok) {
      const errText = await linksResponse.text();
      throw new Error(`Failed to get upload links: ${linksResponse.status} ${errText}`);
    }

    const linksData = await linksResponse.json() as {
      data: { files_list: Array<{ file_name: string; upload_link: string }> };
    };
    const uploadLinks = linksData.data.files_list;

    // 3. Upload each file to its presigned URL (chunks of 5 for large RAW files)
    const CHUNK_SIZE = 5;
    for (let i = 0; i < rawKeys.length; i += CHUNK_SIZE) {
      const chunk = rawKeys.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (key, idx) => {
        const fileBuffer = await getS3ObjectAsBuffer(key);
        const filename = key.split('/').pop() || 'photo.raw';
        const link = uploadLinks[i + idx];

        if (!link?.upload_link) {
          throw new Error(`No upload link returned for ${filename}`);
        }

        const uploadResponse = await fetch(link.upload_link, {
          method: 'PUT',
          body: fileBuffer,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(`Failed to upload ${filename}: ${uploadResponse.status} ${errText}`);
        }

        console.log(JSON.stringify({ level: 'INFO', message: 'File uploaded', jobId, filename }));
      }));
    }

    // 4. Start editing (profile_key is passed here, not at project creation)
    const editResponse = await fetch(`${IMAGENAI_BASE_URL}/projects/${projectUuid}/edit`, {
      method: 'POST',
      headers: {
        'x-api-key': IMAGENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_key: profileId,
      }),
    });

    if (!editResponse.ok) {
      const errText = await editResponse.text();
      throw new Error(`Failed to start ImagenAI editing: ${editResponse.status} ${errText}`);
    }

    // 5. Update job record with project UUID and processing status
    await updateJobStatus(jobId, {
      status: 'processing',
      imagenProjectId: projectUuid,
    });

    console.log(JSON.stringify({ level: 'INFO', message: 'Orchestrator complete', jobId, projectUuid }));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: 'ERROR', message: 'Orchestrator failed', jobId, error: errorMessage }));
    await updateJobStatus(jobId, {
      status: 'failed',
      error: errorMessage,
    });
  }
};
