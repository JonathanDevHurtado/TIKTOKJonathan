import { createClient } from '../../utils/supabase/server';
import { uploadVideo } from './actions';
import { Upload } from 'lucide-react';

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('*');

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto">
      <div className="bg-[#121212] border border-tiktok-dark-hover rounded-2xl p-6 md:p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Subir video</h1>
        <p className="text-tiktok-gray mb-8">Publica un video en tu cuenta</p>

        <form action={uploadVideo} className="flex flex-col md:flex-row gap-8">
          
          {/* File Input Area */}
          <div className="flex-1">
            <label className="border-2 border-dashed border-tiktok-dark-hover hover:border-tiktok-red hover:bg-[#1e1e1e]/50 rounded-2xl flex flex-col items-center justify-center h-[400px] cursor-pointer transition-colors group">
              <Upload className="w-12 h-12 text-tiktok-gray group-hover:text-tiktok-red mb-4" />
              <span className="text-white font-semibold mb-2">Selecciona un video para subir</span>
              <span className="text-tiktok-gray text-sm text-center px-4">
                Arrastra y suelta un archivo MP4 o WebM<br/>
                Menos de 50MB
              </span>
              <input type="file" name="video_file" accept="video/mp4,video/webm" className="hidden" required />
            </label>
          </div>

          {/* Details Area */}
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
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-auto flex gap-4 pt-4 border-t border-tiktok-dark-hover">
              <button type="button" className="flex-1 bg-[#1e1e1e] hover:bg-tiktok-dark-hover text-white font-bold py-3 rounded-xl transition-colors">
                Descartar
              </button>
              <button type="submit" className="flex-1 bg-tiktok-red hover:bg-[#e0254b] text-white font-bold py-3 rounded-xl transition-colors">
                Publicar
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
