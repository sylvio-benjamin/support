'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle2, Info, X, Loader2 } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import Button from './ui/Button';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const dayHeaders = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

type RdvApi = {
  id: number;
  heure: string;
  titre: string;
  client: string;
  nomTicket?: string;
  statut: 'normal' | 'urgent' | 'termine';
  ticket: string;
  description?: string;
  nomTechnicien?: string;
  telephoneTechnicien?: string;
};

type AppointmentsByDate = {
  [date: string]: RdvApi[];
};

const statusText: Record<RdvApi['statut'], string> = {
  normal: 'En cours',
  urgent: 'Urgent',
  termine: 'Terminé',
};

const STATUS_PILL_CLASSES: Record<RdvApi['statut'], string> = {
  normal: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  urgent: 'bg-red-50 text-red-700 hover:bg-red-100',
  termine: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
};

const STATUS_DOT_CLASSES: Record<RdvApi['statut'], string> = {
  normal: 'bg-blue-500',
  urgent: 'bg-red-500',
  termine: 'bg-emerald-500',
};

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const EmployeeCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentsByDate>({});
  const [modal, setModal] = useState<{ open: boolean; appointment?: RdvApi }>({ open: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const userData = localStorage.getItem('user');
    let idUtilisateur = 0;
    if (userData) {
      try {
        const user = JSON.parse(userData);
        idUtilisateur = user.id || user.idUtilisateur;
      } catch {}
    }
    if (!idUtilisateur) {
      setAppointments({});
      setLoading(false);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/obtenirRdvEmploye.php?idUtilisateur=${idUtilisateur}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => { setAppointments(data?.erreur ? {} : data); setLoading(false); })
      .catch(() => { setAppointments({}); setLoading(false); });
  }, []);

  const getStats = (appointments: AppointmentsByDate) => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    let totalAppointments = 0;
    let todayAppointments = 0;
    let urgentCount = 0;
    let completedCount = 0;

    Object.entries(appointments).forEach(([dateStr, dayAppts]) => {
      const dateObj = new Date(dateStr);
      if (dateObj.getMonth() === month && dateObj.getFullYear() === year) {
        totalAppointments += dayAppts.length;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr === todayStr) {
        todayAppointments = dayAppts.length;
      }
      dayAppts.forEach((appt: RdvApi) => {
        if (appt.statut === 'urgent') urgentCount++;
        if (appt.statut === 'termine') completedCount++;
      });
    });

    return { totalAppointments, todayAppointments, urgentCount, completedCount };
  };

  const stats = getStats(appointments);

  const statCards = [
    { label: 'RDV ce mois', value: stats.totalAppointments, icon: <Calendar size={18} /> },
    { label: "RDV aujourd'hui", value: stats.todayAppointments, icon: <Clock size={18} /> },
    { label: 'RDV urgents', value: stats.urgentCount, icon: <AlertTriangle size={18} /> },
    { label: 'RDV terminés', value: stats.completedCount, icon: <CheckCircle2 size={18} /> },
  ];

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() || 7) + 1);
    const today = new Date();
    const days: any[] = [];
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const dateStr = formatDateLocal(cellDate);
      const dayAppointments = appointments[dateStr] || [];
      days.push({
        date: cellDate,
        dateStr,
        appointments: dayAppointments,
        isOtherMonth: cellDate.getMonth() !== currentDate.getMonth(),
        isToday: cellDate.toDateString() === today.toDateString(),
      });
    }
    return days;
  };

  const openModal = (appointment: RdvApi) => setModal({ open: true, appointment });
  const closeModal = () => setModal({ open: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-5">
            <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)} title="Mois précédent">
              <ChevronLeft size={16} />
            </Button>
            <div className="text-base font-semibold text-slate-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <Button variant="secondary" size="sm" onClick={() => changeMonth(1)} title="Mois suivant">
              <ChevronRight size={16} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-300">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px] border border-slate-200 rounded-md overflow-hidden">
                <div className="grid grid-cols-7">
                  {dayHeaders.map((day) => (
                    <div
                      key={day}
                      className="bg-slate-50 border-b border-slate-200 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {generateCalendarDays().map((day, idx) => (
                    <div
                      key={idx}
                      className={`min-h-[100px] p-1.5 border-b border-r border-slate-200 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 ${
                        day.isOtherMonth ? 'bg-slate-50/60' : 'bg-white'
                      }`}
                    >
                      <span
                        className={`inline-flex w-5 h-5 items-center justify-center text-xs font-medium rounded-full ${
                          day.isToday
                            ? 'bg-brand-600 text-white'
                            : day.isOtherMonth
                            ? 'text-slate-300'
                            : 'text-slate-600'
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      <div className="flex flex-col gap-1 max-h-[76px] overflow-y-auto">
                        {day.appointments.map((appointment: RdvApi) => (
                          <button
                            key={appointment.id}
                            onClick={() => openModal(appointment)}
                            className={`text-left text-[11px] leading-tight font-medium px-1.5 py-1 rounded truncate transition-colors ${STATUS_PILL_CLASSES[appointment.statut]}`}
                            title={`${appointment.heure} - ${appointment.titre}`}
                          >
                            {appointment.heure} · {appointment.titre}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
            <Info size={14} className="text-slate-400" /> Légende
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_CLASSES.normal}`} /> RDV en cours
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_CLASSES.termine}`} /> RDV terminé
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_CLASSES.urgent}`} /> RDV urgent
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">•</span> Aujourd&apos;hui
            </span>
          </div>
        </CardBody>
      </Card>

      {modal.open && modal.appointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Info size={16} className="text-brand-600" /> Détails du rendez-vous
            </h3>
            <dl className="text-sm text-slate-600 flex flex-col gap-2">
              <div><span className="font-medium text-slate-700">Titre :</span> {modal.appointment.titre}</div>
              <div>
                <span className="font-medium text-slate-700">Technicien :</span> {modal.appointment.nomTechnicien}
                {modal.appointment.telephoneTechnicien && (
                  <span className="ml-2 text-slate-500">{modal.appointment.telephoneTechnicien}</span>
                )}
              </div>
              <div><span className="font-medium text-slate-700">Heure :</span> {modal.appointment.heure}</div>
              <div>
                <span className="font-medium text-slate-700">Ticket :</span> {modal.appointment.ticket}
                {modal.appointment.nomTicket && <span className="text-slate-500"> — {modal.appointment.nomTicket}</span>}
              </div>
              <div>
                <span className="font-medium text-slate-700">Statut :</span>{' '}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL_CLASSES[modal.appointment.statut]}`}>
                  {statusText[modal.appointment.statut]}
                </span>
              </div>
              {modal.appointment.description && (
                <div><span className="font-medium text-slate-700">Description :</span> {modal.appointment.description}</div>
              )}
            </dl>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={closeModal}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendar;
