import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js v4 exige d'enregistrer le Controller ('line'), pas seulement les
// éléments/échelles — sans lui, le graphique ne s'affiche pas du tout (canvas
// vide, erreur "'line' is not a registered controller" en console).
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProprietesGraphiqueEvolutionTickets {
  donnees: {
    etiquettes: string[];
    jeuDeDonnees: {
      libelle: string;
      donnees: number[];
      couleurBordure: string;
      couleurFond: string;
      remplir?: boolean;
    }[];
  };
  hauteur?: number;
}

const GraphiqueEvolutionTickets: React.FC<ProprietesGraphiqueEvolutionTickets> = ({ donnees, hauteur = 300 }) => {
  const optionsGraphique = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#475569',
          font: {
            size: 12,
            weight: 500,
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        intersect: false,
        mode: 'index' as const,
        callbacks: {
          title: function(contexte: any) {
            return contexte[0].label;
          },
          label: function(contexte: any) {
            return `${contexte.dataset.label}: ${contexte.parsed.y} tickets`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: '#e2e8f0',
          borderColor: '#cbd5e1',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
          },
        },
        border: {
          color: '#cbd5e1',
        },
        title: {
          display: true,
          text: 'Période',
          color: '#475569',
          font: {
            size: 12,
            weight: 600,
          },
        },
      },
      y: {
        grid: {
          color: '#e2e8f0',
          borderColor: '#cbd5e1',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
          },
          callback: function(valeur: any) {
            return Number(valeur).toLocaleString() + ' tickets';
          },
        },
        border: {
          color: '#cbd5e1',
        },
        beginAtZero: true,
        title: {
          display: true,
          text: 'Nombre de tickets',
          color: '#475569',
          font: {
            size: 12,
            weight: 600,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
      point: {
        radius: 5,
        hoverRadius: 8,
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutQuart' as const,
    },
  };

  // Adapter les données au format Chart.js
  const donneesAdaptees = {
    labels: donnees.etiquettes,
    datasets: donnees.jeuDeDonnees.map(jeu => ({
      label: jeu.libelle,
      data: jeu.donnees,
      borderColor: jeu.couleurBordure,
      backgroundColor: jeu.couleurFond,
      fill: jeu.remplir ?? true,
    }))
  };

  return (
    <div style={{ height: hauteur, width: '100%' }}>
      <Line data={donneesAdaptees} options={optionsGraphique} />
    </div>
  );
};

export default GraphiqueEvolutionTickets;