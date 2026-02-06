import React, { useState, useEffect, useCallback } from 'react';
import { dynamoService } from '../services/dynamoService';
import { Button } from './Button';
import { Input, Select } from './Input';
import { Modal } from './Modal';
import { TableDescription, KeySchemaElement } from '../types';

interface ItemExplorerProps {
  table: TableDescription;
}

export const ItemExplorer: React.FC<ItemExplorerProps> = ({ table }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'SCAN' | 'QUERY'>('SCAN');
  const [selectedIndex, setSelectedIndex] = useState<string>('__TABLE__'); // __TABLE__ is base table
  const [queryKeys, setQueryKeys] = useState<Record<string, string>>({});
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string>('{}');
  const [modalError, setModalError] = useState<string | null>(null);

  // Determine active keys based on selection
  const getActiveKeySchema = useCallback((): KeySchemaElement[] => {
    if (selectedIndex === '__TABLE__') return table.KeySchema;
    const gsi = table.GlobalSecondaryIndexes?.find(g => g.IndexName === selectedIndex);
    return gsi ? gsi.KeySchema : [];
  }, [selectedIndex, table]);

  const activeSchema = getActiveKeySchema();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let result;
      const indexName = selectedIndex === '__TABLE__' ? undefined : selectedIndex;

      if (mode === 'SCAN') {
        result = await dynamoService.scanItems(table.TableName, indexName);
      } else {
        // Build conditions
        const conditions = activeSchema.map(k => {
          const val = queryKeys[k.AttributeName];
          // Simple type inference for demo
          const typedVal = !isNaN(Number(val)) && val !== '' ? Number(val) : val;
          return {
            key: k.AttributeName,
            value: typedVal,
            type: k.KeyType
          };
        }).filter(c => c.value !== undefined && c.value !== '');

        if (conditions.length === 0) {
            // Can't query without keys
            setItems([]);
            setLoading(false);
            return;
        }

        result = await dynamoService.queryItems(table.TableName, conditions, indexName);
      }
      setItems(result.Items || []);
    } catch (err) {
      console.error(err);
      alert('Operation failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedIndex, table.TableName, queryKeys, activeSchema]);

  useEffect(() => {
    // Auto-fetch on scan mode switch or index change if Scan
    if (mode === 'SCAN') {
      fetchData();
    } else {
      setItems([]); // Clear items when switching to Query until searched
    }
  }, [mode, selectedIndex, fetchData]);

  const handleSaveItem = async () => {
    try {
      const parsed = JSON.parse(editingItem);
      await dynamoService.putItem(table.TableName, parsed);
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      setModalError("Invalid JSON or DynamoDB Error: " + e.message);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    // Construct key for deletion (ALWAYS uses base table KeySchema)
    const key: Record<string, any> = {};
    table.KeySchema.forEach(k => {
      key[k.AttributeName] = item[k.AttributeName];
    });

    try {
      await dynamoService.deleteItem(table.TableName, key);
      fetchData();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleEditClick = (item: any) => {
    setEditingItem(JSON.stringify(item, null, 2));
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    // Pre-fill keys
    const template: Record<string, any> = {};
    table.KeySchema.forEach(k => template[k.AttributeName] = "");
    setEditingItem(JSON.stringify(template, null, 2));
    setModalError(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-40">
            <Select
              label="Operation"
              value={mode}
              onChange={e => setMode(e.target.value as 'SCAN' | 'QUERY')}
              options={[
                { value: 'SCAN', label: 'Scan' },
                { value: 'QUERY', label: 'Query' }
              ]}
            />
          </div>
          <div className="w-64">
            <Select
              label="Index"
              value={selectedIndex}
              onChange={e => {
                  setSelectedIndex(e.target.value);
                  setQueryKeys({});
              }}
              options={[
                { value: '__TABLE__', label: 'Base Table' },
                ...(table.GlobalSecondaryIndexes || []).map(g => ({ value: g.IndexName, label: `${g.IndexName} (GSI)` }))
              ]}
            />
          </div>
        </div>

        <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
                {loading ? 'Running...' : 'Run'}
            </Button>
            <Button onClick={handleCreateClick}>
                Create Item
            </Button>
        </div>
      </div>

      {mode === 'QUERY' && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Partition & Sort Keys for {selectedIndex === '__TABLE__' ? table.TableName : selectedIndex}
          </div>
          {activeSchema.map((k) => (
            <Input
              key={k.AttributeName}
              label={`${k.AttributeName} (${k.KeyType})`}
              value={queryKeys[k.AttributeName] || ''}
              onChange={(e) => setQueryKeys({...queryKeys, [k.AttributeName]: e.target.value})}
              placeholder={`Enter value for ${k.AttributeName}`}
            />
          ))}
        </div>
      )}

      {/* Results Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-900">
              <tr>
                <th className="px-4 py-3 w-20">Actions</th>
                {table.KeySchema.map(k => (
                    <th key={k.AttributeName} className="px-4 py-3 text-blue-700">{k.AttributeName} (PK/SK)</th>
                ))}
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No items found or executed yet.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => handleDeleteItem(item)} className="text-red-600 hover:text-red-800 font-medium">Del</button>
                    </td>
                    {table.KeySchema.map(k => (
                        <td key={k.AttributeName} className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                            {String(item[k.AttributeName] ?? '-')}
                        </td>
                    ))}
                    <td className="px-4 py-3">
                        <pre className="text-xs text-slate-500 overflow-hidden max-h-20 max-w-lg truncate">
                            {JSON.stringify(item)}
                        </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
             <span>Count: {items.length}</span>
             {items.length === 50 && <span>(Limit reached)</span>}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit / Create Item">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter the item JSON. Ensure data types match the schema definitions (e.g. Numbers vs Strings).
          </p>
          <textarea
            className="w-full h-64 p-3 font-mono text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:outline-none"
            value={editingItem}
            onChange={e => setEditingItem(e.target.value)}
          />
          {modalError && <div className="text-red-600 text-sm">{modalError}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save Item</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};