'use client';

import React, { useRef, useEffect, useState } from 'react';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

function getInitiales(nom?: string, prenom?: string) {
  if (!nom && !prenom) return '';
  return ((prenom ? prenom[0] : '') + (nom ? nom[0] : '')).toUpperCase();
}

export default function Profil() {
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUtilisateur(JSON.parse(userData));
    }
  }, []);

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

      {/*
        Formulaire en lecture seule dans la version d'origine : aucun des champs n'était
        modifiable et il n'y avait ni onChange ni action de sauvegarde réelle (pas de
        profileService/endpoint de mise à jour dans ce projet). Le bouton "Enregistrer" était
        même rendu en dehors de la balise <form>, ce qui le rendait totalement inerte. On
        conserve ce comportement en lecture seule (aucune sauvegarde n'est inventée) mais on
        replace le bouton dans le <form> avec un onSubmit qui empêche le rechargement de page
        par défaut du navigateur.
      */}
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6 items-center">
      <div className="flex flex-col lg:flex-row gap-4 justify-center w-full">
        {/* Colonne gauche */}
        <Card className="w-full lg:max-w-xs">
          <CardBody className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-brand-600 text-white flex items-center justify-center text-3xl font-semibold mb-4">
              {getInitiales(utilisateur.nom, utilisateur.prenom)}
            </div>
            <label htmlFor="photo" className="text-sm font-medium text-slate-700 mb-2">
              Changer la photo :
            </label>
            <input ref={fileInputRef} type="file" id="photo" accept="image/*" className="text-sm text-slate-600 mb-5 w-full" />

            <div className="w-full text-left">
              <div className="text-sm font-semibold text-slate-900 mb-1">Nom d&apos;utilisateur :</div>
              <div className="text-sm text-slate-600 mb-4">{utilisateur.login || utilisateur.nomUtilisateur}</div>
              <div className="text-sm font-semibold text-slate-900 mb-1">Mot de passe :</div>
              <div className="text-sm text-slate-600 mb-4">********</div>
              <Button type="button" variant="secondary" className="w-full">
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
              <Input id="telephone" type="text" value={utilisateur.telephone || ''} readOnly />
            </Field>
            <Field label="Adresse email" htmlFor="email">
              <Input id="email" type="email" value={utilisateur.email || utilisateur.emailUtilisateur || ''} readOnly />
            </Field>
            <Field label="Date de naissance" htmlFor="naissance">
              <Input id="naissance" type="text" value={utilisateur.naissance || ''} readOnly />
            </Field>
          </CardBody>
        </Card>
      </div>

        <Button type="submit" variant="primary">
          Enregistrer
        </Button>
      </form>
    </DashboardLayout>
  );
}
