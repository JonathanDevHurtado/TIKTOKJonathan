"use client"
import { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function EditProfileModal({ isOpen, onClose, profile, onUpdate }) {
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    bio: profile?.bio || '',
    birthday: profile?.birthday || '',
    age: profile?.age || '',
    gender: profile?.gender || '',
    avatar_url: profile?.avatar_url || ''
  });

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'birthday') {
      const computedAge = calculateAge(value);
      setFormData(prev => ({ ...prev, [name]: value, age: computedAge }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      alert('Error subiendo imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          birthday: formData.birthday || null,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender,
          avatar_url: formData.avatar_url
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      onUpdate();
      onClose();
    } catch (error) {
      alert('Error actualizando perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border border-tiktok-dark-hover flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-tiktok-dark-hover bg-[#121212] sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white">Editar perfil</h2>
          <button onClick={onClose} className="text-tiktok-gray hover:text-white transition-colors p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img 
                src={formData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + formData.username} 
                className="w-24 h-24 rounded-full object-cover border-2 border-tiktok-dark-hover"
                alt="Avatar"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" />}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <p className="text-xs text-tiktok-gray mt-2">Haz clic para cambiar la foto</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-tiktok-gray mb-1">Nombre de usuario</label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-md px-4 py-2 text-white focus:outline-none focus:border-tiktok-red transition-all duration-300 hover:scale-[1.01] hover:shadow-lg focus:scale-[1.01] focus:shadow-xl"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-tiktok-gray mb-1">Biografía</label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-md px-4 py-2 text-white focus:outline-none focus:border-tiktok-red transition-all duration-300 min-h-[80px] hover:scale-[1.01] hover:shadow-lg focus:scale-[1.01] focus:shadow-xl"
                placeholder="Cuenta algo sobre ti..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-tiktok-gray mb-1">Cumpleaños</label>
                <input 
                  type="date" 
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-md px-4 py-2 text-white focus:outline-none focus:border-tiktok-red transition-all duration-300 hover:scale-[1.01] hover:shadow-lg focus:scale-[1.01] focus:shadow-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-tiktok-gray mb-1">Edad</label>
                <input 
                  type="number" 
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  readOnly
                  className="w-full bg-[#2a2a2a] border border-tiktok-dark-hover rounded-md px-4 py-2 text-white focus:outline-none opacity-80 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-tiktok-gray mb-1">Género</label>
              <select 
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-md px-4 py-2 text-white focus:outline-none focus:border-tiktok-red transition-all duration-300 appearance-none hover:scale-[1.01] hover:shadow-lg focus:scale-[1.01] focus:shadow-xl cursor-pointer"
              >
                <option value="">Seleccionar...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
                <option value="Prefiero no decirlo">Prefiero no decirlo</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-tiktok-dark-hover flex gap-3 bg-[#121212]">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 bg-[#1e1e1e] hover:bg-tiktok-dark-hover text-white font-semibold py-2.5 rounded-full transition-all duration-300 border border-tiktok-dark-hover hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="flex-1 bg-tiktok-red hover:bg-[#e0254b] disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-lg hover:shadow-tiktok-red/20"
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            Guardar
          </button>
        </div>

      </div>
    </div>
  );
}
