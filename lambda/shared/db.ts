import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client with document client wrapper
const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

// Table name helpers
export function getTableName(baseName: string): string {
  const prefix = process.env.TABLE_PREFIX || 'pitfal-prod';
  return `${prefix}-${baseName}`;
}

// Generic CRUD operations
export async function getItem<T>(params: GetCommandInput): Promise<T | null> {
  const result = await docClient.send(new GetCommand(params));
  return (result.Item as T) || null;
}

export async function putItem(params: PutCommandInput): Promise<void> {
  await docClient.send(new PutCommand(params));
}

export async function updateItem(params: UpdateCommandInput): Promise<void> {
  await docClient.send(new UpdateCommand(params));
}

export async function deleteItem(params: DeleteCommandInput): Promise<void> {
  await docClient.send(new DeleteCommand(params));
}

export async function queryItems<T>(params: QueryCommandInput): Promise<T[]> {
  const result = await docClient.send(new QueryCommand(params));
  return (result.Items as T[]) || [];
}

export async function scanItems<T>(params: ScanCommandInput): Promise<T[]> {
  const result = await docClient.send(new ScanCommand(params));
  return (result.Items as T[]) || [];
}

// Pagination helper for queries
export async function queryAllItems<T>(params: QueryCommandInput): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...((result.Items as T[]) || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

// Build update expression from object
export function buildUpdateExpression(
  updates: Record<string, unknown>
): {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
} {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const setExpressions: string[] = [];

  Object.entries(updates).forEach(([key, value], index) => {
    const nameKey = `#attr${index}`;
    const valueKey = `:val${index}`;
    names[nameKey] = key;
    values[valueKey] = value;
    setExpressions.push(`${nameKey} = ${valueKey}`);
  });

  return {
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}
