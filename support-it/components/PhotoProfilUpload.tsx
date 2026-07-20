'use client';

import React, { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import Avatar from './Avatar';

interface PhotoProfilUploadProps {
  currentPhotoUrl?: string;
  nom?: string;
  prenom?: string;
  onPhotoUpdate?: (newPhotoUrl: string) => void;
  size?: number;
  disabled?: boolean;
}

const PhotoProfilUpload: React.FC<PhotoProfilUploadProps> = ({
  currentPhotoUrl,
  nom = '',
  prenom = '',
  onPhotoUpdate,
  size = 120,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifications côté client
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Fichier trop volumineux. Maximum 5MB autorisé.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP.');
      return;
    }

    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Uploader le fichier
    uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      // Récupérer l'ID utilisateur depuis localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.idUtilisateur) {
          formData.append('idUtilisateur', user.idUtilisateur.toString());
        } else if (user.idTechnicien) {
          formData.append('idTechnicien', user.idTechnicien.toString());
        }
      }

      console.log('Uploading photo:', file.name, file.size);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploadPhotoProfil.php`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success) {
        const newPhotoUrl = result.photoUrl;
        setPreviewUrl(null); // Utiliser la vraie URL maintenant
        
        // Notifier le parent
        if (onPhotoUpdate) {
          onPhotoUpdate(newPhotoUrl);
        }

        // Mettre à jour le localStorage si nécessaire
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.photoprofil = newPhotoUrl;
          localStorage.setItem('user', JSON.stringify(user));
        }

        alert('Photo de profil mise à jour avec succès !');
      } else {
        console.error('Upload failed:', result.error);
        alert('Erreur lors de l\'upload: ' + (result.error || 'Erreur inconnue'));
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload de la photo: ' + error.message);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const displayPhotoUrl = previewUrl || currentPhotoUrl;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '15px' 
    }}>
      {/* Avatar cliquable */}
      <div 
        onClick={handleAvatarClick}
        style={{
          position: 'relative',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Avatar
          photoUrl={displayPhotoUrl}
          nom={nom}
          prenom={prenom}
          size={size}
          style={{
            border: '3px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        />
        
        {/* Overlay de loading */}
        {uploading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600
          }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Icône de modification */}
        {!disabled && !uploading && (
          <div style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            background: '#3B82F6',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <Camera size={12} color="white" />
          </div>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {/* Instructions */}
      {!disabled && (
        <div style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#64748b',
          maxWidth: '200px'
        }}>
          {uploading ? (
            'Upload en cours...'
          ) : (
            'Cliquez sur l\'avatar pour changer votre photo de profil'
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoProfilUpload;