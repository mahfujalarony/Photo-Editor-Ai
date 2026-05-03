'use client';
import React, { useState, useEffect } from 'react';

export default function AdminBackgroundUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
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
    if (!files.length) return;

    setLoading(true);
    
    try {
      const uploadPromises = files.map(file => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch('/api/admin/backgrounds', {
          method: 'POST',
          body: formData,
        });
      });

      const results = await Promise.all(uploadPromises);
      
      if (results.every(res => res.ok)) {
        setFiles([]);
        fetchBackgrounds();
      } else {
        alert('Some uploads failed');
      }
    } catch (error) {
      console.error(error);
      alert('Upload request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this background?')) return;
    
    try {
      const res = await fetch(`/api/admin/backgrounds?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBackgrounds();
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error(error);
      alert('Delete request failed');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Upload New Background Image</h1>
        <form onSubmit={handleUpload} className="space-y-4">
          <input 
            type="file" 
            accept="image/*" 
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="block w-full border border-gray-300 p-2 rounded"
          />
          <p className="text-sm text-gray-500">
            {files.length > 0 ? `${files.length} file(s) selected` : 'Select one or more images'}
          </p>
          <button 
            type="submit" 
            disabled={loading || files.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload All'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Available Background Images</h2>
        <div className="grid grid-cols-3 gap-4">
          {backgrounds.map((bg) => (
            <div key={bg._id} className="border p-2 rounded relative group">
              <img src={bg.url} alt={bg.name} className="w-full h-32 object-cover mb-2" />
              <p className="text-sm truncate pr-8">{bg.name}</p>
              <button 
                onClick={() => handleDelete(bg._id)}
                className="absolute bottom-2 right-2 text-red-500 hover:text-red-700 bg-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
