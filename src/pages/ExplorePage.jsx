import { useState } from 'react';
import { SearchIcon, LikesIcon } from '../components/Icons';
import { CATEGORIES } from '../data/videos';

export default function ExplorePage() {
  const [active, setActive] = useState('Trending');

  return (
    <div className="explore-page">

      <div className="explore-header">
        <h1 className="explore-title">Explorar</h1>
        <div className="search-bar">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar videos, usuarios..."
            className="search-input"
          />
        </div>
      </div>


      <div className="category-pills">
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={`pill ${active === c ? 'active' : ''}`}
            onClick={() => setActive(c)}
          >
            {c}
          </button>
        ))}
      </div>


      <div className="explore-grid">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="explore-thumb">
            <img
              src={`https://picsum.photos/seed/ex${i}${active}/300/400`}
              alt=""
              loading="lazy"
            />
            <div className="explore-thumb-overlay">
              <LikesIcon />
              <span className="text-xs font-bold text-white">
                {Math.floor(Math.random() * 900 + 10)}K
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
