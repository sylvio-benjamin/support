'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import ChangerMotDePasseModal from '../../../components/ChangerMotDePasseModal';
import PhotoProfilUpload from '../../../components/PhotoProfilUpload';

export default function Profil() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [modalMotDePasseOuvert, setModalMotDePasseOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUtilisateur(JSON.parse(userData));
    }
  }, []);

  const enregistrerDonnees = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnregistrement(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profil.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: utilisateur.email || utilisateur.emailUtilisateur,
          telephone: utilisateur.telephone,
          naissance: utilisateur.naissance,
        }),
      });
      const result = await res.json();

      if (result.status === 'success') {
        localStorage.setItem('user', JSON.stringify(utilisateur));
        setMessage('Profil mis à jour avec succès !');
      } else {
        setMessage(result.message || 'Erreur lors de la mise à jour du profil.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi :', error);
      setMessage('Erreur de connexion au serveur.');
    } finally {
      setEnregistrement(false);
    }
  };

  if (!utilisateur) {
    return (
      <DashboardLayout role="employe">
        <div className="py-16 text-center text-sm text-slate-500">Chargement...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="employe">
      <PageHeader title="Mon profil" description="Vos informations personnelles." />

      <form onSubmit={enregistrerDonnees} className="flex flex-col gap-6 items-center">
        <div className="flex flex-col lg:flex-row gap-4 justify-center w-full">
          {/* Colonne gauche */}
          <Card className="w-full lg:max-w-xs">
            <CardBody className="flex flex-col items-center text-center">
              <PhotoProfilUpload
                currentPhotoUrl={utilisateur?.photoprofil || utilisateur?.photoProfil}
                nom={utilisateur.nom || utilisateur.nomUtilisateur}
                prenom={utilisateur.prenom || utilisateur.prenomUtilisateur}
                size={96}
                onPhotoUpdate={(newPhotoUrl) => {
                  const maj = { ...utilisateur, photoprofil: newPhotoUrl };
                  setUtilisateur(maj);
                  localStorage.setItem('user', JSON.stringify(maj));
                }}
              />

              <div className="w-full text-left mt-4">
                <div className="text-sm font-semibold text-slate-900 mb-1">Nom d&apos;utilisateur :</div>
                <div className="text-sm text-slate-600 mb-4">{utilisateur.login || utilisateur.nomUtilisateur}</div>
                <div className="text-sm font-semibold text-slate-900 mb-1">Mot de passe :</div>
                <div className="text-sm text-slate-600 mb-4">********</div>
                <Button type="button" variant="secondary" className="w-full" onClick={() => setModalMotDePasseOuvert(true)}>
                  Changer le mot de passe
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Colonne centrale */}
          <Card className="w-full lg:max-w-md flex-1">
            <CardBody className="flex flex-col gap-4">
              <Field label="Prénom" htmlFor="prenom">
                <Input id="prenom" type="text" value={utilisateur.prenom || utilisateur.prenomUtilisateur || ''} readOnly />
              </Field>
              <Field label="Nom" htmlFor="nom">
                <Input id="nom" type="text" value={utilisateur.nom || utilisateur.nomUtilisateur || ''} readOnly />
              </Field>
              <Field label="Numéro de téléphone" htmlFor="telephone">
                <Input
                  id="telephone"
                  type="text"
                  value={utilisateur.telephone || ''}
                  onChange={(e) => setUtilisateur({ ...utilisateur, telephone: e.target.value })}
                />
              </Field>
              <Field label="Adresse email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={utilisateur.email || utilisateur.emailUtilisateur || ''}
                  onChange={(e) => setUtilisateur({ ...utilisateur, email: e.target.value })}
                />
              </Field>
              <Field label="Date de naissance" htmlFor="naissance">
                <Input
                  id="naissance"
                  type="date"
                  value={utilisateur.naissance || ''}
                  onChange={(e) => setUtilisateur({ ...utilisateur, naissance: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        {message && (
          <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 w-full max-w-md text-center">
            {message}
          </div>
        )}

        <Button type="submit" variant="primary" loading={enregistrement}>
          Enregistrer
        </Button>
      </form>

      {modalMotDePasseOuvert && <ChangerMotDePasseModal onClose={() => setModalMotDePasseOuvert(false)} />}
    </DashboardLayout>
  );
}
