'use client';

import React from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, visible, onClose }) => {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 30,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#6B46C1',
      color: 'white',
      padding: '16px 32px',
      borderRadius: 8,
      boxShadow: '0 2px 12px #0003',
      zIndex: 9999,
      fontSize: 16,
      fontWeight: 500,
      minWidth: 220,
      textAlign: 'center',
      animation: 'fadeIn 0.3s',
      cursor: 'pointer',
    }}
    onClick={onClose}
    >
      {message}
    </div>
  );
};

export default Toast; 