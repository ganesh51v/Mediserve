import mongoose, { Schema, Document, Types } from 'mongoose';

export type DoseStatus = 'pending' | 'dispensing' | 'dispensed' | 'taken' | 'missed' | 'delayed' | 'skipped';

export interface IMedicationEvent extends Document {
  id: string;
  patient_id: Types.ObjectId;
  medication_id: Types.ObjectId;
  schedule_id?: Types.ObjectId;
  device_id?: string;
  scheduled_time: string;
  dispensed_at?: Date;
  taken_at?: Date;
  status: DoseStatus;
  meal_context?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const MedicationEventSchema = new Schema<IMedicationEvent>(
  {
    patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    medication_id: { type: Schema.Types.ObjectId, ref: 'Medication', required: true, index: true },
    schedule_id: { type: Schema.Types.ObjectId, ref: 'MedicationSchedule' },
    device_id: { type: String },
    scheduled_time: { type: String, required: true },
    dispensed_at: { type: Date },
    taken_at: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'dispensing', 'dispensed', 'taken', 'missed', 'delayed', 'skipped'],
      default: 'pending',
      index: true,
    },
    meal_context: { type: String },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const MedicationEvent = mongoose.model<IMedicationEvent>('MedicationEvent', MedicationEventSchema);
