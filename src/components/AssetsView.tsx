import  { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Link as LinkIcon, FileText, Image as ImageIcon, Trash2, Tag, ExternalLink } from 'lucide-react';

export default function AssetsView() {
  const { assets, addAsset, deleteAsset } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [assetType, setAssetType] = useState<'document' | 'image' | 'link'>('link');
  const [assetName, setAssetName] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetTags, setAssetTags] = useState('');

  const handleAdd = () => {
    if (!assetName || !assetUrl) return;
    addAsset({
      name: assetName,
      type: assetType,
      url: assetUrl,
      tags: assetTags.split(',').map(t => t.trim()).filter(Boolean)
    });
    setAssetName('');
    setAssetUrl('');
    setAssetTags('');
    setIsAdding(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-pink-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-emerald-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="h-full bg-surface-bg p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            Operational Asset Library
          </h1>
          <p className="text-sm text-text-secondary mt-1">Manage workspace links, reference URLs, and operational digital assets.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-primary text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {isAdding && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Create New Asset</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Asset Name</label>
              <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} className="w-full bg-surface-bg border border-gray-200 rounded-lg p-2 text-sm focus:border-brand-primary outline-none" placeholder="e.g. My Important Document" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Asset Type</label>
              <select value={assetType} onChange={e => setAssetType(e.target.value as any)} className="w-full bg-surface-bg border border-gray-200 rounded-lg p-2 text-sm focus:border-brand-primary outline-none">
                <option value="link">URL Link</option>
                <option value="document">Document (Paste URL for now)</option>
                <option value="image">Image (Paste URL for now)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Asset URL / Link</label>
              <input type="text" value={assetUrl} onChange={e => setAssetUrl(e.target.value)} className="w-full bg-surface-bg border border-gray-200 rounded-lg p-2 text-sm focus:border-brand-primary outline-none" placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Tags (Comma separated)</label>
              <input type="text" value={assetTags} onChange={e => setAssetTags(e.target.value)} className="w-full bg-surface-bg border border-gray-200 rounded-lg p-2 text-sm focus:border-brand-primary outline-none" placeholder="finance, important, receipt" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
            <button onClick={handleAdd} disabled={!assetName || !assetUrl} className="px-4 py-2 text-sm text-white bg-brand-primary hover:bg-cyan-700 disabled:opacity-50 rounded-lg font-medium">Save Asset</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {assets.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <p>No assets added yet. Save workspace links or operational documents to build your asset library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:border-brand-primary/50 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-bg flex items-center justify-center border border-gray-100">
                      {getIcon(asset.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary line-clamp-1">{asset.name}</h4>
                      <p className="text-xs text-gray-500 capitalize">{asset.type}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteAsset(asset.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {asset.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      <Tag className="w-3 h-3" /> {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-primary hover:underline flex items-center gap-1">
                    Open Asset <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
