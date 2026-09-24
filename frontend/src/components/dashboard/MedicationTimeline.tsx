import React from 'react';
import { Utensils, Pill, Clock, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { MedicationEvent, DoseStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface TimelineItem {
  id: string;
  type: 'meal' | 'medication';
  time: string;
  title: string;
  subtitle?: string;
  dosage?: string;
  mealRelation?: string;
  status?: DoseStatus;
  dispensedAt?: string;
  takenAt?: string;
  patientName?: string;
  onMarkTaken?: () => void;
}

interface MedicationTimelineProps {
  events: MedicationEvent[];
  onTakeDose?: (eventId: string) => void;
  showPatientName?: boolean;
}

export const MedicationTimeline: React.FC<MedicationTimelineProps> = ({
  events,
  onTakeDose,
  showPatientName = false,
}) => {
  // Sort events chronologically by scheduled_time
  const sorted = [...events].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No medication doses scheduled for this period.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {sorted.map((event) => {
        const timeFormatted = new Date(event.scheduled_time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const status = event.status || 'pending';

        const dotColors: Record<DoseStatus, string> = {
          taken: 'bg-emerald-500 ring-emerald-100',
          pending: 'bg-amber-500 ring-amber-100',
          dispensing: 'bg-indigo-500 ring-indigo-100 animate-pulse',
          dispensed: 'bg-cyan-500 ring-cyan-100',
          missed: 'bg-rose-500 ring-rose-100',
          delayed: 'bg-orange-500 ring-orange-100',
          skipped: 'bg-slate-400 ring-slate-100',
        };

        return (
          <div key={event.id} className="relative group">
            {/* Timeline Indicator Dot */}
            <div
              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white ring-4 ${dotColors[status]} flex items-center justify-center text-white`}
            >
              {status === 'taken' && <CheckCircle2 className="w-3 h-3" />}
              {status === 'missed' && <AlertCircle className="w-3 h-3" />}
              {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
              {status === 'delayed' && <AlertTriangle className="w-2.5 h-2.5" />}
            </div>

            {/* Event Card */}
            <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors p-3.5 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{timeFormatted}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200/60 text-slate-700 font-medium">
                    {event.meal_relation || event.meal_context || 'Standard'}
                  </span>
                  {showPatientName && event.patient_name && (
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {event.patient_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-800">
                  <Pill className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span className="font-medium text-sm">
                    {event.medication_name || 'Prescribed Medicine'}
                  </span>
                  {event.dosage && (
                    <span className="text-xs text-slate-500">({event.dosage})</span>
                  )}
                </div>

                {event.taken_at && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed taken at {new Date(event.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {event.notes && (
                  <p className="text-xs text-slate-500 italic">{event.notes}</p>
                )}
              </div>

              {/* Status and Action */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge status={status} />
                {status !== 'taken' && onTakeDose && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs py-1 px-2.5"
                    onClick={() => onTakeDose(event.id)}
                  >
                    Mark Taken
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
