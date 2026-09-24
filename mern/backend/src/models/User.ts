import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'doctor' | 'caretaker';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  specialization?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'doctor', 'caretaker'] },
    status: { type: String, required: true, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    specialization: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash;
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

export const User = mongoose.model<IUser>('User', UserSchema);
