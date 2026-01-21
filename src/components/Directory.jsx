// src/components/Directory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Filter, Building2, Loader2, ChevronDown } from 'lucide-react';
import { GOOGLE_SHEET_URL, WA_NUMBER } from '../config'; 

// --- HELPER FUNCTIONS ---
const getStateFromLocation = (fullAddress) => {
  if (!fullAddress) return null;
  const lowerAddr = fullAddress.toLowerCase();
  if (lowerAddr.includes('kuala lumpur') || lowerAddr.includes('kl')) return 'Kuala Lumpur';
  if (lowerAddr.includes('selangor') || lowerAddr.includes('subang') || lowerAddr.includes('petaling')) return 'Selangor';
  if (lowerAddr.includes('penang') || lowerAddr.includes('pulau pinang') || lowerAddr.includes('georgetown')) return 'Penang';
  if (lowerAddr.includes('johor')) return 'Johor';
  if (lowerAddr.includes('melaka')) return 'Melaka';
  return 'Malaysia';
};

const processDoctors = (data) => {
    return data
        .filter(doc => doc.name && doc.id) 
        .map(doc => {
            const cleanState = getStateFromLocation(doc.location);
            const parsedMain = doc.specialty ? doc.specialty.trim() : '';
            const parsedSub = doc.subspecialty ? doc.subspecialty.trim() : '';
            const docId = doc.id || (doc.name ? doc.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'unknown');

            return { ...doc, cleanState, parsedMain, parsedSub, docId };
        });
};

