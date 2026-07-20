'use client';

import React, { useEffect, useState } from 'react';
import { Archive as ArchiveIcon, X, Search } from 'lucide-react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input, Select } from '../../../components/ui/Input';
import { StatutBadge, PrioriteBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

export default function ArchivesEmploye() {
  useAuthRedirect();
  const [archives, setArchives] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');

  // États pour le modal de rapport de clôture
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/archivesTicketsEmploye.php`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setArchives(data.archives || []);
          setError(null);
        } else {
          setError(data.error || 'Erreur lors du chargement des archives');
        }
        setChargement(false);
      })
      .catch((error) => {
        console.error('Erreur lors du chargement des archives:', error);
        setError('Erreur lors du chargement des archives');
        setChargement(false);
      });
  }, []);

  // Filtres dynamiques
  const archivesFiltres = archives.filter((archive) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      search === '' ||
      archive.titre?.toLowerCase().includes(searchLower) ||
      archive.idTicketArchive?.toString().toLowerCase() === searchLower ||
      archive.idTicketArchive?.toString().toLowerCase().includes(searchLower) ||
      archive.categorie?.toLowerCase().includes(searchLower) ||
      archive.description?.toLowerCase().includes(searchLower);
    const matchCategorie = !categorie || categorie === 'Toutes catégories' || archive.categorie === categorie;
    const matchStatut = !statut || statut === 'Tous statuts' || archive.statut === statut;
    const matchPriorite = !priorite || priorite === 'Tous' || archive.priorite === priorite.toLowerCase();
    const archiveDate = archive.dateTicketCloture ? archive.dateTicketCloture.split(' ')[0] : '';
    const matchDateMin = !dateMin || archiveDate >= dateMin;
    const matchDateMax = !dateMax || archiveDate <= dateMax;
    return matchSearch && matchCategorie && matchStatut && matchPriorite && matchDateMin && matchDateMax;
  });

  // Stats
  const nbResolu = archives.filter((a) => a.statut === 'resolu').length;
  const nbFerme = archives.filter((a) => a.statut === 'ferme').length;
  const nbTotal = archives.length;
  const tempsMoyen =
    archives.length > 0
      ? archives.reduce((total, archive) => {
          const dateCreation = new Date(archive.dateCreation);
          const dateCloture = new Date(archive.dateTicketCloture);
          const diffTime = Math.abs(dateCloture.getTime() - dateCreation.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return total + diffDays;
        }, 0) / archives.length
      : 0;

  // Catégories dynamiques
  const categories = Array.from(new Set(archives.map((a) => a.categorie).filter(Boolean)));
  const statuts = Array.from(new Set(archives.map((a) => a.statut).filter(Boolean)));
  const priorites = Array.from(new Set(archives.map((a) => a.priorite).filter(Boolean)));

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ouvrirModalRapport = (archive: any) => {
    setSelectedArchive(archive);
    setShowRapportModal(true);
  };

  return (
    <DashboardLayout role="employe">
      <PageHeader title="Archives" description="Retrouvez ici tous vos tickets archivés et leur historique complet." />

      {error ? (
        <Card>
          <CardBody>
            <p className="text-sm text-red-600">{error}</p>
          </CardBody>
        </Card>
      ) : chargement ? (
        <div className="py-16 text-center text-sm text-slate-500">Chargement des archives...</div>
      ) : (
        <>
          {/* Statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardBody className="text-center">
                <div className="text-2xl font-semibold text-slate-900">{nbTotal}</div>
                <div className="text-xs text-slate-500 mt-1">Total archivés</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-2xl font-semibold text-emerald-600">{nbResolu}</div>
                <div className="text-xs text-slate-500 mt-1">Résolus</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-2xl font-semibold text-slate-500">{nbFerme}</div>
                <div className="text-xs text-slate-500 mt-1">Fermés</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-2xl font-semibold text-amber-600">{Math.round(tempsMoyen)}</div>
                <div className="text-xs text-slate-500 mt-1">Jours moyens</div>
              </CardBody>
            </Card>
          </div>

          {/* Filtres */}
          <Card className="mb-6">
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <Field label="Recherche" htmlFor="f-search">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input id="f-search" type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                  </div>
                </Field>
                <Field label="Catégorie" htmlFor="f-cat">
                  <Select id="f-cat" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                    <option value="">Toutes catégories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Statut" htmlFor="f-statut">
                  <Select id="f-statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
                    <option value="">Tous statuts</option>
                    {statuts.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priorité" htmlFor="f-priorite">
                  <Select id="f-priorite" value={priorite} onChange={(e) => setPriorite(e.target.value)}>
                    <option value="">Toutes priorités</option>
                    {priorites.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Du" htmlFor="f-datemin">
                  <Input id="f-datemin" type="date" value={dateMin} onChange={(e) => setDateMin(e.target.value)} />
                </Field>
                <Field label="Au" htmlFor="f-datemax">
                  <Input id="f-datemax" type="date" value={dateMax} onChange={(e) => setDateMax(e.target.value)} />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Liste des archives */}
          {archivesFiltres.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ArchiveIcon size={22} />}
                title={archives.length === 0 ? 'Pas de tickets archivés' : 'Aucune archive trouvée'}
                description={
                  archives.length === 0
                    ? "Aucun de vos tickets n'a encore été archivé."
                    : 'Aucun ticket archivé ne correspond à vos critères de recherche.'
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivesFiltres.map((archive) => (
                <Card key={archive.idTicketArchive} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardBody onClick={() => ouvrirModalRapport(archive)}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">{archive.titre}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatutBadge statut={archive.statut} />
                        <PrioriteBadge priorite={archive.priorite} />
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                      {archive.description?.length > 100 ? archive.description.substring(0, 100) + '...' : archive.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Créé le {formatDate(archive.dateCreation)}</span>
                      <span>Clôturé le {formatDate(archive.dateTicketCloture)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Technicien : {archive.nomTechnicien ? `${archive.prenomTechnicien} ${archive.nomTechnicien}` : 'Non assigné'}</span>
                      <span>#{archive.idTicketArchive}</span>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de rapport */}
      {showRapportModal && selectedArchive && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg shadow-md w-full max-w-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">Rapport de clôture - #{selectedArchive.idTicketArchive}</h2>
              <button
                onClick={() => setShowRapportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 text-sm text-slate-700 flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{selectedArchive.titre}</h3>
                <p className="text-slate-600 leading-relaxed">{selectedArchive.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatutBadge statut={selectedArchive.statut} />
                <PrioriteBadge priorite={selectedArchive.priorite} />
                {selectedArchive.categorie && <span className="text-xs text-slate-500">Catégorie : {selectedArchive.categorie}</span>}
              </div>

              <div className="text-slate-600">
                <span className="font-medium text-slate-900">Technicien : </span>
                {selectedArchive.nomTechnicien ? `${selectedArchive.prenomTechnicien} ${selectedArchive.nomTechnicien}` : 'Non assigné'}
              </div>

              {selectedArchive.rapport && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Rapport de clôture :</h4>
                  <div className="bg-slate-50 rounded-md p-4 text-slate-700 whitespace-pre-wrap">{selectedArchive.rapport}</div>
                </div>
              )}

              <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                <div>Créé le : {formatDate(selectedArchive.dateCreation)}</div>
                <div>Clôturé le : {formatDate(selectedArchive.dateTicketCloture)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
