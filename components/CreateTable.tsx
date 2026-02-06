import React, { useState } from 'react';
import { dynamoService } from '../services/dynamoService';
import { Button } from './Button';
import { Input, Select } from './Input';
import { AttributeDefinition, KeySchemaElement, GlobalSecondaryIndex } from '@aws-sdk/client-dynamodb';

interface CreateTableProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateTable: React.FC<CreateTableProps> = ({ onSuccess, onCancel }) => {
  const [tableName, setTableName] = useState('');
  const [pkName, setPkName] = useState('id');
  const [pkType, setPkType] = useState('S');
  const [skName, setSkName] = useState('');
  const [skType, setSkType] = useState('S');
  const [useStream, setUseStream] = useState(false);
  const [streamViewType, setStreamViewType] = useState('NEW_AND_OLD_IMAGES');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const keySchema: KeySchemaElement[] = [
        { AttributeName: pkName, KeyType: 'HASH' }
      ];
      const attributes: AttributeDefinition[] = [
        { AttributeName: pkName, AttributeType: pkType as any }
      ];

      if (skName) {
        keySchema.push({ AttributeName: skName, KeyType: 'RANGE' });
        attributes.push({ AttributeName: skName, AttributeType: skType as any });
      }

      await dynamoService.createTable(
        tableName,
        keySchema,
        attributes,
        [], // GSIs not implemented in this simple create view for brevity
        useStream ? { StreamEnabled: true, StreamViewType: streamViewType as any } : undefined
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
        Creating table in local DynamoDB. Provisioned throughput defaults to 5 RCU / 5 WCU.
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input 
          label="Table Name" 
          value={tableName} 
          onChange={e => setTableName(e.target.value)} 
          placeholder="e.g. Users"
          required 
        />

        <div className="grid grid-cols-2 gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="col-span-2 text-sm font-semibold text-slate-900 mb-2">Partition Key (HASH)</h3>
          <Input 
            label="Attribute Name" 
            value={pkName} 
            onChange={e => setPkName(e.target.value)} 
            required 
          />
          <Select
            label="Type"
            value={pkType}
            onChange={e => setPkType(e.target.value)}
            options={[
              { value: 'S', label: 'String' },
              { value: 'N', label: 'Number' },
              { value: 'B', label: 'Binary' }
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="col-span-2 text-sm font-semibold text-slate-900 mb-2">Sort Key (RANGE) - Optional</h3>
          <Input 
            label="Attribute Name" 
            value={skName} 
            onChange={e => setSkName(e.target.value)} 
            placeholder="Optional"
          />
          <Select
            label="Type"
            value={skType}
            onChange={e => setSkType(e.target.value)}
            disabled={!skName}
            options={[
              { value: 'S', label: 'String' },
              { value: 'N', label: 'Number' },
              { value: 'B', label: 'Binary' }
            ]}
          />
        </div>

        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="stream" 
              checked={useStream} 
              onChange={e => setUseStream(e.target.checked)}
              className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
            />
            <label htmlFor="stream" className="text-sm font-medium text-slate-900">Enable DynamoDB Streams</label>
          </div>
          
          {useStream && (
             <Select
             label="Stream View Type"
             value={streamViewType}
             onChange={e => setStreamViewType(e.target.value)}
             options={[
               { value: 'NEW_IMAGE', label: 'New Image' },
               { value: 'OLD_IMAGE', label: 'Old Image' },
               { value: 'NEW_AND_OLD_IMAGES', label: 'New and Old Images' },
               { value: 'KEYS_ONLY', label: 'Keys Only' }
             ]}
           />
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Table'}</Button>
        </div>
      </form>
    </div>
  );
};