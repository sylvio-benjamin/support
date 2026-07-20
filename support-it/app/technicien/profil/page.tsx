'use client';

import React, { useEffect, useState } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import PhotoProfilUpload from '../../../components/PhotoProfilUpload';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Field, Input } from '../../../components/ui/Input';

export default function ProfilTechnicien() {
  useAuthRedirect();
  const [technicien, setTechnicien] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setTechnicien(parsedUser);
      setUser(parsedUser);
    }
  }, []);

  const EnregistrerDonnees = async () => {
    const formData = new FormData();
    formData.append('email', technicien.email);
    formData.append('telephone', technicien.telephone);
    formData.append('naissance', technicien.naissance);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profil.php`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await res.json();
      console.log('Résultat serveur :', result);

      if (result.status === 'success') {
        // Mise à jour user et localStorage
        const updatedUser = { ...technicien };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        alert('Profil mis à jour avec succès !');
      } else {
        alert('Erreur lors de la mise à jour du profil');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi :', error);
      alert('Erreur lors de la mise à jour du profil');
    }
  };

  const handlePhotoUpdate = (newPhotoUrl: string) => {
    const updatedTechnicien = { ...technicien, photoprofil: newPhotoUrl };
    setTechnicien(updatedTechnicien);
    setUser(updatedTechnicien);
    localStorage.setItem('user', JSON.stringify(updatedTechnicien));
  };

  if (!technicien) {
    return (
      <DashboardLayout role="technicien">
        <p className="text-slate-500 text-sm">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="technicien">
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles et sécurisez votre compte technicien." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center gap-3">
            <PhotoProfilUpload
              currentPhotoUrl={technicien?.photoprofil || technicien?.photoProfil}
              nom={technicien?.nom || technicien?.nomTechnicien}
              prenom={technicien?.prenom || technicien?.prenomTechnicien}
              size={100}
              onPhotoUpdate={handlePhotoUpdate}
            />
            <div className="w-full pt-2 border-t border-slate-200 mt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mt-3">Nom d'utilisateur</p>
              <p className="text-sm text-slate-900 mt-1">{technicien.login || technicien.nomTechnicien}</p>
            </div>
            <div className="w-full">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mot de passe</p>
              <p className="text-sm text-slate-900 mt-1">********</p>
            </div>
            <Button variant="secondary" size="sm" className="w-full mt-2" type="button">
              Changer le mot de passe
            </Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Informations personnelles</h3>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom">
                  <Input type="text" value={technicien.prenom || technicien.prenomTechnicien || ''} readOnly disabled />
                </Field>
                <Field label="Nom">
                  <Input type="text" value={technicien.nom || technicien.nomTechnicien || ''} readOnly disabled />
                </Field>
              </div>
              <Field label="Numéro de téléphone" required>
                <Input
                  type="text"
                  value={technicien?.telephone || ''}
                  onChange={(e) => setTechnicien({ ...technicien, telephone: e.target.value })}
                  required
                />
              </Field>
              <Field label="Adresse email">
                <Input
                  type="email"
                  value={technicien.email || technicien.emailTechnicien || ''}
                  onChange={(e) => setTechnicien({ ...technicien, email: e.target.value })}
                />
              </Field>
              <Field label="Date de naissance" required>
                <Input
                  type="date"
                  value={technicien?.naissance || ''}
                  onChange={(e) => setTechnicien({ ...technicien, naissance: e.target.value })}
                  required
                />
              </Field>
              <Button variant="primary" onClick={EnregistrerDonnees} type="submit" className="self-end mt-2">
                Enregistrer
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
