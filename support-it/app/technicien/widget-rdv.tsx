'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, Siren, Calendar, Bell } from 'lucide-react';
import { BTN_SUCCESS, BTN_BASE_SM } from '../../styles/buttonStyles';

const priorities = [
  { key: 'normal', icon: ClipboardList, label: 'Normal', className: 'confirmed' },
  { key: 'important', icon: AlertTriangle, label: 'Important', className: 'pending' },
  { key: 'urgent', icon: Siren, label: 'Urgent', className: 'urgent' },
];

const quickTimes = ['09:00', '10:00', '14:00', '15:00', '16:00'];

interface WidgetRdvProps {
  onClose?: () => void;
  idTicket?: string | number;
  idUtilisateur?: string | number;
  idTechnicien?: string | number;
}

export default function WidgetRdv({ onClose, idTicket, idUtilisateur, idTechnicien }: WidgetRdvProps) {
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [priority, setPriority] = useState('important');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [rdv, setRdv] = useState<any>(null);
  const [error, setError] = useState('');
  const [titre, setTitre] = useState('');

  // Obtenir la date d'aujourd'hui au format YYYY-MM-DD pour la validation
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Vérifier si la date sélectionnée est valide
  const isDateValid = () => {
    if (!date) return true; // Pas de date sélectionnée = valide
    return date >= getTodayDate();
  };

  // Charger le RDV existant au chargement du widget
  useEffect(() => {
    if (!idTicket) return;
    const fetchRDV = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRdvByTicket.php?idTicket=${idTicket}`, {
          credentials: 'include',
        });
        const data = await res.json();
        setRdv(data?.success ? data.rdv : null);
      } catch (e) {
        setRdv(null);
      }
    };
    fetchRDV();
  }, [idTicket]);

  const handleQuickTime = (t: string) => setHeure(t);
  const handlePriority = (p: string) => setPriority(p);

  // Créer un RDV
  const handleProposer = async () => {
    setSending(true);
    setMsg('');
    setError('');
    
    // Vérification des champs obligatoires
    if (!titre || !date || !heure) {
      setError('Merci de remplir tous les champs obligatoires.');
      setSending(false);
      return;
    }
    
    // Vérification que la date n'est pas antérieure à aujourd'hui
    const today = getTodayDate();
    if (date < today) {
      setError('Impossible de proposer un rendez-vous à une date antérieure à aujourd\'hui.');
      setSending(false);
      return;
    }
    const formData = new FormData();
    formData.append('date', date);
    formData.append('heure', heure);
    formData.append('Ticket', String(idTicket));
    formData.append('idUtilisateur', String(idUtilisateur));
    formData.append('idTechnicien', String(idTechnicien));
    formData.append('titre', titre);
    formData.append('priorite', priority);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Calendrier.php`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setMsg('RDV proposé !');
        if (typeof onClose === 'function') onClose(); // Ferme la modale après proposition
      } else {
        setError(data?.error || 'Erreur lors de la création du RDV');
      }
    } catch (e) {
      setError('Erreur réseau');
    }
    setSending(false);
  };

  // Modifier un RDV
  const handleModifier = async () => {
    setSending(true);
    setMsg('');
    setError('');
    const formData = new FormData();
    formData.append('idTicket', String(idTicket));
    formData.append('date', date);
    formData.append('heure', heure);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Calendrier.php`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setMsg('RDV modifié !');
      } else {
        setError('Erreur lors de la modification du RDV');
      }
    } catch (e) {
      setError('Erreur réseau');
    }
    setSending(false);
  };

  // Supprimer un RDV
  const handleSupprimer = async () => {
    setSending(true);
    setMsg('');
    setError('');
    const formData = new FormData();
    formData.append('idTicket', String(idTicket));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Calendrier.php`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setMsg('RDV supprimé !');
        setRdv(null);
      } else {
        setError('Erreur lors de la suppression du RDV');
      }
    } catch (e) {
      setError('Erreur réseau');
    }
    setSending(false);
  };

  return (
    <div style={{maxWidth:500,margin:'0 auto',background:'rgba(255,255,255,0.1)',borderRadius:20,padding:30,backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.2)'}}>
      <div className="rdv-widget" style={{background:'white',borderRadius:20,padding:0,boxShadow:'0 15px 35px rgba(0,0,0,0.1)',overflow:'hidden',border:'1px solid rgba(102,126,234,0.1)',position:'relative'}}>
        <div className="rdv-header" style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',color:'white',padding:25,textAlign:'center',position:'relative',overflow:'hidden'}}>
          <button onClick={onClose} style={{position:'absolute',top:12,right:12,background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:36,height:36,fontSize:22,color:'#fff',cursor:'pointer',zIndex:2,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}} title="Fermer">
            ×
          </button>
          <h3 style={{fontSize:'1.4em',marginBottom:8,position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Calendar size={22} /> Planifier un rendez-vous</h3>
          <p style={{opacity:0.9,fontSize:'0.9em',position:'relative',zIndex:1}}>Proposer un créneau pour résoudre le ticket</p>
        </div>
        <div className="rdv-content" style={{padding:30}}>
          <div className="form-row" style={{display:'flex',gap:15}}>
            <div className="form-group" style={{flex:1,marginBottom:25}}>
              <label className="form-label" style={{display:'block',marginBottom:8,fontWeight:600,color:'#4a5568',fontSize:'0.9em'}}>Date</label>
              <div className="date-input" style={{position:'relative'}}>
                <input 
                  type="date" 
                  className="form-input" 
                  value={date} 
                  onChange={e=>setDate(e.target.value)} 
                  min={getTodayDate()}
                  style={{
                    width:'100%',
                    padding:'12px 16px',
                    border: isDateValid() ? '2px solid #e2e8f0' : '2px solid #ef4444',
                    borderRadius:12,
                    fontSize:'1em',
                    background: isDateValid() ? '#f8f9ff' : '#fef2f2'
                  }} 
                />
                <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:'1.2em'}}></span>
              </div>
              {!isDateValid() && (
                <div style={{color:'#ef4444',fontSize:'0.8em',marginTop:4,fontWeight:500,display:'flex',alignItems:'center',gap:4}}>
                  <AlertTriangle size={12} /> Impossible de sélectionner une date antérieure à aujourd'hui
                </div>
              )}
            </div>
            <div className="form-group" style={{flex:1,marginBottom:25}}>
              <label className="form-label" style={{display:'block',marginBottom:8,fontWeight:600,color:'#4a5568',fontSize:'0.9em'}}>Heure</label>
              <div className="time-input" style={{position:'relative'}}>
                <input type="time" className="form-input" value={heure} onChange={e=>setHeure(e.target.value)} style={{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:'1em',background:'#f8f9ff'}} />
                <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:'1.2em'}}></span>
              </div>
            </div>
          </div>
          <div className="quick-actions" style={{display:'flex',gap:10,marginTop:15,flexWrap:'wrap'}}>
            {quickTimes.map(t => (
              <button key={t} className="quick-btn" style={{...BTN_BASE_SM,background:'#f0f4ff',color:'#667eea',border:'1px solid #e0e6ff',borderRadius:20,marginBottom:4}}
                onClick={()=>handleQuickTime(t)}>{t.replace(':','h')}</button>
            ))}
          </div>
          <div className="form-group" style={{marginBottom:25,marginTop:20}}>
            <label className="form-label" style={{display:'block',marginBottom:8,fontWeight:600,color:'#4a5568',fontSize:'0.9em'}}>Priorité du rendez-vous</label>
            <div className="status-pills" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {priorities.map(p => (
                <div key={p.key} className={`status-pill ${p.className}${priority===p.key?' selected':''}`}
                  style={{padding:'6px 12px',borderRadius:20,fontSize:'0.8em',fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4,background:p.className==='confirmed'?'#c6f6d5':p.className==='pending'?'#fef5e7':'#fed7d7',color:p.className==='confirmed'?'#2f855a':p.className==='pending'?'#d69e2e':'#c53030',border:priority===p.key?'2px solid #667eea':'2px solid transparent'}}
                  onClick={()=>handlePriority(p.key)}><p.icon size={12} /> {p.label}</div>
              ))}
            </div>
          </div>
          {/* Champ titre du RDV */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="titre" style={{ fontWeight: 600 }}>Titre du rendez-vous :</label>
            <input
              id="titre"
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Titre du RDV"
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }}
              required
            />
          </div>
          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
            <button
              style={{
                ...BTN_SUCCESS,
                background: isDateValid() && titre && heure ? '#4caf50' : '#e2e8f0',
                color: isDateValid() && titre && heure ? 'white' : '#64748b',
                cursor: isDateValid() && titre && heure ? 'pointer' : 'not-allowed',
                flex: 1,
              }}
              onClick={handleProposer}
              disabled={sending || !isDateValid() || !titre || !heure}
            >
              {sending ? 'Envoi...' : 'Proposer RDV'}
            </button>
          </div>
          {msg && <div style={{marginTop:18,textAlign:'center',color:'#22c55e',fontWeight:600,fontSize:'1.1em'}}>{msg}</div>}
          {error && <div style={{marginTop:18,textAlign:'center',color:'#ef4444',fontWeight:600,fontSize:'1.1em'}}>{error}</div>}
          {rdv && Object.keys(rdv).length > 0 && (
            <div style={{marginTop:18,padding:14,background:'#fff',borderRadius:8,boxShadow:'0 1px 4px #0001'}}>
              <div style={{fontWeight:600,color:'#4c6ef5',marginBottom:4}}>RDV existant :</div>
              <div>Date : <b>{rdv.date}</b></div>
              <div>Heure : <b>{rdv.heure}</b></div>
              <div>Technicien : <b>{rdv.idTechnicien}</b></div>
              <div>Utilisateur : <b>{rdv.idUtilisateur}</b></div>
            </div>
          )}
        </div>
        <div className="widget-footer" style={{background:'#f8f9ff',padding:'20px 30px',borderTop:'1px solid #e0e6ff',textAlign:'center',fontSize:'0.85em',color:'#718096',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Bell size={14} /> Le client recevra une notification pour confirmer le rendez-vous</div>
      </div>
    </div>
  );
} 