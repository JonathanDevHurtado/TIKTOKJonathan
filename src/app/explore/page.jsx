"use client"
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Search } from 'lucide-react';

export default function Explore() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full h-full">
      <div className="relative mb-8">
        <input 
          type="text" 
          placeholder="Buscar cuentas o videos..." 
          className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-full py-3 px-12 text-white focus:outline-none focus:border-tiktok-gray transition-colors"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tiktok-gray w-5 h-5" />
        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-tiktok-red font-semibold text-sm">
          Buscar
        </button>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Categorías Explorar</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.length > 0 ? categories.map((cat) => (
          <div key={cat.id} className="bg-[#121212] border border-tiktok-dark-hover rounded-xl p-4 cursor-pointer hover:bg-[#1e1e1e] transition-colors flex items-center justify-center h-24">
            <span className="font-semibold text-white text-center">{cat.name}</span>
          </div>
        )) : (
          <div className="col-span-full text-center text-tiktok-gray">Cargando categorías...</div>
        )}
      </div>

      <h2 className="text-xl font-bold text-white mt-12 mb-4">Tendencias</h2>
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="aspect-[3/4] bg-[#1e1e1e] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
