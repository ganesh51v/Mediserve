import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHealthRecord extends Document {
  id: string;
  patient_id: Types.ObjectId;
  recorded_by?: Types.ObjectId;
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  blood_glucose?: number;
  temperature?: number;
  oxygen_saturation?: number;
  notes?: string;
  recorded_at: Date;
  created_at: Date;
}

const HealthRecordSchema = new Schema<IHealthRecord>(
  {
    patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    recorded_by: { type: Schema.Types.ObjectId, ref: 'User' },
    blood_pressure_sys: { type: Number },
    blood_pressure_dia: { type: Number },
    heart_rate: { type: Number },
    blood_glucose: { type: Number },
    temperature: { type: Number },
    oxygen_saturation: { type: Number },
    notes: { type: String, trim: true },
    recorded_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
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

export const HealthRecord = mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);
