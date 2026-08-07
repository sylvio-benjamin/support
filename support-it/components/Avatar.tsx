'use client';

import React, { useState } from 'react';

interface AvatarProps {
  photoUrl?: string;
  nom?: string;
  prenom?: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  photoUrl,
  nom = '',
  prenom = '',
  size = 40,
  style = {},
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Sans ça, une photoUrl qui échoue une fois (ex: l'aperçu local pendant un
  // upload, voir plus bas) laissait imageError bloqué à true pour de bon :
  // la vraie photo, reçue juste après dans une NOUVELLE valeur de photoUrl,
  // ne réessayait jamais — l'avatar restait sur les initiales jusqu'au
  // rechargement complet de la page (qui remonte le composant à zéro).
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [photoUrl]);

  // Fonction pour obtenir les initiales
  const obtenirInitiales = (nom: string, prenom: string): string => {
    const premiereLettrenom = nom?.charAt(0)?.toUpperCase() || '';
    const premiereLettrePrenom = prenom?.charAt(0)?.toUpperCase() || '';
    return premiereLettrePrenom + premiereLettrenom || '?';
  };

  // Générer une couleur basée sur le nom
  const obtenirCouleurAvatar = (nom: string, prenom: string): string => {
    const texte = (nom + prenom).toLowerCase();
    let hash = 0;
    for (let i = 0; i < texte.length; i++) {
      hash = texte.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const couleurs = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    
    return couleurs[Math.abs(hash) % couleurs.length];
  };

  const initiales = obtenirInitiales(nom, prenom);
  const couleurAvatar = obtenirCouleurAvatar(nom, prenom);
  
  // Construire l'URL complète de l'image. photoUrl peut déjà être une URL
  // utilisable telle quelle (http(s):// venant du backend, ou data:/blob:
  // pour un aperçu local pendant un upload) — seul un chemin relatif
  // (ex: "photoprofil/xxx.png") a besoin du préfixe NEXT_PUBLIC_ASSETS_BASE_URL.
  const estDejaUneUrlUtilisable = /^(https?:|data:|blob:)/.test(photoUrl || '');
  const imageUrl = photoUrl && !imageError
    ? (estDejaUneUrlUtilisable
        ? photoUrl
        : `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${photoUrl}`)
    : null;

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  const handleImageError = () => {
    console.warn('Image de profil non trouvée:', imageUrl);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Vérifier si l'URL de l'image est valide
  const isValidImageUrl = imageUrl && !imageError && imageUrl !== 'null' && imageUrl !== 'undefined';

  return (
    <div className={className} style={containerStyle}>
      {isValidImageUrl ? (
        <>
          {imageLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${couleurAvatar}, ${couleurAvatar}dd)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: size * 0.35
            }}>
              {initiales}
            </div>
          )}
          <img
            src={imageUrl}
            alt={`${prenom} ${nom}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: imageLoading ? 'none' : 'block'
            }}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </>
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${couleurAvatar}, ${couleurAvatar}dd)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: size * 0.35,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {initiales}
        </div>
      )}
    </div>
  );
};

export default Avatar;