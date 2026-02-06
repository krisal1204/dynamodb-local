import {
  DynamoDBClient,
  ListTablesCommand,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  UpdateTableCommand,
  DescribeTimeToLiveCommand,
  UpdateTimeToLiveCommand,
  AttributeDefinition,
  KeySchemaElement,
  StreamSpecification,
  GlobalSecondaryIndex,
  ScalarAttributeType,
  KeyType,
  ProjectionType,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

// Configuration for Local DynamoDB
const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1", // Region doesn't matter for local, but is required
  credentials: {
    accessKeyId: "fake",
    secretAccessKey: "fake",
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export const dynamoService = {
  // --- Table Operations ---

  listTables: async () => {
    const command = new ListTablesCommand({});
    return await client.send(command);
  },

  describeTable: async (tableName: string) => {
    const command = new DescribeTableCommand({ TableName: tableName });
    return await client.send(command);
  },

  describeTTL: async (tableName: string) => {
    try {
      const command = new DescribeTimeToLiveCommand({ TableName: tableName });
      return await client.send(command);
    } catch (e) {
      console.warn("TTL describe failed (might not be supported on this version of local):", e);
      return null;
    }
  },

  createTable: async (
    tableName: string,
    keySchema: KeySchemaElement[],
    attributes: AttributeDefinition[],
    gsis: GlobalSecondaryIndex[] = [],
    streamSpec?: StreamSpecification
  ) => {
    const command = new CreateTableCommand({
      TableName: tableName,
      KeySchema: keySchema,
      AttributeDefinitions: attributes,
      GlobalSecondaryIndexes: gsis.length > 0 ? gsis : undefined,
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
      StreamSpecification: streamSpec,
    });
    return await client.send(command);
  },

  deleteTable: async (tableName: string) => {
    const command = new DeleteTableCommand({ TableName: tableName });
    return await client.send(command);
  },

  updateTTL: async (tableName: string, enabled: boolean, attributeName: string) => {
    const command = new UpdateTimeToLiveCommand({
      TableName: tableName,
      TimeToLiveSpecification: {
        Enabled: enabled,
        AttributeName: attributeName,
      },
    });
    return await client.send(command);
  },

  updateTableStreams: async (tableName: string, streamSpec: StreamSpecification) => {
    const command = new UpdateTableCommand({
      TableName: tableName,
      StreamSpecification: streamSpec,
    });
    return await client.send(command);
  },

  // --- Item Operations ---

  scanItems: async (tableName: string, indexName?: string) => {
    const command = new ScanCommand({
      TableName: tableName,
      IndexName: indexName,
      Limit: 50, // Hard limit for UI performance
    });
    return await docClient.send(command);
  },

  queryItems: async (
    tableName: string,
    keyConditions: { key: string; value: any; type: string }[],
    indexName?: string
  ) => {
    // Construct KeyConditionExpression dynamically
    const expression = keyConditions.map((k, i) => `#k${i} = :v${i}`).join(" AND ");
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    keyConditions.forEach((k, i) => {
      names[`#k${i}`] = k.key;
      values[`:v${i}`] = k.value;
    });

    const command = new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: expression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    });
    return await docClient.send(command);
  },

  putItem: async (tableName: string, item: any) => {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    return await docClient.send(command);
  },

  deleteItem: async (tableName: string, key: Record<string, any>) => {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    return await docClient.send(command);
  },
};
