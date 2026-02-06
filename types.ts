export interface KeySchemaElement {
  AttributeName: string;
  KeyType: 'HASH' | 'RANGE';
}

export interface AttributeDefinition {
  AttributeName: string;
  AttributeType: 'S' | 'N' | 'B';
}

export interface ProvisionedThroughput {
  ReadCapacityUnits: number;
  WriteCapacityUnits: number;
}

export interface GlobalSecondaryIndex {
  IndexName: string;
  KeySchema: KeySchemaElement[];
  Projection: {
    ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    NonKeyAttributes?: string[];
  };
  ProvisionedThroughput?: ProvisionedThroughput;
}

export interface StreamSpecification {
  StreamEnabled: boolean;
  StreamViewType?: 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES' | 'KEYS_ONLY';
}

export interface TableDescription {
  TableName: string;
  TableStatus: string;
  CreationDateTime: Date;
  TableSizeBytes: number;
  ItemCount: number;
  TableArn: string;
  KeySchema: KeySchemaElement[];
  AttributeDefinitions: AttributeDefinition[];
  GlobalSecondaryIndexes?: GlobalSecondaryIndex[];
  StreamSpecification?: StreamSpecification;
  LatestStreamLabel?: string;
  LatestStreamArn?: string;
}

export interface TimeToLiveDescription {
  TimeToLiveStatus: 'ENABLING' | 'DISABLING' | 'ENABLED' | 'DISABLED';
  AttributeName?: string;
}

export type DynamoValue = string | number | boolean | null | { [key: string]: DynamoValue } | DynamoValue[];

export interface ScanQueryOptions {
  tableName: string;
  indexName?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  keyConditions?: Record<string, any>; // For Query
}
