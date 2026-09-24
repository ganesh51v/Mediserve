import mongoose, { Schema, Document, Types } from 'mongoose';

export type AlertType =
  | 'medication_missed'
  | 'device_offline'
  | 'refill_required'
  | 'dispenser_error'
  | 'emergency'
  | 'meal_delayed';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'unread' | 'read' | 'acknowledged' | 'resolved';

export interface IAlert extends Document {
  id: string;
  patient_id?: Types.ObjectId;
  device_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  acknowledged_by?: Types.ObjectId;
  acknowledged_at?: Date;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    device_id: { type: String, index: true },
    type: {
      type: String,
      required: true,
      enum: ['medication_missed', 'device_offline', 'refill_required', 'dispenser_error', 'emergency', 'meal_delayed'],
    },
    severity: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, required: true, enum: ['unread', 'read', 'acknowledged', 'resolved'], default: 'unread' },
    acknowledged_by: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledged_at: { type: Date },
    resolved_at: { type: Date },
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

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
