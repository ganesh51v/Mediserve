import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatient extends Document {
  id: string;
  patient_code: string;
  name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  address?: string;
  emergency_contact: string;
  emergency_phone: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  doctor_id?: Types.ObjectId;
  caretaker_id?: Types.ObjectId;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    patient_code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    date_of_birth: { type: String, required: true },
    gender: { type: String, required: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    emergency_contact: { type: String, required: true, trim: true },
    emergency_phone: { type: String, required: true, trim: true },
    blood_group: { type: String, trim: true },
    allergies: { type: String, trim: true },
    medical_conditions: { type: String, trim: true },
    doctor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    caretaker_id: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
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

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
