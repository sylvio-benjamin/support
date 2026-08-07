'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import DashboardLayout from '../../../../components/ui/DashboardLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';

export default function ArchiveConversationDirecteur() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [archive, setArchive] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string|null>(null);

  useEffect(() => {
    if (!id) return;

    // Récupérer les données de l'archive
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getArchiveById.php?idTicketArchive=${id}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Données de l\'archive reçues:', data.archive);
          setArchive(data.archive);
          // Récupérer les messages de la conversation archivée
          return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/conversationArchive.php?idTicketArchive=${id}`, {
            credentials: 'include'
          });
        } else {
          console.error('Erreur lors du chargement de l\'archive:', data.error);
        }
      })
      .then(res => res?.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      })
      .catch(error => {
        console.error('Erreur lors du chargement:', error);
      });

    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!archive || !user) {
    return (
      <DashboardLayout role="directeur">
        <p className="text-sm text-slate-500 text-center py-16">
          {!archive ? 'Chargement de la conversation...' : 'Chargement utilisateur...'}
        </p>
      </DashboardLayout>
    );
  }

  function getInitials(nom: string, prenom: string) {
    return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
  }

  function getColorFromName(nom: string) {
    const colors = ['#6B46C1', '#4c6ef5', '#22c55e', '#eab308', '#ef4444'];
    let sum = 0;
    for (let i = 0; i < nom.length; i++) sum += nom.charCodeAt(i);
    return colors[sum % colors.length];
  }

  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const statutTone = archive.statut === 'resolu' ? 'success' : 'neutral';
  const prioriteTone = archive.priorite === 'urgente' ? 'danger' : archive.priorite === 'haute' ? 'warning' : 'success';

  return (
    <DashboardLayout role="directeur">
      <PageHeader
        title={`Conversation archivée — #${archive.idTicketArchive}`}
        description={archive.titre}
        actions={
          <>
            <Badge tone={statutTone}>{archive.statut === 'resolu' ? 'Résolu' : 'Fermé'}</Badge>
            <Badge tone={prioriteTone}>{archive.priorite ? archive.priorite.charAt(0).toUpperCase() + archive.priorite.slice(1) : ''}</Badge>
            <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => router.push('/directeur/archives')}>
              Retour aux archives
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne détails */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900">Détail du ticket archivé</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-2 text-sm">
              <DetailRow label="ID Archive" value={`#${archive.idTicketArchive}`} />
              <DetailRow label="Titre" value={archive.titre} />
              <DetailRow label="Statut" value={archive.statut} />
              <DetailRow label="Priorité" value={archive.priorite} />
              <DetailRow label="Clôturé le" value={formatDate(archive.dateTicketCloture)} />
              <DetailRow label="Catégorie" value={archive.categorie} />
              <DetailRow label="Sous-catégorie" value={archive.sousCategorie || '—'} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900">Description du problème</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{archive.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900">Pièce(s) jointe(s) du ticket</h3>
            </CardHeader>
            <CardBody>
              {archive.pieceJointe && archive.pieceJointe.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {(Array.isArray(archive.pieceJointe) ? archive.pieceJointe : String(archive.pieceJointe).split(',')).filter((f: any) => f).map((f: string, i: React.Key | null | undefined) => {
                    const ext = f.split('.').pop()?.toLowerCase();
                    const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext || '');
                    return (
                      <li key={i}>
                        {isImage ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block border border-slate-200 rounded-md overflow-hidden bg-white"
                            onClick={(e) => {
                              e.preventDefault();
                              setLightboxImg(`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`);
                              setLightboxOpen(true);
                            }}
                          >
                            <img src={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} alt={f.split('/').pop()} className="max-w-[180px] max-h-[120px] block" />
                          </a>
                        ) : (
                          <a href={`${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
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
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {archive.rapport}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Colonne conversation */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Historique de la conversation</h3>
              <span className="text-xs text-slate-500">{messages.length} messages</span>
            </CardHeader>
            <CardBody className="flex flex-col gap-1">
              <p className="text-xs text-slate-400 mb-3">
                Discussion du {formatDate(archive.dateCreation)} au {formatDate(archive.dateTicketCloture)}
              </p>

              {messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-10 bg-slate-50 rounded-md">
                  Aucun message trouvé pour cette conversation.
                </p>
              )}

              <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
                {messages.map((msg, idx) => {
                  // Cette page est exclusivement utilisée par un directeur
                  // plateforme : on vérifie aussi le type quand il est connu,
                  // sinon un idUtilisateur identique par coïncidence ferait
                  // apparaître le message d'un employé comme le sien.
                  const isMine = msg.idExpediteur === user.id && (msg.typeExpediteur == null || msg.typeExpediteur === 'technicien');

                  return (
                    <div
                      key={idx}
                      className={`w-full flex items-end gap-2 ${isMine ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}
                    >
                      {msg.avatar ? (
                        <img src={msg.avatar} alt="avatar" className="w-9 h-9 rounded-full shrink-0" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm text-white shrink-0"
                          style={{ background: getColorFromName(msg.nom || '') }}
                        >
                          {getInitials(msg.nom, msg.prenom)}
                        </div>
                      )}

                      <div className={`rounded-lg px-3.5 py-2.5 max-w-[70%] ${isMine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                        <div className={`text-xs font-semibold mb-0.5 ${isMine ? 'text-right text-brand-100' : 'text-slate-500'}`}>
                          {msg.prenom || msg.prenomExpediteur || ''} {msg.nom || msg.nomExpediteur || msg.nomUtilisateur || 'Utilisateur inconnu'}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">{msg.message}</div>
                        {(() => {
                          const liste = Array.isArray(msg.fichiersJoints) && msg.fichiersJoints.length > 0 ? msg.fichiersJoints : (msg.fichierJoint ? [msg.fichierJoint] : []);
                          if (liste.length === 0) return null;
                          return (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {liste.map((f: string, i: number) => {
                                const ext = f.split('.').pop()?.toLowerCase();
                                const _isImage = ['png','jpg','jpeg','gif','webp'].includes(ext || '');
                                const chemin = `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/${f}`;
                                return _isImage ? (
                                  <img
                                    key={i}
                                    src={chemin}
                                    alt="fichier joint"
                                    className="max-w-[180px] max-h-[120px] rounded-md cursor-pointer block"
                                    onClick={() => {
                                      setLightboxImg(chemin);
                                      setLightboxOpen(true);
                                    }}
                                  />
                                ) : (
                                  <div key={i}>
                                    <a href={chemin} target="_blank" rel="noopener noreferrer" className={`underline text-sm ${isMine ? 'text-brand-100' : 'text-brand-600'}`}>
                                      {f.split('/').pop()}
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        <div className={`text-xs mt-2 ${isMine ? 'text-brand-100/80' : 'text-slate-400'}`}>
                          {new Date(msg.dateEnvoi).toLocaleString('fr-FR', {
                            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
                            timeZone: 'Europe/Paris'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Lightbox pour les images */}
      {lightboxOpen && lightboxImg && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 cursor-zoom-out"
        >
          <img
            src={lightboxImg}
            alt="Agrandissement"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg bg-white p-2"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="fixed top-8 right-10 w-10 h-10 rounded-full bg-black/60 text-white text-xl flex items-center justify-center"
            aria-label="Fermer la lightbox"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value}</span>
    </div>
  );
}
