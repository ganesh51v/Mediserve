import mongoose, { Schema, Document, Types } from 'mongoose';
import { MealRelation } from './Medication.js';

export interface IMedicationSchedule extends Document {
  id: string;
  medication_id: Types.ObjectId;
  patient_id: Types.ObjectId;
  scheduled_time: string;
  meal_relation: MealRelation;
  days_of_week: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const MedicationScheduleSchema = new Schema<IMedicationSchedule>(
  {
    medication_id: { type: Schema.Types.ObjectId, ref: 'Medication', required: true, index: true },
    patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    scheduled_time: { type: String, required: true },
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
    days_of_week: { type: String, default: 'Daily' },
    active: { type: Boolean, default: true },
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

export const MedicationSchedule = mongoose.model<IMedicationSchedule>('MedicationSchedule', MedicationScheduleSchema);