export default function Directory({ preloadedDoctors = [] }) {
  
  // 1. INITIALIZE STATE
  const [doctors, setDoctors] = useState(() => 
    preloadedDoctors.length > 0 ? processDoctors(preloadedDoctors) : []
  );
  
  const [loading, setLoading] = useState(preloadedDoctors.length === 0);
  const [error, setError] = useState(false);
  
  // FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedHospital, setSelectedHospital] = useState('All');

  // PAGINATION
  const ITEMS_PER_PAGE = 16;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // DROPDOWN OPTIONS
  const initialOptions = useMemo(() => {
     if (doctors.length === 0) return { locations: ['All'], specialties: ['All'], hospitals: ['All'] };
     return {
        locations: ['All', ...new Set(doctors.map(d => d.cleanState).filter(Boolean))].sort(),
        specialties: ['All', ...new Set(doctors.map(d => d.specialty).filter(Boolean))].sort(),
        hospitals: ['All', ...new Set(doctors.map(d => d.hospital).filter(Boolean))].sort()
     };
  }, [doctors]); 

  const [filterOptions, setFilterOptions] = useState(initialOptions);

  useEffect(() => {
      if (preloadedDoctors.length > 0) {
          setFilterOptions(initialOptions);
      }
  }, [preloadedDoctors, initialOptions]);

  // RESET PAGINATION
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, selectedSpecialty, selectedLocation, selectedHospital]);

  // 2. FALLBACK FETCH
  useEffect(() => {
    if (preloadedDoctors.length > 0) return; 

    const urlWithCacheBuster = `${GOOGLE_SHEET_URL}?t=${Date.now()}`;

    fetch(urlWithCacheBuster)
      .then(res => res.json())
      .then(data => {
        const processed = processDoctors(data);
        
        const uniqueLocs = ['All', ...new Set(processed.map(d => d.cleanState).filter(Boolean))].sort();
        const uniqueSpecs = ['All', ...new Set(processed.map(d => d.specialty).filter(Boolean))].sort();
        const uniqueHospitals = ['All', ...new Set(processed.map(d => d.hospital).filter(Boolean))].sort();

        setDoctors(processed);
        setFilterOptions({ 
          locations: uniqueLocs, 
          specialties: uniqueSpecs,
          hospitals: uniqueHospitals
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load doctors:", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (doctor.name && doctor.name.toLowerCase().includes(term)) ||
        (doctor.hospital && doctor.hospital.toLowerCase().includes(term)) ||
        (doctor.specialty && doctor.specialty.toLowerCase().includes(term)) ||
        (doctor.subspecialty && doctor.subspecialty.toLowerCase().includes(term))
      );
      const matchesSpecialty = selectedSpecialty === 'All' || doctor.specialty === selectedSpecialty;
      const matchesLocation = selectedLocation === 'All' || doctor.cleanState === selectedLocation;
      const matchesHospital = selectedHospital === 'All' || doctor.hospital === selectedHospital;

      return matchesSearch && matchesSpecialty && matchesLocation && matchesHospital;
    });
  }, [doctors, searchTerm, selectedSpecialty, selectedLocation, selectedHospital]);

  const visibleDoctors = filteredDoctors.slice(0, visibleCount);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#276CA1]" />
              <p className="text-sm font-medium">Loading directory...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100 text-red-600">
              <p className="font-bold mb-2">System Error</p>
              <p className="text-sm">Could not load the doctor's list. Please refresh.</p>
          </div>
      );
  }

  return (
    <div className="w-full relative">
      
      {/* FILTER BAR */}
      <div className="bg-white p-2 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 mb-8 md:mb-12 flex flex-col lg:flex-row gap-2 max-w-6xl mx-auto">
        
        {/* 1. SEARCH INPUT */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search specialist, hospital..."
            className="w-full pl-12 pr-4 py-3 bg-transparent rounded-xl focus:outline-none focus:bg-slate-50 transition-colors text-slate-800 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="hidden lg:block w-px bg-slate-100 my-2"></div>

        {/* 2. LOCATION */}
        <div className="relative min-w-[160px] lg:max-w-[180px]">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            className="w-full pl-10 pr-8 py-3 bg-transparent rounded-xl focus:outline-none focus:bg-slate-50 cursor-pointer text-slate-600 font-medium appearance-none truncate"
            value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {filterOptions.locations.map((loc, idx) => (<option key={idx} value={loc}>{loc === 'All' ? 'All Locations' : loc}</option>))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
        </div>
        <div className="hidden lg:block w-px bg-slate-100 my-2"></div>

        {/* 3. HOSPITAL */}
        <div className="relative min-w-[180px] lg:max-w-[220px]">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            className="w-full pl-10 pr-8 py-3 bg-transparent rounded-xl focus:outline-none focus:bg-slate-50 cursor-pointer text-slate-600 font-medium appearance-none truncate"
            value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}
          >
            {filterOptions.hospitals.map((hosp, idx) => (<option key={idx} value={hosp}>{hosp === 'All' ? 'All Hospitals' : hosp}</option>))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
        </div>
        <div className="hidden lg:block w-px bg-slate-100 my-2"></div>

        {/* 4. SPECIALTY */}
        <div className="relative min-w-[180px] lg:max-w-[240px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            className="w-full pl-10 pr-8 py-3 bg-transparent rounded-xl focus:outline-none focus:bg-slate-50 cursor-pointer text-slate-600 font-medium appearance-none truncate"
            value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}
          >
            {filterOptions.specialties.map((spec, idx) => (<option key={idx} value={spec}>{spec === 'All' ? 'All Specialties' : spec}</option>))}
          </select>
           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
        </div>
      </div>

      {/* RESULTS GRID */}
      {filteredDoctors.length > 0 ? (
        <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {visibleDoctors.map((doctor, index) => {
                const waLink = `https://wa.me/${WA_NUMBER}?text=Hi Ocha, I would like to book an appointment with ${doctor.name}`;
                return (
                // 🚀 UPDATE 1: Added 'overflow-hidden' to clip any internal elements
                <div key={doctor.docId || index} className="bg-white rounded-[20px] border border-slate-100 p-4 md:p-6 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group overflow-hidden">
                    
                    <div className="flex items-start gap-4 md:gap-5 mb-5">
                        <div className="relative shrink-0">
                            <img 
                            src={doctor.image} alt={doctor.name}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover object-top border-2 border-slate-50 shadow-sm bg-slate-100"
                            onError={(e) => { e.target.src = 'https://placehold.co/100?text=Dr'; }} 
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-serif text-lg font-bold text-slate-900 leading-tight mb-1 truncate">{doctor.name}</h3>
                            <div className="mb-3">
                                <p className="text-[10px] font-bold text-[#276CA1] uppercase tracking-widest truncate">{doctor.parsedMain}</p>
                                {doctor.parsedSub && (
                                <p className="text-[10px] font-semibold text-slate-500 flex items-start gap-1 mt-1 leading-snug line-clamp-2">
                                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0 mt-1"></span>{doctor.parsedSub}
                                </p>
                                )}
                            </div>
                            <div className="space-y-1.5 border-t border-slate-50 pt-2">
                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                                <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" /><span className="truncate">{doctor.hospital}</span>
                            </div>
                            {doctor.cleanState && (
                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" /><span className="truncate font-medium text-slate-600">{doctor.cleanState}</span>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    
                    {/* 🚀 UPDATE 2: Switched to Grid. Reduced gap to 'gap-2'. Guarantee fit. */}
                    <div className="mt-auto pt-4 md:pt-5 border-t border-slate-50 grid grid-cols-[1fr_2fr] gap-2">
                        <a href={`/doctor/${doctor.docId}`} className="flex items-center justify-center bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold tracking-wide rounded-xl transition-all text-xs py-2.5">Profile</a>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center bg-[#276CA1] hover:bg-[#1f5682] text-white font-bold rounded-xl transition-all text-xs shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 py-2.5">Book Appointment</a>
                    </div>
                </div>
                );
            })}
            </div>

            {/* LOAD MORE BUTTON */}
            {visibleCount < filteredDoctors.length && (
                <div className="mt-12 flex justify-center">
                    <button 
                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                        className="group flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-full text-slate-600 font-bold hover:border-indigo-200 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                    >
                        Load More Doctors
                        <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                    </button>
                </div>
            )}
        </>
      ) : (
        <div className="text-center py-24 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400 font-medium mb-4">No specialists found.</p>
          <button onClick={() => { setSearchTerm(''); setSelectedSpecialty('All'); setSelectedLocation('All'); setSelectedHospital('All'); }} className="px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Clear Filters</button>
        </div>
      )}
    </div>
  );
}