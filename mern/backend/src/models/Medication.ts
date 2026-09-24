import mongoose, { Schema, Document, Types } from 'mongoose';

export type MedicationType = 'Tablet' | 'Capsule' | 'Liquid' | 'Injection' | 'Inhaler' | 'Topical';
export type MealRelation =
  | 'Before Breakfast'
  | 'After Breakfast'
  | 'Before Lunch'
  | 'After Lunch'
  | 'Before Dinner'
  | 'After Dinner'
  | 'With Meal'
  | 'Empty Stomach'
  | 'Custom Time';
export type MedicationStatus = 'active' | 'completed' | 'discontinued';

export interface IMedication extends Document {
  id: string;
  patient_id: Types.ObjectId;
  doctor_id?: Types.ObjectId;
  name: string;
  medicine_type: MedicationType;
  dosage: string;
  current_quantity: number;
  initial_quantity: number;
  refill_threshold: number;
  frequency: string;
  meal_relation: MealRelation;
  scheduled_time: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
  special_precautions?: string;
  storage_info?: string;
  expiry_date?: string;
  status: MedicationStatus;
  created_at: Date;
  updated_at: Date;
}

const MedicationSchema = new Schema<IMedication>(
  {
    patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    medicine_type: {
      type: String,
      required: true,
      enum: ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Inhaler', 'Topical'],
      default: 'Tablet',
    },
    dosage: { type: String, required: true, trim: true },
    current_quantity: { type: Number, required: true, min: 0 },
    initial_quantity: { type: Number, required: true, min: 1 },
    refill_threshold: { type: Number, required: true, min: 1, default: 5 },
    frequency: { type: String, required: true, trim: true },
    meal_relation: {
      type: String,
      required: true,
      enum: [
        'Before Breakfast',
        'After Breakfast',
        'Before Lunch',
        'After Lunch',
        'Before Dinner',
        'After Dinner',
        'With Meal',
        'Empty Stomach',
        'Custom Time',
      ],
    },
    scheduled_time: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String },
    instructions: { type: String, trim: true },
    special_precautions: { type: String, trim: true },
    storage_info: { type: String, trim: true },
    expiry_date: { type: String },
    status: { type: String, enum: ['active', 'completed', 'discontinued'], default: 'active' },
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

export const Medication = mongoose.model<IMedication>('Medication', MedicationSchema);
