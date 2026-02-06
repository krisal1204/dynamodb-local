import React, { useState, useEffect } from 'react';
import { dynamoService } from './services/dynamoService';
import { CreateTable } from './components/CreateTable';
import { TableDetails } from './components/TableDetails';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { Input } from './components/Input';

function App() {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAILS'>('LIST');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Configuration State
  const [endpoint, setEndpoint] = useState(dynamoService.getEndpoint());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configEndpoint, setConfigEndpoint] = useState(endpoint);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const result = await dynamoService.listTables();
      setTables(result.TableNames || []);
    } catch (e) {
      console.error(e);
      // Don't alert immediately on load, connection might be starting up
    } finally {
      setLoading(false);
    }
  };

  const handleTableClick = (tableName: string) => {
    setSelectedTable(tableName);
    setView('DETAILS');
  };

  const handleDeleteTable = async (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete table ${tableName}? This cannot be undone.`)) return;
    
    try {
      await dynamoService.deleteTable(tableName);
      fetchTables();
    } catch (err: any) {
      alert("Failed to delete table: " + err.message);
    }
  };

  const handleSaveConfig = () => {
    if (!configEndpoint) return;
    dynamoService.setEndpoint(configEndpoint);
    setEndpoint(configEndpoint);
    setIsConfigOpen(false);
    fetchTables();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md z-10 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center font-bold text-white">D</div>
             <h1 className="text-xl font-bold tracking-tight">DynamoDB Local Manager</h1>
          </div>
          <button 
            onClick={() => { setConfigEndpoint(endpoint); setIsConfigOpen(true); }}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group border border-slate-700 hover:border-slate-500 rounded-md px-3 py-1.5"
            title="Configure Endpoint"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {endpoint}
            </span>
            <svg className="w-4 h-4 text-slate-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          
          {view === 'LIST' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                  <p className="text-slate-500">Manage your local tables and items</p>
                </div>
                <div className="flex gap-2">
                   <Button variant="secondary" onClick={fetchTables} disabled={loading}>Refresh</Button>
                   <Button onClick={() => setView('CREATE')}>Create Table</Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tables.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
                      <p className="text-slate-500 mb-4">No tables found.</p>
                      <Button onClick={() => setView('CREATE')}>Create your first table</Button>
                    </div>
                  ) : (
                    tables.map((table) => (
                      <div 
                        key={table}
                        onClick={() => handleTableClick(table)}
                        className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group relative"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-blue-50 rounded-md text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteTable(e, table)}
                            className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Delete Table"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 truncate">{table}</h3>
                        <p className="text-sm text-slate-500 mt-1">Status: Active</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'CREATE' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Table</h2>
              <CreateTable 
                onSuccess={() => {
                  fetchTables();
                  setView('LIST');
                }}
                onCancel={() => setView('LIST')}
              />
            </div>
          )}

          {view === 'DETAILS' && (
            <TableDetails 
              tableName={selectedTable} 
              onBack={() => setView('LIST')} 
            />
          )}

        </div>
      </main>

      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Connection Settings">
        <div className="space-y-4">
          <Input 
            label="DynamoDB Endpoint URL" 
            value={configEndpoint} 
            onChange={e => setConfigEndpoint(e.target.value)} 
            placeholder="http://localhost:8000"
          />
          <p className="text-xs text-slate-500">
            For local Docker instances, this is usually <code>http://localhost:8000</code>. 
            Ensure your container allows CORS.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>Save & Connect</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;