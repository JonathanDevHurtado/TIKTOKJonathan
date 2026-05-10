"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { Upload as UploadIcon } from 'lucide-react';
import { useSession } from '../SessionProvider';

const CATEGORY_OPTIONS = [
  "gaming", "cocina", "paisajes", "musica", "tecnologia", "deportes", "arte", "viajes", "moda", "fitness", 
  "bienestar", "naturaleza", "aventura", "vlogs", "cine", "anime", "hardware", "noticias", "humor", 
  "educacion", "diseño", "motor", "mascotas", "fotografia", "historia", "ciencia", "curiosidades", "negocios"
];

export default function UploadVideoForm() {
  const session = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, [session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const file = formData.get('video_file');
    const description = formData.get('description');
    const categoryValue = formData.get('category_id');
    const dbCategory = categories.find(c => c.name === categoryValue);
    const categoryId = dbCategory ? dbCategory.id : null;

    if (!file || file.size === 0) {
      setError('Debes seleccionar un video');
      setLoading(false);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}_${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('videos').insert({
        user_id: session.user.id,
        video_url: publicUrl,
        description: description,
        category_id: categoryId || null
      });

      if (dbError) throw dbError;

      router.push('/profile/me');
    } catch (err) {
      setError(err.message || 'Error al subir el video');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full h-[calc(100vh-64px)] md:h-full overflow-y-auto">
      <div className="bg-[#121212] border border-tiktok-dark-hover rounded-2xl p-6 md:p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Subir video</h1>
        <p className="text-tiktok-gray mb-8">Publica un video en tu cuenta</p>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-xl mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          
          <div className="flex-1">
            <label className={`border-2 ${previewUrl ? 'border-solid border-tiktok-dark-hover' : 'border-dashed border-tiktok-dark-hover hover:border-tiktok-red hover:bg-[#1e1e1e]/50'} rounded-2xl flex flex-col items-center justify-center h-[300px] md:h-[400px] cursor-pointer transition-colors group relative overflow-hidden`}>
              {previewUrl ? (
                <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center">
                  {selectedFile?.type?.startsWith('image/') ? (
                    <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" />
                  ) : (
                    <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" autoPlay loop muted playsInline />
                  )}
                  <div className="z-10 bg-black/80 border border-tiktok-dark-hover px-4 py-2 rounded-xl text-white font-semibold text-sm flex flex-col items-center gap-1 shadow-xl">
                    <span className="text-tiktok-cyan">¡Archivo listo!</span>
                    <span className="truncate max-w-[200px] text-xs text-tiktok-gray">{selectedFile?.name}</span>
                  </div>
                </div>
              ) : (
                <>
                  <UploadIcon className="w-12 h-12 text-tiktok-gray group-hover:text-tiktok-red mb-4" />
                  <span className="text-white font-semibold mb-2">Selecciona un video</span>
                  <span className="text-tiktok-gray text-sm text-center px-4">
                    MP4 o WebM<br/>Menos de 50MB
                  </span>
                </>
              )}
              <input type="file" name="video_file" accept="video/mp4,video/webm" className="hidden" required onChange={handleFileChange} />
            </label>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Leyenda / Descripción</label>
              <textarea 
                name="description"
                rows="4" 
                className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tiktok-gray transition-colors resize-none"
                placeholder="Cuenta de qué trata tu video..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Categoría</label>
              <select 
                name="category_id"
                className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tiktok-gray transition-colors appearance-none"
              >
                <option value="">Selecciona una categoría</option>
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="mt-auto flex gap-4 pt-4 border-t border-tiktok-dark-hover">
              <button type="button" onClick={() => router.back()} className="flex-1 bg-[#1e1e1e] hover:bg-tiktok-dark-hover text-white font-bold py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button disabled={loading} type="submit" className="flex-1 bg-tiktok-red hover:bg-[#e0254b] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'Subiendo...' : 'Publicar'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
