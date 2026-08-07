// Configuration de l'API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/support/backend/modele';

// Types TypeScript
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  role?: string;
  type?: string;
  user?: User;
  error?: string;
}

export interface Ticket {
  idTicket: number;
  idUtilisateur: number;
  idTechnicien?: number;
  titre: string;
  description: string;
  serviceConcerne?: string;
  categorie?: string;
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  statut: 'en_attente' | 'en_cours' | 'resolu' | 'ferme';
  dateCreation: string;
  dateModification: string;
  dateResolution?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  nomTechnicien?: string;
  prenomTechnicien?: string;
}

export interface Technicien {
  idTechnicien: number;
  loginTechnicien: string;
  nomTechnicien: string;
  prenomTechnicien: string;
  emailTechnicien: string;
  role: string;
}

export interface Utilisateur {
  idUtilisateur: number;
  loginUtilisateur: string;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  emailUtilisateur: string;
  roleEntreprise: string;
  nomEntreprise?: string;
}

export interface Entreprise {
  idEntreprise: number;
  nomEntreprise: string;
  adresseEntreprise?: string;
  telephoneEntreprise?: string;
  emailEntreprise?: string;
}

// Fonction utilitaire pour les requêtes
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }
    
    return data;
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
}

// Services d'authentification
export const authService = {
  // Connexion
  login: async (login: string, password: string, type: 'technicien' | 'utilisateur', honeypot: string = ''): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('login', login);
    formData.append('password', password);
    formData.append('type', type);
    // Honeypot anti-bot : toujours vide pour un humain (champ masqué en CSS
    // côté formulaire), voir backend/modele/connexion.php.
    formData.append('siteWeb', honeypot);

    const response = await fetch(`${API_BASE_URL}/connexion.php`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    return response.json();
  },

  // Déconnexion
  logout: async (): Promise<{ success: boolean; message: string }> => {
    return apiRequest('deconnexion.php', { method: 'POST' });
  },

  // Vérifier la session
  checkSession: async (): Promise<{ success: boolean; authenticated: boolean; user_id?: number; user_type?: string; role?: string }> => {
    return apiRequest('verifierSession.php');
  },
};

// Services des tickets
export const ticketService = {
  // Récupérer tous les tickets
  getAllTickets: async (): Promise<{ success: boolean; tickets: Ticket[] }> => {
    return apiRequest('listeTicket.php');
  },

  // Créer un nouveau ticket
  createTicket: async (ticketData: {
    titre: string;
    description: string;
    serviceConcerne?: string;
    categorie?: string;
    priorite?: string;
  }): Promise<{ success: boolean; message: string; ticket_id?: number }> => {
    const formData = new FormData();
    Object.entries(ticketData).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch(`${API_BASE_URL}/ajouterTicket.php`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    return response.json();
  },

  // Supprimer un ticket (non assigné, ou assigné au technicien connecté)
  supprimerTicket: async (idTicket: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    return apiRequest('supprimerTicket.php', {
      method: 'POST',
      body: JSON.stringify({ idTicket }),
    });
  },
};

// Services des techniciens
export const technicienService = {
  // Récupérer tous les techniciens
  getAllTechniciens: async (): Promise<{ success: boolean; techniciens: Technicien[] }> => {
    return apiRequest('listeTechnicien.php');
  },

  // Créer un nouveau technicien
  createTechnicien: async (technicienData: {
    login: string;
    password: string;
    nom: string;
    prenom: string;
    email: string;
    role?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    const formData = new FormData();
    Object.entries(technicienData).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch(`${API_BASE_URL}/inscriptionTechniciens.php`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    return response.json();
  },
};

// Services des utilisateurs
export const utilisateurService = {
  // Récupérer tous les utilisateurs
  getAllUtilisateurs: async (): Promise<{ success: boolean; utilisateurs: Utilisateur[] }> => {
    return apiRequest('listeUtilisateur.php');
  },

  // Créer un nouvel utilisateur
  createUtilisateur: async (utilisateurData: {
    login: string;
    password: string;
    nom: string;
    prenom: string;
    email: string;
    role?: string;
    selectEntreprise: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    const formData = new FormData();
    Object.entries(utilisateurData).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch(`${API_BASE_URL}/inscriptionUtilisateur.php`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    return response.json();
  },
};

// Services des entreprises
export const entrepriseService = {
  // Récupérer toutes les entreprises
  getAllEntreprises: async (): Promise<{ success: boolean; entreprises: Entreprise[] }> => {
    return apiRequest('listeEntreprise.php');
  },
}; 