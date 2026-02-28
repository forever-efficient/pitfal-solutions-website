/**
 * @fileoverview DynamoDB database utilities for Lambda functions.
 * Provides typed wrappers around AWS SDK DynamoDB operations with
 * document client support for automatic marshalling/unmarshalling.
 * @module lambda/shared/db
 */

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

/**
 * DynamoDB Document Client instance configured for automatic marshalling.
 * Initialized once per Lambda cold start for optimal performance.
 */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

/**
 * Constructs the full DynamoDB table name with environment prefix.
 * @param baseName - The base table name (e.g., 'inquiries', 'galleries')
 * @returns The full table name with prefix (e.g., 'pitfal-prod-inquiries')
 * @example
 * const tableName = getTableName('inquiries'); // 'pitfal-prod-inquiries'
 */
export function getTableName(baseName: string): string {
  const prefix = process.env.TABLE_PREFIX || 'pitfal-prod';
  return `${prefix}-${baseName}`;
}

/**
 * Retrieves a single item from DynamoDB by primary key.
 * @template T - The expected shape of the returned item
 * @param params - GetCommand parameters including TableName and Key
 * @returns The item if found, or null if not found
 * @example
 * const inquiry = await getItem<Inquiry>({
 *   TableName: getTableName('inquiries'),
 *   Key: { id: 'abc-123' }
 * });
 */
export async function getItem<T>(params: GetCommandInput): Promise<T | null> {
  const result = await docClient.send(new GetCommand(params));
  return (result.Item as T) || null;
}

/**
 * Creates or replaces an item in DynamoDB.
 * @param params - PutCommand parameters including TableName and Item
 * @throws Will throw if the operation fails
 */
export async function putItem(params: PutCommandInput): Promise<void> {
  await docClient.send(new PutCommand(params));
}

/**
 * Updates an existing item in DynamoDB.
 * @param params - UpdateCommand parameters including TableName, Key, and UpdateExpression
 * @throws Will throw if the item doesn't exist or operation fails
 */
export async function updateItem(params: UpdateCommandInput): Promise<void> {
  await docClient.send(new UpdateCommand(params));
}

/**
 * Deletes an item from DynamoDB.
 * @param params - DeleteCommand parameters including TableName and Key
 */
export async function deleteItem(params: DeleteCommandInput): Promise<void> {
  await docClient.send(new DeleteCommand(params));
}

/**
 * Queries items from DynamoDB using a key condition expression.
 * Returns up to 1MB of data (DynamoDB limit). For larger result sets,
 * use {@link queryAllItems} for automatic pagination.
 * @template T - The expected shape of the returned items
 * @param params - QueryCommand parameters including TableName and KeyConditionExpression
 * @returns Array of matching items
 */
export async function queryItems<T>(params: QueryCommandInput): Promise<T[]> {
  const result = await docClient.send(new QueryCommand(params));
  return (result.Items as T[]) || [];
}

/**
 * Scans all items from a DynamoDB table.
 * Warning: Scans are expensive and should be avoided in production for large tables.
 * @template T - The expected shape of the returned items
 * @param params - ScanCommand parameters including TableName
 * @returns Array of all items in the table
 */
export async function scanItems<T>(params: ScanCommandInput): Promise<T[]> {
  const result = await docClient.send(new ScanCommand(params));
  return (result.Items as T[]) || [];
}

/**
 * Queries all items matching a condition with automatic pagination.
 * Handles DynamoDB's 1MB response limit by making multiple requests.
 * @template T - The expected shape of the returned items
 * @param params - QueryCommand parameters including TableName and KeyConditionExpression
 * @param maxItems - Safety limit on total items returned (default 10000)
 * @returns Array of all matching items across all pages
 */
export async function queryAllItems<T>(params: QueryCommandInput, maxItems: number = 10000): Promise<T[]> {
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
  } while (lastKey && items.length < maxItems);

  return items;
}

/**
 * Builds a DynamoDB update expression from a plain object.
 * Automatically generates attribute names and values to avoid reserved word conflicts.
 * @param updates - Object with field names and their new values
 * @returns Object containing UpdateExpression, ExpressionAttributeNames, and ExpressionAttributeValues
 * @example
 * const expr = buildUpdateExpression({ status: 'completed', updatedAt: timestamp });
 * // Returns:
 * // {
 * //   UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
 * //   ExpressionAttributeNames: { '#attr0': 'status', '#attr1': 'updatedAt' },
 * //   ExpressionAttributeValues: { ':val0': 'completed', ':val1': '2026-01-26T...' }
 * // }
 */
/**
 * Atomically increments a numeric counter on a DynamoDB item.
 * Uses ADD expression which treats missing attributes as 0.
 * @param tableName - The DynamoDB table name
 * @param key - The primary key of the item
 * @param counterName - The attribute name to increment
 * @param amount - The amount to add (default 1)
 */
export async function incrementCounter(
  tableName: string,
  key: Record<string, unknown>,
  counterName: string,
  amount: number = 1
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: 'ADD #counter :amount',
      ExpressionAttributeNames: { '#counter': counterName },
      ExpressionAttributeValues: { ':amount': amount },
    })
  );
}

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
