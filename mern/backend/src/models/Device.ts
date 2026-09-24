import mongoose, { Schema, Document, Types } from 'mongoose';

export type DeviceStatus = 'online' | 'warning' | 'offline';
export type DispensingStatus = 'idle' | 'dispensing' | 'error' | 'jammed';

export interface IDeviceCompartment {
  compartment: number;
  medication_id?: Types.ObjectId;
  medication_name?: string;
  capacity: number;
  pills_remaining: number;
}

export interface IDevice extends Document {
  id: string;
  device_id: string;
  patient_id?: Types.ObjectId;
  status: DeviceStatus;
  battery_level: number;
  signal_strength: string;
  firmware_version: string;
  last_seen: Date;
  compartments: IDeviceCompartment[];
  dispensing_status: DispensingStatus;
  last_dispense_time?: Date;
  error_message?: string;
  device_token: string;
  created_at: Date;
  updated_at: Date;
}

const DeviceCompartmentSchema = new Schema<IDeviceCompartment>(
  {
    compartment: { type: Number, required: true },
    medication_id: { type: Schema.Types.ObjectId, ref: 'Medication' },
    medication_name: { type: String },
    capacity: { type: Number, default: 30 },
    pills_remaining: { type: Number, default: 0 },
  },
  { _id: false }
);

const DeviceSchema = new Schema<IDevice>(
  {
    device_id: { type: String, required: true, unique: true, uppercase: true, trim: true },
    patient_id: { type: Schema.Types.ObjectId, ref: 'Patient' },
    status: { type: String, enum: ['online', 'warning', 'offline'], default: 'online' },
    battery_level: { type: Number, default: 100, min: 0, max: 100 },
    signal_strength: { type: String, default: 'strong' },
    firmware_version: { type: String, default: 'v2.4.1' },
    last_seen: { type: Date, default: Date.now },
    compartments: { type: [DeviceCompartmentSchema], default: [] },
    dispensing_status: { type: String, enum: ['idle', 'dispensing', 'error', 'jammed'], default: 'idle' },
    last_dispense_time: { type: Date },
    error_message: { type: String },
    device_token: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        ret.compartments_json = JSON.stringify(ret.compartments || []);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        ret.compartments_json = JSON.stringify(ret.compartments || []);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
