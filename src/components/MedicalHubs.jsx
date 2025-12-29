import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

export default function MedicalHubs() {
  const hubs = [
    {
      id: 'penang',
      name: 'Penang',
      category: 'Northern Region',
      description: 'The "Island Hospital" of Asia. Famous for affordable oncology, cardiology, and combining healthcare with heritage tourism.',
      // 👇 UPDATED: Points to public/images/hubs/penang.jpg
      image: '/images/hubs/penang.jpg', 
      large: true, 
    },
    {
      id: 'kuala-lumpur',
      name: 'Kuala Lumpur',
      category: 'Central Region',
      description: 'The capital of specialized care. Home to Malaysia\'s top JCI-accredited hospitals offering complex surgeries, neurology, and orthopedics.',
      // 👇 UPDATED: Points to public/images/hubs/kl.jpg
      image: '/images/hubs/kl.jpg', 
      large: false,
    },
    {
      id: 'johor',
      name: 'Johor',
      category: 'Southern Region',
      description: 'The Southern Gateway. A rising hub for fertility treatments, wellness screenings, and quick access for regional neighbors.',
      // 👇 UPDATED: Points to public/images/hubs/johor.jpg
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
          
          {/* LARGE ITEM (Penang - Index 0) */}
          <div className="lg:col-span-2 group relative rounded-[32px] overflow-hidden cursor-pointer">
            <img 
              src={hubs[0].image} 
              alt={hubs[0].name} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                console.error("Image failed to load:", hubs[0].image);
                e.target.style.backgroundColor = '#ccc'; // Fallback so you see if it breaks
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
              <div className="flex items-center gap-2 text-blue-200 text-sm font-bold uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                {hubs[0].category}
              </div>
              <h3 className="font-serif text-3xl md:text-4xl text-white mb-4">{hubs[0].name}</h3>
              <p className="text-slate-200 text-lg mb-6 max-w-lg leading-relaxed line-clamp-3 md:line-clamp-none">
                {hubs[0].description}
              </p>
              <button className="flex items-center gap-2 text-white font-semibold group-hover:gap-4 transition-all">
                Explore Specialists <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN (KL & Johor - Index 1 & 2) */}
          <div className="flex flex-col gap-6">
            {hubs.slice(1).map((hub) => (
              <div key={hub.id} className="flex-1 group relative rounded-[32px] overflow-hidden cursor-pointer min-h-[280px]">
                <img 
                  src={hub.image} 
                  alt={hub.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   onError={(e) => {
                    console.error("Image failed to load:", hub.image);
                    e.target.style.backgroundColor = '#ccc';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
                    <MapPin className="w-3 h-3" />
                    {hub.category}
                  </div>
                  <h3 className="font-serif text-2xl text-white mb-2">{hub.name}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">
                    {hub.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}