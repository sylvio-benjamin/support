'use client';

import React, { useEffect, useState } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import PhotoProfilUpload from '../../../components/PhotoProfilUpload';
import ChangerMotDePasseModal from '../../../components/ChangerMotDePasseModal';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ProfilDirecteur() {
  useAuthRedirect();
  const [directeur, setDirecteur] = useState<any>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [modalMotDePasseOuvert, setModalMotDePasseOuvert] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setDirecteur(userObj);
    }
  }, []);

  const EnregistrerDonnees = async () => {
    setEnregistrement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profil.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: directeur.email,
          telephone: directeur.telephone,
          naissance: directeur.naissance,
          role: 'Directeur',
        }),
      });

      const result = await res.json();
      console.log('Résultat serveur :', result);

      if (result.status === 'success') {
        // Mise à jour directeur et localStorage
        const updatedDirecteur = { ...directeur };
        localStorage.setItem('user', JSON.stringify(updatedDirecteur));
        setDirecteur(updatedDirecteur);
        alert('Données mises à jour avec succès !');
      } else {
        alert(result.message || 'Erreur lors de la mise à jour des données');
      }

    } catch (error) {
      console.error('Erreur lors de l\'envoi :', error);
      alert('Erreur lors de la mise à jour des données');
    } finally {
      setEnregistrement(false);
    }
  };

  if (!directeur) {
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="directeur">
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles et sécurisez votre compte directeur." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex flex-col items-center text-center gap-3">
            <PhotoProfilUpload
              currentPhotoUrl={directeur?.photoprofil || directeur?.photoProfil}
              nom={directeur?.nom || directeur?.nomDirecteur}
              prenom={directeur?.prenom || directeur?.prenomDirecteur}
              size={100}
              onPhotoUpdate={(newPhotoUrl) => {
                setDirecteur({ ...directeur, photoprofil: newPhotoUrl });
              }}
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nom d&apos;utilisateur</p>
              <p className="text-sm font-medium text-slate-900">{directeur?.login || directeur?.nom || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mot de passe</p>
              <p className="text-sm text-slate-900">********</p>
            </div>
            <Button variant="secondary" type="button" className="w-full" onClick={() => setModalMotDePasseOuvert(true)}>Changer le mot de passe</Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardBody>
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
              <Field label="Prénom" htmlFor="prenom">
                <Input id="prenom" type="text" value={directeur.prenom || ''} readOnly />
              </Field>
              <Field label="Nom" htmlFor="nom">
                <Input id="nom" type="text" value={directeur.nom || ''} readOnly />
              </Field>
              <Field label="Numéro de téléphone" htmlFor="telephone" required>
                <Input
                  id="telephone"
                  type="text"
                  value={directeur?.telephone || ''}
                  onChange={e => setDirecteur({ ...directeur, telephone: e.target.value })}
                  required
                />
              </Field>
              <Field label="Adresse email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  value={directeur.email || ''}
                  onChange={e => setDirecteur({ ...directeur, email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Date de naissance" htmlFor="naissance" required>
                <Input
                  id="naissance"
                  type="date"
                  value={directeur?.naissance || ''}
                  onChange={e => setDirecteur({ ...directeur, naissance: e.target.value })}
                  required
                />
              </Field>
            </form>

            <div className="flex justify-end mt-6">
              <Button variant="primary" onClick={EnregistrerDonnees} loading={enregistrement}>
                Enregistrer
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {modalMotDePasseOuvert && <ChangerMotDePasseModal onClose={() => setModalMotDePasseOuvert(false)} />}
    </DashboardLayout>
  );
}
