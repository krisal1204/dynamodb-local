import React, { useEffect, useState } from 'react';
import { dynamoService } from '../services/dynamoService';
import { TableDescription, TimeToLiveDescription } from '../types';
import { ItemExplorer } from './ItemExplorer';
import { Button } from './Button';
import { Input } from './Input';

interface TableDetailsProps {
  tableName: string;
  onBack: () => void;
}

export const TableDetails: React.FC<TableDetailsProps> = ({ tableName, onBack }) => {
  const [table, setTable] = useState<TableDescription | null>(null);
  const [ttl, setTtl] = useState<TimeToLiveDescription | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ITEMS'>('OVERVIEW');
  const [ttlInput, setTtlInput] = useState('');
  
  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  const loadDetails = async () => {
    try {
      const desc = await dynamoService.describeTable(tableName);
      setTable(desc.Table as TableDescription);
      const ttlDesc = await dynamoService.describeTTL(tableName);
      if (ttlDesc) {
        setTtl(ttlDesc.TimeToLiveDescription as TimeToLiveDescription);
        setTtlInput(ttlDesc.TimeToLiveDescription?.AttributeName || '');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load table details');
      onBack();
    }
  };

  const handleUpdateTTL = async () => {
    if (!ttlInput) return;
    try {
      await dynamoService.updateTTL(tableName, true, ttlInput);
      loadDetails();
      alert('TTL Updated. It may take a moment to propagate.');
    } catch (e: any) {
      alert('Failed to update TTL: ' + e.message);
    }
  };

  const handleDisableTTL = async () => {
    try {
      await dynamoService.updateTTL(tableName, false, ttl?.AttributeName || 'ttl'); // attr name required even if disabling
      loadDetails();
    } catch (e: any) {
      alert('Failed to disable TTL: ' + e.message);
    }
  };

  const handleToggleStream = async () => {
    if (!table) return;
    const isEnabled = table.StreamSpecification?.StreamEnabled;
    try {
      await dynamoService.updateTableStreams(tableName, {
        StreamEnabled: !isEnabled,
        StreamViewType: !isEnabled ? 'NEW_AND_OLD_IMAGES' : undefined
      });
      loadDetails();
    } catch (e: any) {
      alert('Failed to update streams: ' + e.message);
    }
  };

  if (!table) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h1 className="text-2xl font-bold text-slate-900">{table.TableName}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${table.TableStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {table.TableStatus}
        </span>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'OVERVIEW' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ITEMS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Items & Query
        </button>
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Configuration</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Item Count</span>
                <span className="font-mono">{table.ItemCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Size (Bytes)</span>
                <span className="font-mono">{table.TableSizeBytes}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Created</span>
                <span>{new Date(table.CreationDateTime).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">ARN</span>
                <span className="font-mono text-xs truncate max-w-[200px]">{table.TableArn}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Time To Live (TTL)</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-600">Status: <b>{ttl?.TimeToLiveStatus || 'DISABLED'}</b></span>
                {ttl?.TimeToLiveStatus === 'ENABLED' && (
                  <Button size="sm" variant="secondary" onClick={handleDisableTTL}>Disable</Button>
                )}
              </div>
              {ttl?.TimeToLiveStatus !== 'ENABLED' && (
                <div className="flex gap-2 items-end">
                   <Input 
                      label="Attribute Name" 
                      placeholder="e.g. expireAt"
                      value={ttlInput}
                      onChange={e => setTtlInput(e.target.value)}
                   />
                   <Button onClick={handleUpdateTTL}>Enable</Button>
                </div>
              )}
               {ttl?.TimeToLiveStatus === 'ENABLED' && (
                 <p className="text-sm text-slate-500">Attribute: <span className="font-mono bg-slate-100 px-1 rounded">{ttl.AttributeName}</span></p>
               )}
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Streams</h3>
              <div className="flex items-center justify-between">
                <div>
                   <div className="text-sm text-slate-600 mb-1">Status: <b>{table.StreamSpecification?.StreamEnabled ? 'ENABLED' : 'DISABLED'}</b></div>
                   {table.StreamSpecification?.StreamEnabled && (
                     <div className="text-xs text-slate-400">View Type: {table.StreamSpecification.StreamViewType}</div>
                   )}
                </div>
                <Button size="sm" variant={table.StreamSpecification?.StreamEnabled ? "danger" : "primary"} onClick={handleToggleStream}>
                  {table.StreamSpecification?.StreamEnabled ? 'Disable Streams' : 'Enable Streams'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ItemExplorer table={table} />
      )}
    </div>
  );
};