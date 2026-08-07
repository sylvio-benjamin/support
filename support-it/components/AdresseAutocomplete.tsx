'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { PAYS } from '../lib/entrepriseOptions';

interface SuggestionAdresse {
  label: string;
  ville: string;
  codePostal: string;
  pays: string;
}

interface AdresseAutocompleteProps {
  id?: string;
  value: string;
  onChange: (adresse: string) => void;
  onVilleDetectee?: (ville: string) => void;
  onPaysDetecte?: (pays: string) => void;
  onCodePostalDetecte?: (codePostal: string) => void;
  placeholder?: string;
}

// Un nom de pays renvoyé par Geoapify ne correspond pas toujours exactement à
// une entrée de la liste PAYS (ex: variantes de libellé) : on ne renvoie que
// les correspondances sûres, sinon le <select> du formulaire se retrouverait
// avec une valeur qui n'existe dans aucune de ses options.
function normaliserPays(pays: string | undefined): string | null {
  if (!pays) return null;
  const trouve = PAYS.find((p) => p.toLowerCase() === pays.toLowerCase());
  return trouve ?? null;
}

// Autocomplétion d'adresse via Geoapify (api.geoapify.com), basée sur
// OpenStreetMap : couverture mondiale, renvoie directement pays/ville/code
// postal en champs structurés (contrairement à l'API Adresse française
// utilisée précédemment, limitée à la France). Nécessite une clé API
// gratuite (quota quotidien) dans NEXT_PUBLIC_GEOAPIFY_API_KEY.
// Se dégrade proprement en simple champ texte si l'API ne répond pas, si la
// clé est manquante, ou si aucun résultat n'est trouvé : la saisie libre
// reste toujours possible.
export default function AdresseAutocomplete({ id, value, onChange, onVilleDetectee, onPaysDetecte, onCodePostalDetecte, placeholder }: AdresseAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SuggestionAdresse[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const delaiRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const gererClicExterieur = (e: MouseEvent) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    document.addEventListener('mousedown', gererClicExterieur);
    return () => document.removeEventListener('mousedown', gererClicExterieur);
  }, []);

  const rechercher = (texte: string) => {
    if (delaiRef.current) clearTimeout(delaiRef.current);

    if (texte.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GEOAPIFY_API_KEY manquante : autocomplétion adresse désactivée.');
      return;
    }

    delaiRef.current = setTimeout(async () => {
      setChargement(true);
      try {
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(texte)}&lang=fr&limit=5&apiKey=${apiKey}`
        );
        const data = await res.json();
        const resultats: SuggestionAdresse[] = (data.features || []).map((f: any) => ({
          label: f.properties.formatted,
          ville: f.properties.city || '',
          codePostal: f.properties.postcode || '',
          pays: f.properties.country || '',
        }));
        setSuggestions(resultats);
        setOuvert(resultats.length > 0);
      } catch (err) {
        console.error('Erreur autocomplétion adresse:', err);
        setSuggestions([]);
      } finally {
        setChargement(false);
      }
    }, 300);
  };

  const selectionner = (s: SuggestionAdresse) => {
    onChange(s.label);
    // L'adresse choisie vient d'une suggestion officielle : elle prime sur ce
    // qui a pu être saisi manuellement avant dans les autres champs (ville,
    // code postal, pays), donc on les écrase plutôt que de les compléter
    // seulement s'ils étaient vides.
    if (s.ville) onVilleDetectee?.(s.ville);
    if (s.codePostal) onCodePostalDetecte?.(s.codePostal);
    const paysNormalise = normaliserPays(s.pays);
    if (paysNormalise) onPaysDetecte?.(paysNormalise);
    setOuvert(false);
    setSuggestions([]);
  };

  return (
    <div ref={conteneurRef} className="relative">
      <div className="relative">
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder || 'Commencez à taper une adresse...'}
          onChange={(e) => {
            onChange(e.target.value);
            rechercher(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setOuvert(true)}
          autoComplete="off"
          className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {ouvert && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectionner(s)}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 flex items-start gap-2"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {chargement && (
        <p className="text-xs text-slate-400 mt-1">Recherche d&apos;adresses...</p>
      )}
    </div>
  );
}
