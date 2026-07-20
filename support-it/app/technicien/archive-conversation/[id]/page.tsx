'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Avatar from '../../../../components/Avatar';
import EmptyState from '../../../../components/ui/EmptyState';
import { ArrowLeft, MessageSquare, Paperclip } from 'lucide-react';

export default function ArchiveConversationTechnicien() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [archive, setArchive] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Récupérer les données de l'archive
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getArchiveById.php?idTicketArchive=${id}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setArchive(data.archive);
          // Récupérer les messages de la conversation archivée
          return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/conversationArchive.php?idTicketArchive=${id}`, {
            credentials: 'include',
          });
        } else {
          setLoadError(data.error || 'Erreur inconnue');
        }
      })
      .then((res) => res?.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else if (data && !data.success) {
          console.error('Erreur lors du chargement des messages:', data.error);
        }
      })
      .catch((error) => {
        setLoadError('Impossible de joindre le serveur : ' + error.message);
      });

    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!archive) {
    return (
      <DashboardLayout role="technicien">
        {loadError ? (
          <Card>
            <EmptyState
              title="Erreur de chargement"
              description={loadError}
              action={
                <Button variant="primary" onClick={() => router.push('/connexion')}>
                  Se reconnecter
                </Button>
              }
            />
          </Card>
        ) : (
          <p className="text-slate-500 text-sm">Chargement de la conversation...</p>
        )}
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout role="technicien">
        <p className="text-slate-500 text-sm">Chargement utilisateur...</p>
      </DashboardLayout>
    );
  }

  const pieces: string[] = archive.pieceJointe
    ? (Array.isArray(archive.pieceJointe) ? archive.pieceJointe : String(archive.pieceJointe).split(',')).filter((f: string) => f)
    : [];

  return (
    <DashboardLayout role="technicien">
      <PageHeader
        title={`Conversation archivée — #${archive.idTicketArchive}`}
        description={archive.titre}
        actions={
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => router.push('/technicien/archives')}>
            Retour aux archives
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900">Détail du ticket archivé</h3>
            </CardHeader>
            <CardBody>
              <dl className="flex flex-col gap-2 text-sm mb-3">
                <div className="flex justify-between">
                  <dt className="text-slate-500">ID Archive</dt>
                  <dd className="text-slate-900">#{archive.idTicketArchive}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Titre</dt>
                  <dd className="text-slate-900 text-right">{archive.titre}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Clôturé le</dt>
                  <dd className="text-slate-900">{formatDate(archive.dateTicketCloture)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Catégorie</dt>
                  <dd className="text-slate-900">{archive.categorie}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sous-catégorie</dt>
                  <dd className="text-slate-900">{archive.sousCategorie || '—'}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={archive.statut === 'resolu' ? 'success' : 'danger'}>{archive.statut === 'resolu' ? 'Résolu' : 'Fermé'}</Badge>
                <Badge tone={archive.priorite === 'urgent' ? 'danger' : archive.priorite === 'élevé' ? 'warning' : 'success'}>
                  {archive.priorite ? archive.priorite.charAt(0).toUpperCase() + archive.priorite.slice(1) : ''}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900">Description du problème</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{archive.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900">Pièce(s) jointe(s) du ticket</h3>
            </CardHeader>
            <CardBody>
              {pieces.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {pieces.map((f, i) => {
                    const ext = f.split('.').pop()?.toLowerCase();
                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                    const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                    return (
                      <li key={i}>
                        {isImage ? (
                          <a
                            href={chemin}
                            onClick={(e) => {
                              e.preventDefault();
                              setLightboxImg(chemin);
                              setLightboxOpen(true);
                            }}
                            className="inline-block border border-slate-200 rounded overflow-hidden"
                          >
                            <img src={chemin} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                          </a>
                        ) : (
                          <a href={chemin} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm">
                            {f.split('/').pop()}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">Aucune pièce jointe pour ce ticket</p>
              )}
            </CardBody>
          </Card>

          {archive.rapport && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900">Rapport de clôture</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{archive.rapport}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare size={15} /> Historique de la conversation
            </h3>
            <span className="text-xs text-slate-500">{messages.length} messages</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-slate-400 text-center">
              Discussion du {formatDate(archive.dateCreation)} au {formatDate(archive.dateTicketCloture)}
            </p>

            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">Aucun message trouvé pour cette conversation.</p>
            )}

            {messages.map((msg, idx) => {
              const isMine = msg.idExpediteur === user.id;
              const listeFichiers: string[] =
                Array.isArray(msg.fichiersJoints) && msg.fichiersJoints.length > 0
                  ? msg.fichiersJoints
                  : msg.fichierJoint
                  ? [msg.fichierJoint]
                  : [];

              return (
                <div key={idx} className={`w-full flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar photoUrl={msg.avatar} nom={msg.nom} prenom={msg.prenom} size={32} />
                  <div className={`max-w-[70%] rounded-lg px-3 py-2.5 ${isMine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-brand-50 text-right' : 'text-slate-500'}`}>
                      {msg.prenom || msg.prenomExpediteur || ''} {msg.nom || msg.nomExpediteur || msg.nomUtilisateur || 'Utilisateur inconnu'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    {listeFichiers.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {listeFichiers.map((f: string, i: number) => {
                          const ext = f.split('.').pop()?.toLowerCase();
                          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
                          const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                          return isImage ? (
                            <img
                              key={i}
                              src={chemin}
                              alt="fichier joint"
                              className="max-w-[180px] max-h-[120px] rounded cursor-pointer block"
                              onClick={() => {
                                setLightboxImg(chemin);
                                setLightboxOpen(true);
                              }}
                            />
                          ) : (
                            <a
                              key={i}
                              href={chemin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 text-xs underline ${isMine ? 'text-brand-50' : 'text-brand-600'}`}
                            >
                              <Paperclip size={11} /> {f.split('/').pop()}
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <p className={`text-[11px] mt-1.5 ${isMine ? 'text-brand-100' : 'text-slate-400'}`}>
                      {new Date(msg.dateEnvoi).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        timeZone: 'Europe/Paris',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </CardBody>
        </Card>
      </div>

      {lightboxOpen && lightboxImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[2000] bg-slate-900/70 flex items-center justify-center cursor-zoom-out"
        >
          <img
            src={lightboxImg}
            alt="Agrandissement"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="fixed top-8 right-10 bg-slate-900/60 text-white rounded-full w-10 h-10 text-2xl flex items-center justify-center"
            aria-label="Fermer la lightbox"
          >
            ×
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
