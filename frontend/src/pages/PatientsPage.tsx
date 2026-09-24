import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { patientService } from '../services/patientService';
import { authService } from '../services/authService';
import { Patient, User as UserType } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<UserType[]>([]);
  const [caretakers, setCaretakers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Register Patient Modal
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    blood_group: '',
    allergies: '',
    medical_conditions: '',
    doctor_id: '',
    caretaker_id: '',
  });
  const [submittingPatient, setSubmittingPatient] = useState(false);

  const loadPatients = async () => {
    try {
      const [pts, docs, cares] = await Promise.all([
        patientService.getPatients({ q: searchTerm }),
        authService.getUsers('doctor'),
        authService.getUsers('caretaker'),
      ]);
      setPatients(pts);
      setDoctors(docs);
      setCaretakers(cares);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [searchTerm]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPatient(true);
    try {
      await patientService.createPatient(newPatient);
      setIsAddPatientOpen(false);
      setNewPatient({
        name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        address: '',
        emergency_contact: '',
        emergency_phone: '',
        blood_group: '',
        allergies: '',
        medical_conditions: '',
        doctor_id: '',
        caretaker_id: '',
      });
      loadPatients();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register patient');
    } finally {
      setSubmittingPatient(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            Patient Directory
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Monitored Patients</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive patient demographic records, schedules, and clinical oversight.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddPatientOpen(true)}>
          Register New Patient
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, code (e.g. P-1001), or medical condition..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : patients.length === 0 ? (
        <EmptyState
          title="No patients found"
          description="Try adjusting your search criteria or register a new patient."
          actionText="Register New Patient"
          onAction={() => setIsAddPatientOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="group bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-teal-600 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {patient.patient_code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1.5 group-hover:text-teal-600 transition-colors">
                      {patient.name}
                    </h3>
                  </div>
                  <Badge status={patient.device_status || 'offline'} size="sm" />
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <p>
                    <strong className="text-slate-700">Conditions:</strong>{' '}
                    <span className="text-slate-800">{patient.medical_conditions || 'None'}</span>
                  </p>
                  <p>
                    <strong className="text-slate-700">Allergies:</strong>{' '}
                    <span className="text-rose-600 font-medium">{patient.allergies || 'None'}</span>
                  </p>
                  <p>
                    <strong className="text-slate-700">Blood Group:</strong> {patient.blood_group}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Doctor: {patient.doctor_name || 'Dr. Robert Smith'}</span>
                <span className="text-teal-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Profile →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Patient Modal */}
      <Modal
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        title="Register New Patient"
        subtitle="Create a patient record and assign clinical caretakers"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                placeholder="e.g. William Davies"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                required
                value={newPatient.date_of_birth}
                onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender</label>
              <select
                required
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={newPatient.blood_group}
                onChange={(e) => setNewPatient({ ...newPatient, blood_group: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Blood Group...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                placeholder="+1 555-0144"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={newPatient.address}
              onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
              placeholder="e.g. 142 River Road, Springfield"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-rose-700 mb-1">Emergency Contact Name</label>
              <input
                type="text"
                required
                value={newPatient.emergency_contact}
                onChange={(e) => setNewPatient({ ...newPatient, emergency_contact: e.target.value })}
                placeholder="e.g. Mary Davies (Daughter)"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-rose-700 mb-1">Emergency Contact Phone</label>
              <input
                type="text"
                required
                value={newPatient.emergency_phone}
                onChange={(e) => setNewPatient({ ...newPatient, emergency_phone: e.target.value })}
                placeholder="+1 555-9988"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Allergies</label>
              <input
                type="text"
                value={newPatient.allergies}
                onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Codeine, Peanuts"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medical Conditions</label>
              <input
                type="text"
                value={newPatient.medical_conditions}
                onChange={(e) => setNewPatient({ ...newPatient, medical_conditions: e.target.value })}
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Physician</label>
              <select
                value={newPatient.doctor_id}
                onChange={(e) => setNewPatient({ ...newPatient, doctor_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Doctor (Optional)...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization || 'Doctor'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Caretaker</label>
              <select
                value={newPatient.caretaker_id}
                onChange={(e) => setNewPatient({ ...newPatient, caretaker_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
              >
                <option value="">Select Caretaker (Optional)...</option>
                {caretakers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddPatientOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingPatient}>
              Register Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
