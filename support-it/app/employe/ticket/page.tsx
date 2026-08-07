'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Eye, Trash2, X } from 'lucide-react';
import { ticketService } from '../../../services/api';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input, Textarea, Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { StatutBadge, PrioriteBadge, PrioriteDot, MessagesNonLusBadge } from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { EVENEMENT_RAFRAICHIR_NOTIFICATIONS } from '../../../lib/notificationEvents';

function NouveauTicketModal({ open, onClose, onTicketCree }: { open: boolean; onClose: () => void; onTicketCree?: () => void }) {
  const [form, setForm] = useState<{
    titre: string;
    description: string;
    idSousCategorie: string;
    pieceJointe: File | null;
  }>({
    titre: '',
    description: '',
    idSousCategorie: '',
    pieceJointe: null,
  });
  // Sélection de catégorie : uniquement pour filtrer les sous-catégories
  // affichées côté client, jamais envoyée au serveur (le service est déduit
  // côté backend à partir de idSousCategorie via categorie -> services).
  const [idCategorieSelectionnee, setIdCategorieSelectionnee] = useState('');
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);
  const [categories, setCategories] = useState<{ idCategorie: number; nomCategorie: string }[]>([]);
  const [sousCategories, setSousCategories] = useState<{ idSousCategorie: number; nomSousCategorie: string }[]>([]);

  // Charger les catégories une seule fois à l'ouverture du formulaire.
  useEffect(() => {
    if (!open) return;
    const chargerCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/backend/getCategories.php`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) setCategories(data.categories);
      } catch (e) {}
    };
    chargerCategories();
  }, [open]);

  // Charger les sous-catégories de la catégorie sélectionnée.
  useEffect(() => {
    if (!idCategorieSelectionnee) {
      setSousCategories([]);
      return;
    }
    const chargerSousCategories = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/backend/getSousCategories.php?idCategorie=${idCategorieSelectionnee}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        if (data.success) setSousCategories(data.sousCategories);
      } catch (e) {
        setSousCategories([]);
      }
      setForm((prev) => ({ ...prev, idSousCategorie: '' }));
    };
    chargerSousCategories();
  }, [idCategorieSelectionnee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'pieceJointe') {
      const files = (e.target as HTMLInputElement).files;
      setForm({ ...form, pieceJointe: files ? files[0] : null });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setMessage('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value as string | Blob);
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ajouterTicket.php`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Ticket créé avec succès !');
        setTimeout(() => {
          setMessage('');
          setForm({ titre: '', description: '', idSousCategorie: '', pieceJointe: null });
          setIdCategorieSelectionnee('');
          onTicketCree && onTicketCree();
          onClose();
        }, 1000);
      } else {
        setMessage(data.error || data.message || 'Erreur lors de la création du ticket');
      }
    } catch (err) {
      setMessage('Erreur serveur');
    }
    setChargement(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg shadow-md w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5" encType="multipart/form-data">
          <Field label="Titre du ticket" htmlFor="titre" required>
            <Input
              id="titre"
              type="text"
              name="titre"
              value={form.titre}
              onChange={handleChange}
              placeholder="Ex : Problème de connexion VPN"
              required
            />
          </Field>

          <Field label="Description" htmlFor="description" required>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder={'Problème rencontré :\nActions déjà tentées :\nImpact :'}
              required
            />
          </Field>
          <div className="text-xs text-slate-500 -mt-2">
            <b>Astuce :</b> Décrivez le problème, les actions tentées et l&apos;impact. Exemple :
            <ul className="list-disc pl-5 mt-1.5 flex flex-col gap-0.5">
              <li>Problème rencontré : Impossible de me connecter au VPN...</li>
              <li>Actions déjà tentées : Redémarrage, réinstallation...</li>
              <li>Impact : Je ne peux pas accéder aux ressources internes...</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Catégorie" htmlFor="categorie">
              <Select
                id="categorie"
                name="categorie"
                value={idCategorieSelectionnee}
                onChange={(e) => setIdCategorieSelectionnee(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {categories.map((cat) => (
                  <option key={cat.idCategorie} value={cat.idCategorie}>
                    {cat.nomCategorie}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sous-catégorie" htmlFor="idSousCategorie">
              <Select
                id="idSousCategorie"
                name="idSousCategorie"
                value={form.idSousCategorie}
                onChange={handleChange}
                disabled={!idCategorieSelectionnee}
              >
                <option value="">{!idCategorieSelectionnee ? "-- Sélectionnez d'abord une catégorie --" : '-- Sélectionner --'}</option>
                {sousCategories.map((sc) => (
                  <option key={sc.idSousCategorie} value={sc.idSousCategorie}>
                    {sc.nomSousCategorie}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Pièce jointe (facultatif, PDF, image, txt...)" htmlFor="pieceJointe">
            <input
              id="pieceJointe"
              type="file"
              name="pieceJointe"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.doc,.docx,.xls,.xlsx,.csv"
              onChange={handleChange}
              className="text-sm text-slate-600"
            />
            {form.pieceJointe && <div className="text-sm text-slate-600 mt-1">Fichier sélectionné : {form.pieceJointe.name}</div>}
          </Field>

          <div className="flex gap-3 mt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={chargement} className="flex-1">
              {chargement ? 'Création...' : 'Créer le ticket'}
            </Button>
          </div>
          {message && (
            <div className={`text-sm text-center rounded-md px-3 py-2 ${message.includes('succès') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Tickets() {
  return (
    <Suspense fallback={null}>
      <TicketsContent />
    </Suspense>
  );
}

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recherche, setRecherche] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [chargementTickets, setChargementTickets] = useState(true);

  useEffect(() => {
    chargerTickets();
    // Permet d'arriver directement sur le formulaire de création depuis un
    // lien externe (ex: accueil), sans avoir à re-cliquer sur "Nouveau ticket".
    if (searchParams.get('nouveau') === '1') {
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revenir sur cette page (ex: bouton "Retour" depuis la fiche d'un ticket
  // qu'on vient de consulter) ne redéclenche pas forcément ce useEffect côté
  // navigateur : le badge de messages non lus par ticket restait donc affiché
  // avec l'ancien nombre tant qu'on ne rechargeait pas la page entièrement.
  // 'focus' ne suffit pas : il ne se déclenche que si l'onglet change de
  // fenêtre, pas lors d'une navigation interne (bouton "Voir"/"Continuer" puis
  // retour) — Next.js peut garder cette page en cache sans la démonter, donc
  // son useEffect de chargement initial ne se relance pas non plus.
  // EVENEMENT_RAFRAICHIR_NOTIFICATIONS est déjà émis par la fiche du ticket
  // dès qu'on l'ouvre (cf. markTicketNotificationsRead.php) : on s'en sert
  // aussi ici pour forcer un rechargement au bon moment.
  useEffect(() => {
    window.addEventListener('focus', chargerTickets);
    window.addEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, chargerTickets);
    return () => {
      window.removeEventListener('focus', chargerTickets);
      window.removeEventListener(EVENEMENT_RAFRAICHIR_NOTIFICATIONS, chargerTickets);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chargerTickets = async () => {
    setChargementTickets(true);
    try {
      const res = await ticketService.getAllTickets();
      if (res.success) setTickets(res.tickets);
    } catch (e) {}
    setChargementTickets(false);
  };

  // Le bouton "Supprimer" n'avait aucun handler dans la version précédente ;
  // ajout de la suppression via ticketService (même pattern que la page
  // technicien équivalente), avec confirmation.
  const supprimerTicket = async (idTicket: number, titre?: string) => {
    if (!window.confirm(`Supprimer définitivement le ticket "${titre || idTicket}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      const res = await ticketService.supprimerTicket(idTicket);
      if (res.success) {
        setTickets((prev) => prev.filter((t) => t.idTicket !== idTicket));
      } else {
        alert(res.error || res.message || 'Erreur lors de la suppression du ticket');
      }
    } catch (e) {
      alert('Erreur serveur lors de la suppression');
    }
  };

  const ticketsFiltres = tickets.filter((ticket) =>
    ticket.titre.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <DashboardLayout role="employe">
      <PageHeader
        title="Mes tickets"
        description="Suivez et créez vos demandes de support."
        actions={
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un ticket..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Nouveau ticket
            </Button>
          </>
        }
      />

      <Card>
        {chargementTickets ? (
          <div className="py-16 text-center text-sm text-slate-500">Chargement des tickets...</div>
        ) : ticketsFiltres.length === 0 ? (
          <EmptyState
            title="Aucun ticket trouvé"
            description={recherche ? 'Aucun ticket ne correspond à votre recherche.' : "Vous n'avez pas encore créé de ticket."}
            action={
              !recherche && (
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                  Nouveau ticket
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium px-5 py-3">ID</th>
                  <th className="text-left font-medium px-5 py-3">Titre</th>
                  <th className="text-left font-medium px-5 py-3">Priorité</th>
                  <th className="text-left font-medium px-5 py-3">Statut</th>
                  <th className="text-left font-medium px-5 py-3">Assigné à</th>
                  <th className="text-left font-medium px-5 py-3">Date création</th>
                  <th className="text-center font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ticketsFiltres.map((ticket) => (
                  <tr key={ticket.idTicket} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <PrioriteDot priorite={ticket.priorite} />
                        #{ticket.idTicket}
                        <MessagesNonLusBadge nombreMessages={ticket.nombreMessages} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{ticket.titre}</td>
                    <td className="px-5 py-3"><PrioriteBadge priorite={ticket.priorite} /></td>
                    <td className="px-5 py-3"><StatutBadge statut={ticket.statut} /></td>
                    <td className="px-5 py-3 text-slate-600">{ticket.nomTechnicien ? ticket.nomTechnicien : '-'}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {ticket.dateCreation ? ticket.dateCreation.split(' ')[0].split('-').reverse().join('/') : ''}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Eye size={14} />}
                          onClick={() => router.push(`/employe/tickets/${ticket.idTicket}`)}
                        >
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 size={14} />}
                          onClick={() => supprimerTicket(ticket.idTicket, ticket.titre)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NouveauTicketModal open={modalOpen} onClose={() => setModalOpen(false)} onTicketCree={chargerTickets} />
    </DashboardLayout>
  );
}
