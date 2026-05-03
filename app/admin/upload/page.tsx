'use client';
import React, { useState, useEffect } from 'react';

export default function AdminBackgroundUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [backgrounds, setBackgrounds] = useState<{_id: string, name: string, url: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBackgrounds = async () => {
    const res = await fetch('/api/admin/backgrounds', { cache: 'no-store' });
    if (res.ok) setBackgrounds(await res.json());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBackgrounds();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch('/api/admin/backgrounds', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      setFile(null);
      fetchBackgrounds();
    } else {
      alert('Upload failed');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Upload New Background Image</h1>
        <form onSubmit={handleUpload} className="space-y-4">
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full border border-gray-300 p-2 rounded"
          />
          <button 
            type="submit" 
            disabled={loading || !file}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Available Background Images</h2>
        <div className="grid grid-cols-3 gap-4">
          {backgrounds.map((bg) => (
            <div key={bg._id} className="border p-2 rounded">
              <img src={bg.url} alt={bg.name} className="w-full h-32 object-cover mb-2" />
              <p className="text-sm truncate">{bg.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
