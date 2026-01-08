// src/components/MedicalHubs.jsx
import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

export default function MedicalHubs() {
  const hubs = [
    {
      id: 'kuala-lumpur',
      name: 'Kuala Lumpur',
      category: 'Central Region',
      // KL is now the large feature item
      image: '/images/hubs/kl.jpg', 
      large: true,
    },
    {
      id: 'penang',
      name: 'Penang',
      category: 'Northern Region',
      image: '/images/hubs/penang.jpg', 
      large: false, 
    },
    {
      id: 'johor',
      name: 'Johor',
      category: 'Southern Region',
      image: '/images/hubs/johor.jpg', 
      large: false,
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-slate-900 mb-4">World-Class Medical Hubs</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Partnered with elite JCI-accredited hospitals in Malaysia's top healthcare destinations.
          </p>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">
          
          {/* LARGE ITEM (KL - Index 0) */}
          <a href="/doctors" className="lg:col-span-2 group relative rounded-[32px] overflow-hidden cursor-pointer min-h-[400px]">
            <img 
              src={hubs[0].image} 
              alt={hubs[0].name} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                console.error("Image failed to load:", hubs[0].image);
                e.target.style.backgroundColor = '#ccc'; 
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
              <div className="flex items-center gap-2 text-blue-200 text-sm font-bold uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                {hubs[0].category}
              </div>
              
              {/* No Description, just Title and CTA */}
              <h3 className="font-serif text-3xl md:text-5xl text-white mb-6">{hubs[0].name}</h3>
              
              <div className="flex items-center gap-2 text-white font-semibold group-hover:gap-4 transition-all">
                Explore Specialists <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </a>

          {/* RIGHT COLUMN (Penang & Johor - Index 1 & 2) */}
          <div className="flex flex-col gap-6">
            {hubs.slice(1).map((hub) => (
              <a href="/doctors" key={hub.id} className="flex-1 group relative rounded-[32px] overflow-hidden cursor-pointer min-h-[250px]">
                <img 
                  src={hub.image} 
                  alt={hub.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   onError={(e) => {
                    console.error("Image failed to load:", hub.image);
                    e.target.style.backgroundColor = '#ccc';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
                    <MapPin className="w-3 h-3" />
                    {hub.category}
                  </div>
                  {/* Title Only */}
                  <h3 className="font-serif text-2xl md:text-3xl text-white">{hub.name}</h3>
                </div>
              </a>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}