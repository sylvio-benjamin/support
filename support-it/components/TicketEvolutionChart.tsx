import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
          color: 'rgba(255, 255, 255, 0.8)',
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
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
        },
        border: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
        title: {
          display: true,
          text: 'Période',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 600,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
          callback: function(valeur: any) {
            return Number(valeur).toLocaleString() + ' tickets';
          },
        },
        border: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
        beginAtZero: true,
        title: {
          display: true,
          text: 'Nombre de tickets',
          color: 'rgba(255, 255, 255, 0.7)',
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