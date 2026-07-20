'use client';

import React, { useState } from 'react';

const Parametre: React.FC = () => {
  const [messages, setMessages] = useState([
    { auteur: 'Support', texte: 'Bienvenue sur le channel de discussion du ticket !' },
  ]);
  const [nouveauMessage, setNouveauMessage] = useState('');

  const handleEnvoyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (nouveauMessage.trim() === '') return;
    setMessages([...messages, { auteur: 'Moi', texte: nouveauMessage }]);
    setNouveauMessage('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Channel de discussion</h2>
      <div style={{ height: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 12, marginBottom: 16, background: '#fafbfc' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: 12, textAlign: msg.auteur === 'Moi' ? 'right' : 'left' }}>
            <span style={{ fontWeight: 'bold', color: msg.auteur === 'Moi' ? '#1976d2' : '#333' }}>{msg.auteur} :</span>
            <span style={{ marginLeft: 8 }}>{msg.texte}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleEnvoyer} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Écrire un message..."
          value={nouveauMessage}
          onChange={e => setNouveauMessage(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
          Envoyer
        </button>
      </form>
    </div>
  );
};

export default Parametre;            