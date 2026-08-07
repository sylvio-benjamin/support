'use client';

import React, { useEffect, useState } from 'react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import PhotoProfilUpload from '../../../components/PhotoProfilUpload';
import ChangerMotDePasseModal from '../../../components/ChangerMotDePasseModal';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ProfilAdmin() {
  useAuthRedirect();
  const [user, setUser] = useState<any>(null);
  const [modalMotDePasseOuvert, setModalMotDePasseOuvert] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
    }
  }, []);

  const EnregistrerDonnees = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profil.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          telephone: user.telephone,
          naissance: user.naissance,
        }),
      });

      const result = await res.json();
      console.log('Résultat serveur :', result);

      if (result.status === 'success') {
        // Mise à jour user et localStorage
        const updatedUser = { ...user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        alert('Données mises à jour avec succès !');
      } else {
        alert(result.message || 'Erreur lors de la mise à jour des données');
      }

    } catch (error) {
      console.error('Erreur lors de l\'envoi :', error);
      alert('Erreur lors de la mise à jour des données');
    }
  };

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    console.log("Formulaire validé :", user);
  };

  if (!user) return null;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et sécurisez votre compte administrateur référent."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 h-fit">
          <CardBody className="flex flex-col items-center text-center">
            <PhotoProfilUpload
              currentPhotoUrl={user?.photoprofil || user?.photoProfil}
              nom={user?.nom || user?.nomUtilisateur}
              prenom={user?.prenom || user?.prenomUtilisateur}
              size={90}
              onPhotoUpdate={(newPhotoUrl: string) => {
                setUser({ ...user, photoprofil: newPhotoUrl });
              }}
            />
            <h3 className="text-base font-semibold text-slate-900 mt-4">
              {user?.prenom} {user?.nom}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Administrateur Référent</p>
            <Button variant="secondary" type="button" className="w-full mt-4" onClick={() => setModalMotDePasseOuvert(true)}>
              Changer le mot de passe
            </Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Informations personnelles</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom" htmlFor="prenom">
                  <Input
                    id="prenom"
                    type="text"
                    value={user?.prenom || ''}
                    onChange={(e) => setUser({ ...user, prenom: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </Field>

                <Field label="Nom" htmlFor="nom">
                  <Input
                    id="nom"
                    type="text"
                    value={user?.nom || ''}
                    onChange={(e) => setUser({ ...user, nom: e.target.value })}
                    placeholder="Votre nom"
                  />
                </Field>
              </div>

              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="votre.email@exemple.com"
                />
              </Field>

              <Field label="Téléphone" htmlFor="telephone">
                <Input
                  id="telephone"
                  type="tel"
                  value={user?.telephone || ''}
                  onChange={(e) => setUser({ ...user, telephone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </Field>

              <Field label="Date de naissance" htmlFor="naissance">
                <Input
                  id="naissance"
                  type="date"
                  value={user?.naissance || ''}
                  onChange={(e) => setUser({ ...user, naissance: e.target.value })}
                />
              </Field>

              <Button type="submit" variant="primary" onClick={EnregistrerDonnees} className="mt-1 self-start">
                Enregistrer les modifications
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      {modalMotDePasseOuvert && <ChangerMotDePasseModal onClose={() => setModalMotDePasseOuvert(false)} />}
    </DashboardLayout>
  );
}
