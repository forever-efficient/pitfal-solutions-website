// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.hoisted(() => vi.fn());
const mockDocClientFrom = vi.hoisted(() => vi.fn(() => ({ send: mockSend })));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: mockDocClientFrom,
  },
  GetCommand: vi.fn((params) => ({ ...params, _type: 'GetCommand' })),
  PutCommand: vi.fn((params) => ({ ...params, _type: 'PutCommand' })),
  UpdateCommand: vi.fn((params) => ({ ...params, _type: 'UpdateCommand' })),
  DeleteCommand: vi.fn((params) => ({ ...params, _type: 'DeleteCommand' })),
  QueryCommand: vi.fn((params) => ({ ...params, _type: 'QueryCommand' })),
  ScanCommand: vi.fn((params) => ({ ...params, _type: 'ScanCommand' })),
}));

const {
  getTableName,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems,
  queryAllItems,
  buildUpdateExpression,
} = await import('../../../lambda/shared/db');

describe('lambda/shared/db', () => {
  beforeEach(() => {
    mockSend.mockReset();
    delete process.env.TABLE_PREFIX;
  });

  it('initializes document client with expected marshalling options', () => {
    expect(mockDocClientFrom).toHaveBeenCalledTimes(1);
    expect(mockDocClientFrom.mock.calls[0][1]).toEqual({
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });
  });

  it('builds table name with default and custom prefix', () => {
    expect(getTableName('inquiries')).toBe('pitfal-prod-inquiries');

    process.env.TABLE_PREFIX = 'pitfal-dev';
    expect(getTableName('galleries')).toBe('pitfal-dev-galleries');
  });

  it('gets single item and returns null when no item found', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { id: '1', status: 'new' } })
      .mockResolvedValueOnce({});

    const item = await getItem<{ id: string; status: string }>({
      TableName: 'tbl',
      Key: { id: '1' },
    });
    const missing = await getItem<{ id: string }>({
      TableName: 'tbl',
      Key: { id: '2' },
    });

    expect(item).toEqual({ id: '1', status: 'new' });
    expect(missing).toBeNull();
    expect(mockSend.mock.calls[0][0]._type).toBe('GetCommand');
  });

  it('puts, updates, and deletes items', async () => {
    mockSend.mockResolvedValue({});

    await putItem({ TableName: 'tbl', Item: { id: '1' } });
    await updateItem({
      TableName: 'tbl',
      Key: { id: '1' },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'done' },
    });
    await deleteItem({ TableName: 'tbl', Key: { id: '1' } });

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(mockSend.mock.calls[0][0]._type).toBe('PutCommand');
    expect(mockSend.mock.calls[1][0]._type).toBe('UpdateCommand');
    expect(mockSend.mock.calls[2][0]._type).toBe('DeleteCommand');
  });

  it('queries and scans items with empty fallback arrays', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: 'q1' }] })
      .mockResolvedValueOnce({});

    const queried = await queryItems<{ id: string }>({
      TableName: 'tbl',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'A' },
    });
    const scanned = await scanItems<{ id: string }>({ TableName: 'tbl' });

    expect(queried).toEqual([{ id: 'q1' }]);
    expect(scanned).toEqual([]);
    expect(mockSend.mock.calls[0][0]._type).toBe('QueryCommand');
    expect(mockSend.mock.calls[1][0]._type).toBe('ScanCommand');
  });

  it('paginates queryAllItems until LastEvaluatedKey is exhausted', async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ id: 'p1' }],
        LastEvaluatedKey: { pk: 'NEXT' },
      })
      .mockResolvedValueOnce({
        Items: [{ id: 'p2' }],
      });

    const items = await queryAllItems<{ id: string }>({
      TableName: 'tbl',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'A' },
    });

    expect(items).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls[0][0].ExclusiveStartKey).toBeUndefined();
    expect(mockSend.mock.calls[1][0].ExclusiveStartKey).toEqual({ pk: 'NEXT' });
  });

  it('stops queryAllItems at maxItems safety limit', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [{ id: '1' }, { id: '2' }],
      LastEvaluatedKey: { pk: 'NEXT' },
    });

    const items = await queryAllItems<{ id: string }>(
      {
        TableName: 'tbl',
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': 'A' },
      },
      2
    );

    expect(items).toEqual([{ id: '1' }, { id: '2' }]);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('builds update expressions for populated and empty updates', () => {
    const expression = buildUpdateExpression({ status: 'complete', retries: 1 });
    expect(expression).toEqual({
      UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1',
      ExpressionAttributeNames: {
        '#attr0': 'status',
        '#attr1': 'retries',
      },
      ExpressionAttributeValues: {
        ':val0': 'complete',
        ':val1': 1,
      },
    });

    const empty = buildUpdateExpression({});
    expect(empty).toEqual({
      UpdateExpression: 'SET ',
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
    });
  });
});
