'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastContainer } from 'react-toastify';
// @ts-ignore: CSS module declaration missing for react-toastify side-effect import
import 'react-toastify/dist/ReactToastify.css';
import { ClipboardList, Sparkles, Plus, X, Eye, Clock, CheckCircle2 } from 'lucide-react';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import PageHeader from '../../../components/ui/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Field, Input, Textarea, Select } from '../../../components/ui/Input';
import { StatutBadge, PrioriteBadge } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

type FormulaireTicket = {
  titre: string;
  description: string;
  categorie: string;
  sousCategorie: string;
  serviceConcerne: string;
  priorite: string;
  piecesJointes: File[];
};

function ModalNouveauTicket({ ouvert, onFermer, onTicketCree = undefined, setMessageConfirmation }: { ouvert: boolean; onFermer: () => void; onTicketCree?: (ticket?: any) => void; setMessageConfirmation?: (msg: string) => void }) {
  const [formulaire, setFormulaire] = useState<FormulaireTicket>({
    titre: '',
    description: '',
    categorie: '',
    sousCategorie: '',
    serviceConcerne: '',
    priorite: 'normale',
    piecesJointes: [],
  });
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [sousCategories, setSousCategories] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const gererChangement = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    if (name === 'piecesJointes') {
      const fileList = Array.from(files || []) as File[];
      setFormulaire({ ...formulaire, piecesJointes: fileList });
    } else {
      // Limite de 75 caractères pour le titre
      if (name === 'titre' && value.length > 75) {
        return;
      }
      setFormulaire({ ...formulaire, [name]: value });
    }
  };

  const gererSoumission = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    // Validation côté client pour le titre
    if (formulaire.titre.length > 75) {
      setMessage('Le titre du ticket ne peut pas dépasser 75 caractères. Veuillez raccourcir le titre.');
      return;
    }

    setChargement(true);
    setMessage('');
    try {
      const donneesFormulaire = new FormData();
      Object.entries(formulaire).forEach(([cle, valeur]) => {
        if (cle === 'piecesJointes' && Array.isArray(valeur)) {
          // Ajouter chaque fichier séparément
          valeur.forEach((file, index) => {
            donneesFormulaire.append(`piecesJointes[${index}]`, file);
          });
        } else if (valeur && typeof valeur === 'string') {
          donneesFormulaire.append(cle, valeur);
        }
      });
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ajouterTicket.php`, {
        method: 'POST',
        body: donneesFormulaire,
        credentials: 'include',
      });
      const donnees = await reponse.json();
      if (donnees.success) {
        setMessage('Ticket créé avec succès !');
        setTimeout(() => {
          setMessage('');
          setFormulaire({ titre: '', description: '', categorie: '', sousCategorie: '', serviceConcerne: '', priorite: 'normale', piecesJointes: [] });
          onFermer();
          onTicketCree && onTicketCree();
          setMessageConfirmation && setMessageConfirmation('Ticket créé avec succès !');
          setTimeout(() => {
            setMessageConfirmation && setMessageConfirmation('');
          }, 5000);
        }, 1000);
      } else {
        setMessage(donnees.error || donnees.message || 'Erreur lors de la création du ticket');
      }
    } catch (err) {
      setMessage('Erreur serveur');
    }
    setChargement(false);
  };

  useEffect(() => {
    // Charger les catégories
    fetch(`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/backend/getCategories.php`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => setCategories([]));

    // Charger les services disponibles
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listeServicesPublic.php`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.services) {
          setServices(data.services);
        }
      })
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (formulaire.categorie) {
      fetch(`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/backend/getSousCategories.php?categorie=${encodeURIComponent(formulaire.categorie)}`)
        .then(res => res.json())
        .then(data => setSousCategories(data))
        .catch(() => setSousCategories([]));
    } else {
      setSousCategories([]);
    }
  }, [formulaire.categorie]);

  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 px-4">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-md p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onFermer} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Nouveau ticket</h2>
        <form onSubmit={gererSoumission} className="flex flex-col gap-4" encType="multipart/form-data">
          <Field label="Titre du ticket" htmlFor="titre">
            <Input
              id="titre"
              type="text"
              name="titre"
              value={formulaire.titre}
              onChange={gererChangement}
              placeholder="Ex : Problème de connexion VPN"
              maxLength={75}
            />
            <div className={`text-xs mt-1 ${formulaire.titre.length > 70 ? 'text-red-600' : 'text-slate-400'}`}>
              {formulaire.titre.length}/75 caractères
            </div>
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              value={formulaire.description}
              onChange={gererChangement}
              rows={6}
              placeholder={'Problème rencontré :\nActions déjà tentées :\nImpact :'}
            />
          </Field>

          <Field label="Catégorie" htmlFor="categorie">
            <Select id="categorie" name="categorie" value={formulaire.categorie} onChange={gererChangement}>
              <option value="">-- Sélectionner --</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </Field>

          {sousCategories.length > 0 && (
            <Field label="Sous-catégorie" htmlFor="sousCategorie">
              <Select id="sousCategorie" name="sousCategorie" value={formulaire.sousCategorie} onChange={gererChangement}>
                <option value="">-- Sélectionner --</option>
                {sousCategories.map(subCat => (
                  <option key={subCat} value={subCat}>{subCat}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Service concerné" htmlFor="serviceConcerne" required>
            <Select id="serviceConcerne" name="serviceConcerne" value={formulaire.serviceConcerne} onChange={gererChangement} required>
              <option value="">-- Sélectionner un service --</option>
              {services.map((service) => (
                <option key={service.idService} value={service.idService}>
                  {service.nomService} ({service.heureDebut} - {service.heureFin})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priorité" htmlFor="priorite" required>
            <Select id="priorite" name="priorite" value={formulaire.priorite} onChange={gererChangement} required>
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </Select>
          </Field>

          <Field label="Pièces jointes" htmlFor="piecesJointes">
            <input
              id="piecesJointes"
              type="file"
              name="piecesJointes"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.doc,.docx,.xls,.xlsx,.csv"
              onChange={gererChangement}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm"
            />
          </Field>
          {formulaire.piecesJointes.length > 0 && (
            <div className="text-xs text-slate-500 flex flex-col gap-0.5">
              {formulaire.piecesJointes.map((file, index) => (
                <div key={index}>{file.name}</div>
              ))}
            </div>
          )}

          {message && (
            <div className={`text-sm rounded-md px-3 py-2 ${message.includes('succès') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <Button type="button" variant="secondary" onClick={onFermer} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={chargement} className="flex-1">
              {chargement ? 'Création...' : 'Créer le ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffJ = Math.floor(diffH / 24);
  return `il y a ${diffJ}j`;
}

export default function MesTicketsAdmin() {
  useAuthRedirect();
  const [tickets, setTickets] = useState<any[]>([]);
  const [utilisateur, setUtilisateur] = useState<any>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [messageConfirmation, setMessageConfirmation] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtrePriorite, setFiltrePriorite] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUtilisateur(JSON.parse(userData));
    }
    chargerTickets();
  }, []);

  const chargerTickets = async () => {
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/mesTicketsAdmin.php`, {
        credentials: 'include',
      });
      const donnees = await reponse.json();
      if (donnees.success) {
        setTickets(donnees.tickets || []);
      } else {
        console.error('Erreur lors du chargement des tickets:', donnees.message);
        setTickets([]);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      setTickets([]);
    } finally {
      setChargement(false);
    }
  };

  const refreshTickets = () => {
    chargerTickets();
  };

  const filtrerTickets = () => {
    return tickets.filter(ticket => {
      const matchStatut = filtreStatut === 'tous' || ticket.statut === filtreStatut;
      const matchPriorite = filtrePriorite === 'tous' || ticket.priorite === filtrePriorite;
      const matchRecherche = !recherche ||
        ticket.titre.toLowerCase().includes(recherche.toLowerCase()) ||
        ticket.description.toLowerCase().includes(recherche.toLowerCase());

      return matchStatut && matchPriorite && matchRecherche;
    });
  };

  const ticketsFiltres = filtrerTickets();

  if (!utilisateur) return null;

  const statCards = [
    { label: 'Mes tickets', value: tickets.length, icon: <ClipboardList size={18} /> },
    { label: 'En attente', value: tickets.filter(t => t.statut === 'en_attente').length, icon: <Clock size={18} /> },
    { label: 'En cours', value: tickets.filter(t => t.statut === 'en_cours').length, icon: <Clock size={18} /> },
    { label: 'Fermés', value: tickets.filter(t => t.statut === 'ferme').length, icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Mes tickets"
        description="Gérez vos tickets personnels et suivez leur progression."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOuvert(true)}>
            Nouveau ticket
          </Button>
        }
      />

      {messageConfirmation && (
        <div className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-emerald-50 text-emerald-700 mb-4">
          <CheckCircle2 size={16} /> {messageConfirmation}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</span>
                <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">{s.icon}</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Rechercher" htmlFor="recherche">
              <Input
                id="recherche"
                type="text"
                placeholder="Rechercher un ticket..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </Field>
            <Field label="Statut" htmlFor="filtreStatut">
              <Select id="filtreStatut" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
                <option value="tous">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="ferme">Fermé</option>
              </Select>
            </Field>
            <Field label="Priorité" htmlFor="filtrePriorite">
              <Select id="filtrePriorite" value={filtrePriorite} onChange={(e) => setFiltrePriorite(e.target.value)}>
                <option value="tous">Toutes priorités</option>
                <option value="urgent">Urgent</option>
                <option value="eleve">Élevé</option>
                <option value="normal">Normal</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        {chargement ? (
          <div className="text-center text-slate-500 py-16">Chargement de vos tickets...</div>
        ) : ticketsFiltres.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="Aucun ticket trouvé"
            description={
              tickets.length === 0
                ? "Vous n'avez pas encore créé de tickets."
                : 'Aucun ticket ne correspond à vos critères de recherche.'
            }
            action={
              <Button variant="primary" icon={<Sparkles size={16} />} onClick={() => setModalOuvert(true)}>
                Créer votre premier ticket
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium px-5 py-3">Ticket</th>
                  <th className="text-left font-medium px-5 py-3">Catégorie</th>
                  <th className="text-left font-medium px-5 py-3">Priorité</th>
                  <th className="text-left font-medium px-5 py-3">Statut</th>
                  <th className="text-left font-medium px-5 py-3">Créé</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ticketsFiltres.map((ticket) => (
                  <tr
                    key={ticket.idTicket}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => window.open(`/admin/ticket/${ticket.idTicket}`, '_blank')}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">#{ticket.idTicket}</span>
                        <span className="font-medium text-slate-900">{ticket.titre}</span>
                      </div>
                      {ticket.sousCategorie && (
                        <p className="text-xs text-slate-400 mt-0.5">{ticket.sousCategorie}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{ticket.categorie || 'Non catégorisé'}</td>
                    <td className="px-5 py-3"><PrioriteBadge priorite={ticket.priorite} /></td>
                    <td className="px-5 py-3"><StatutBadge statut={ticket.statut} /></td>
                    <td className="px-5 py-3 text-slate-500">{formatRelativeTime(ticket.dateCreation)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/ticket/${ticket.idTicket}`);
                        }}
                      >
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ModalNouveauTicket
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        onTicketCree={refreshTickets}
        setMessageConfirmation={setMessageConfirmation}
      />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </DashboardLayout>
  );
}
