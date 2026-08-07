'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Volume2, Music, Play, FolderOpen, RotateCcw,
  Info, Scissors, Headphones, X, Home,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';

export default function ParametresAffichage() {
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [originalSound, setOriginalSound] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    document.title = 'Paramètres Affichage Mural - LyovaTech Support';
    // Charger le son actuel - seulement côté client
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('notificationSound');
      setCurrentSound(savedSound);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('audio/')) {
        alert('Veuillez sélectionner un fichier audio valide.');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Le fichier est trop volumineux. Taille maximale : 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const audioData = e.target?.result as string;
        setOriginalSound(audioData);
        setCurrentSound(audioData);
        setIsEditing(true);

        // Créer un élément audio temporaire pour obtenir la durée
        const tempAudio = new Audio(audioData);
        tempAudio.onloadedmetadata = () => {
          setAudioDuration(tempAudio.duration);
          setStartTime(0);
          setEndTime(tempAudio.duration);
        };

        localStorage.setItem('notificationSoundName', file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const cropAudio = async () => {
    if (!originalSound || !originalAudioRef.current) return;

    try {
      // Créer un contexte audio pour le rognage
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Convertir le base64 en ArrayBuffer
      const response = await fetch(originalSound);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Calculer les échantillons de début et fin
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const newLength = endSample - startSample;

      // Créer un nouveau buffer avec la portion rognée
      const croppedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        sampleRate
      );

      // Copier les données audio rognées
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldChannelData = audioBuffer.getChannelData(channel);
        const newChannelData = croppedBuffer.getChannelData(channel);
        for (let i = 0; i < newLength; i++) {
          newChannelData[i] = oldChannelData[startSample + i];
        }
      }

      // Encoder en WAV et convertir en base64
      const wavBlob = audioBufferToWav(croppedBuffer);
      const reader = new FileReader();
      reader.onload = () => {
        const croppedAudioData = reader.result as string;
        setCurrentSound(croppedAudioData);
        localStorage.setItem('notificationSound', croppedAudioData);
        alert('Son rogné et sauvegardé avec succès !');
        setIsEditing(false);
      };
      reader.readAsDataURL(wavBlob);

    } catch (error) {
      console.error('Erreur lors du rognage:', error);
      alert('Erreur lors du rognage du fichier audio.');
    }
  };

  // Fonction pour convertir AudioBuffer en WAV
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // En-tête WAV
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Données audio
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const playOriginalSound = () => {
    if (originalSound && originalAudioRef.current) {
      originalAudioRef.current.src = originalSound;
      originalAudioRef.current.play();
    }
  };

  const playPreview = () => {
    if (originalSound && originalAudioRef.current) {
      originalAudioRef.current.src = originalSound;
      originalAudioRef.current.currentTime = startTime;
      originalAudioRef.current.play();

      // Arrêter à endTime
      const checkTime = () => {
        if (originalAudioRef.current && originalAudioRef.current.currentTime >= endTime) {
          originalAudioRef.current.pause();
        } else {
          requestAnimationFrame(checkTime);
        }
      };
      requestAnimationFrame(checkTime);
    }
  };

  const playTestSound = () => {
    if (currentSound && audioRef.current) {
      setIsPlaying(true);
      audioRef.current.src = currentSound;
      audioRef.current.play()
        .then(() => {
          audioRef.current!.addEventListener('ended', () => {
            setIsPlaying(false);
          }, { once: true });
        })
        .catch(error => {
          console.error('Erreur lors de la lecture:', error);
          setIsPlaying(false);
        });
    } else {
      // Son par défaut généré avec Web Audio API
      setIsPlaying(true);
      playDefaultNotificationSound();
      setTimeout(() => setIsPlaying(false), 300);
    }
  };

  // Génération du son par défaut avec Web Audio API
  const playDefaultNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configuration du son : deux tonalités rapides
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Erreur lors de la génération du son:', error);
    }
  };

  const resetToDefault = () => {
    localStorage.removeItem('notificationSound');
    localStorage.removeItem('notificationSoundName');
    setCurrentSound(null);
    setOriginalSound(null);
    setIsEditing(false);
    setAudioDuration(0);
    setStartTime(0);
    setEndTime(0);
    alert('Son de notification remis par défaut.');
  };

  const getSoundName = () => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('notificationSoundName');
      return savedName || 'Son par défaut';
    }
    return 'Son par défaut';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <audio ref={audioRef} />
      <audio ref={originalAudioRef} />

      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => { window.location.href = '/affichage'; }}>
            Retour
          </Button>
        </div>

        <PageHeader
          title="Paramètres d'affichage"
          description="Configuration du son de notification pour l'écran mural."
        />

        <div className="flex flex-col gap-4">
          {/* Section Son de Notification */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                <Volume2 size={14} /> Son de notification
              </h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-slate-900">Son actuel</p>
                  <div className="mt-1.5">
                    <Badge tone="success">
                      <Music size={12} className="mr-1" /> {getSoundName()}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="success"
                  size="sm"
                  icon={<Play size={14} />}
                  disabled={isPlaying}
                  onClick={playTestSound}
                >
                  {isPlaying ? 'Lecture...' : 'Tester'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="secondary" icon={<FolderOpen size={14} />} onClick={() => fileInputRef.current?.click()}>
                  Choisir un fichier
                </Button>
                <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={resetToDefault}>
                  Son par défaut
                </Button>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-md p-3">
                <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <ul className="text-xs text-slate-500 leading-relaxed list-disc pl-4">
                  <li>Formats supportés : MP3, WAV, OGG, M4A</li>
                  <li>Taille maximale : 5MB</li>
                  <li>Durée recommandée : 1-3 secondes</li>
                  <li>Le son sera joué à chaque nouveau ticket</li>
                </ul>
              </div>
            </CardBody>
          </Card>

          {/* Section Éditeur Audio */}
          {isEditing && originalSound && (
            <Card>
              <CardHeader>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                  <Scissors size={14} /> Éditeur audio
                </h3>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-slate-600">Son original — durée : {audioDuration.toFixed(1)}s</p>
                  <Button variant="secondary" size="sm" icon={<Play size={14} />} onClick={playOriginalSound}>
                    Écouter l'original
                  </Button>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">
                    Début : <span className="font-medium text-slate-700">{startTime.toFixed(1)}s</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={audioDuration}
                    step="0.1"
                    value={startTime}
                    onChange={(e) => {
                      const newStartTime = parseFloat(e.target.value);
                      setStartTime(newStartTime);
                      if (newStartTime >= endTime) {
                        setEndTime(Math.min(newStartTime + 1, audioDuration));
                      }
                    }}
                    className="w-full accent-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">
                    Fin : <span className="font-medium text-slate-700">{endTime.toFixed(1)}s</span>
                  </label>
                  <input
                    type="range"
                    min={startTime}
                    max={audioDuration}
                    step="0.1"
                    value={endTime}
                    onChange={(e) => {
                      const newEndTime = parseFloat(e.target.value);
                      setEndTime(newEndTime);
                      if (newEndTime <= startTime) {
                        setStartTime(Math.max(newEndTime - 1, 0));
                      }
                    }}
                    className="w-full accent-brand-600"
                  />
                </div>

                <div className="bg-emerald-50 rounded-md p-3 text-center">
                  <p className="text-sm text-slate-700">
                    Durée sélectionnée : <strong>{(endTime - startTime).toFixed(1)}s</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">De {startTime.toFixed(1)}s à {endTime.toFixed(1)}s</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={<Headphones size={14} />} onClick={playPreview}>
                    Écouter l'aperçu
                  </Button>
                  <Button
                    variant="success"
                    icon={<Scissors size={14} />}
                    disabled={endTime <= startTime}
                    onClick={cropAudio}
                  >
                    Rogner et sauvegarder
                  </Button>
                </div>

                <div>
                  <Button variant="danger" size="sm" icon={<X size={14} />} onClick={() => setIsEditing(false)}>
                    Annuler l'édition
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Retour à l'affichage */}
          <Card>
            <CardBody className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-slate-900">Retour à l'affichage</p>
                <p className="text-xs text-slate-500 mt-0.5">Revenir à l'écran mural des tickets</p>
              </div>
              <Button variant="primary" icon={<Home size={14} />} onClick={() => window.location.href = '/affichage'}>
                Retour à l'affichage mural
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
