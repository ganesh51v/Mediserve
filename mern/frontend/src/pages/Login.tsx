import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  HeartHandshake,
  Lock,
  Mail,
  ArrowRight,
  UserPlus,
  Phone,
  User,
  CheckCircle2,
  Calendar,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

type AuthMode = 'login' | 'register';
type SignupRole = 'doctor' | 'caretaker' | 'patient';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signupRole, setSignupRole] = useState<SignupRole>('doctor');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Setup / First-time Admin Registration
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Doctor & Caretaker signup form state
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
  });

  // Patient signup form state
  const [patientForm, setPatientForm] = useState({
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
  });

  const [registeredPatient, setRegisteredPatient] = useState<{
    patient_code: string;
    name: string;
  } | null>(null);

  const checkSetup = async () => {
    try {
      const data = await authService.getSetupStatus();
      setIsSetup(data.isSetup);
    } catch {
      setIsSetup(true);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'doctor') navigate('/doctor');
      else navigate('/caretaker');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.register({
        name: staffForm.name,
        email: staffForm.email,
        phone: staffForm.phone || undefined,
        password: staffForm.password,
        role: signupRole,
        specialization: signupRole === 'doctor' ? staffForm.specialization || 'General Medicine' : undefined,
      });

      // Automatically sign in upon successful registration
      const user = await login(staffForm.email, staffForm.password);
      if (user.role === 'doctor') navigate('/doctor');
      else navigate('/caretaker');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete registration. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authService.registerPatient({
        name: patientForm.name,
        date_of_birth: patientForm.date_of_birth,
        gender: patientForm.gender,
        phone: patientForm.phone || undefined,
        address: patientForm.address || undefined,
        emergency_contact: patientForm.emergency_contact,
        emergency_phone: patientForm.emergency_phone,
        blood_group: patientForm.blood_group || undefined,
        allergies: patientForm.allergies || undefined,
        medical_conditions: patientForm.medical_conditions || undefined,
      });

      setRegisteredPatient({
        patient_code: result.patient.patient_code,
        name: result.patient.name,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register patient profile. Please verify all required fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegistering(true);

    try {
      await authService.register({
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        password: newAdmin.password,
        role: 'admin',
        specialization: 'System Operations',
      });
      setIsRegisterOpen(false);
      await login(newAdmin.email, newAdmin.password);
      navigate('/admin');
    } catch (err: any) {
      setRegisterError(err.response?.data?.error || 'Failed to initialize administrator account.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl shadow-teal-600/30">
            <Activity className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          MediServe
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Smart Meal-Aware Medication Monitoring & Dispensing Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-10">
          {/* First-time setup banner for initial Administrator */}
          {isSetup === false && (
            <div className="mb-5 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Empty Database Detected
              </div>
              <p className="text-teal-700 mb-3 leading-relaxed">
                No users currently exist. Register the initial Administrator account to begin setting up doctors, caretakers, and patients.
              </p>
              <Button
                type="button"
                size="sm"
                className="w-full"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => setIsRegisterOpen(true)}
              >
                Register Initial Administrator
              </Button>
            </div>
          )}

          {/* Navigation Tabs: Sign In vs Create Account */}
          <div className="flex p-1 mb-6 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setRegisteredPatient(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setRegisteredPatient(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === 'login' && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Medical Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-slate-900 placeholder-slate-400"
                    placeholder="doctor@mediserve.health"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-slate-900 placeholder-slate-400"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className="w-full mt-2"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to MediServe
              </Button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500">Need an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                  }}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Sign up as Doctor, Caretaker, or Patient
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGN UP FLOW */}
          {authMode === 'register' && (
            <div>
              {/* Patient Registration Success Card */}
              {registeredPatient ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Patient Registered Successfully
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Welcome, <span className="font-semibold text-slate-800">{registeredPatient.name}</span>.
                      Your clinical profile has been established.
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 inline-block text-left w-full">
                    <div className="text-[11px] text-teal-700 uppercase font-bold tracking-wider mb-0.5">
                      Assigned Patient Code
                    </div>
                    <div className="text-lg font-mono font-extrabold text-teal-900">
                      {registeredPatient.patient_code}
                    </div>
                    <div className="text-[11px] text-teal-600 mt-1">
                      Please share this code with your attending Doctor or Caretaker to link your smart dispenser.
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        setAuthMode('login');
                        setRegisteredPatient(null);
                      }}
                    >
                      Return to Sign In
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisteredPatient(null);
                        setPatientForm({
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
                        });
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium block mx-auto"
                    >
                      Register Another Patient
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Role Selection Tabs */}
                  <div className="mb-5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                      Select Your Medical Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSignupRole('doctor');
                          setError(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          signupRole === 'doctor'
                            ? 'border-teal-500 bg-teal-50/70 text-teal-800 shadow-sm ring-1 ring-teal-500'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Stethoscope className="w-4 h-4 mb-1 text-teal-600" />
                        Doctor
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSignupRole('caretaker');
                          setError(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          signupRole === 'caretaker'
                            ? 'border-teal-500 bg-teal-50/70 text-teal-800 shadow-sm ring-1 ring-teal-500'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <HeartHandshake className="w-4 h-4 mb-1 text-amber-600" />
                        Caretaker
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSignupRole('patient');
                          setError(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          signupRole === 'patient'
                            ? 'border-teal-500 bg-teal-50/70 text-teal-800 shadow-sm ring-1 ring-teal-500'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <User className="w-4 h-4 mb-1 text-blue-600" />
                        Patient
                      </button>
                    </div>
                  </div>

                  {/* DOCTOR & CARETAKER SIGNUP FORM */}
                  {(signupRole === 'doctor' || signupRole === 'caretaker') && (
                    <form className="space-y-3" onSubmit={handleRegisterStaff}>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={staffForm.name}
                          onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder={signupRole === 'doctor' ? 'Dr. Elizabeth Blackwell' : 'Jane Smith'}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={staffForm.email}
                          onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder={signupRole === 'doctor' ? 'doctor@hospital.org' : 'caretaker@family.net'}
                        />
                      </div>

                      {signupRole === 'doctor' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Medical Specialization
                          </label>
                          <input
                            type="text"
                            value={staffForm.specialization}
                            onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                            placeholder="e.g. Cardiology, Geriatrics, Endocrinology"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={staffForm.phone}
                          onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder="+1 (555) 019-2834"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder="••••••••••••"
                        />
                      </div>

                      <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full mt-3"
                        icon={<UserPlus className="w-4 h-4" />}
                      >
                        Register as {signupRole === 'doctor' ? 'Doctor' : 'Caretaker'}
                      </Button>
                    </form>
                  )}

                  {/* PATIENT PROFILE SIGNUP FORM */}
                  {signupRole === 'patient' && (
                    <form className="space-y-3" onSubmit={handleRegisterPatient}>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Patient Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={patientForm.name}
                          onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder="e.g. Eleanor Vance"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Date of Birth *
                          </label>
                          <input
                            type="date"
                            required
                            value={patientForm.date_of_birth}
                            onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Gender *
                          </label>
                          <select
                            required
                            value={patientForm.gender}
                            onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500 bg-white"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            value={patientForm.phone}
                            onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                            placeholder="+1 (555) 012-3456"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Blood Group
                          </label>
                          <select
                            value={patientForm.blood_group}
                            onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500 bg-white"
                          >
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Residential Address
                        </label>
                        <input
                          type="text"
                          value={patientForm.address}
                          onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder="124 Elm Street, Apt 4B, Springfield"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Emergency Contact Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={patientForm.emergency_contact}
                            onChange={(e) => setPatientForm({ ...patientForm, emergency_contact: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                            placeholder="Primary contact"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Emergency Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            value={patientForm.emergency_phone}
                            onChange={(e) => setPatientForm({ ...patientForm, emergency_phone: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                            placeholder="+1 (555) 999-0000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Known Allergies
                        </label>
                        <input
                          type="text"
                          value={patientForm.allergies}
                          onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder="e.g. Penicillin, Peanuts (or None)"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Medical Conditions
                        </label>
                        <input
                          type="text"
                          value={patientForm.medical_conditions}
                          onChange={(e) => setPatientForm({ ...patientForm, medical_conditions: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
                          placeholder="e.g. Hypertension, Type 2 Diabetes"
                        />
                      </div>

                      <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full mt-3"
                        icon={<Sparkles className="w-4 h-4" />}
                      >
                        Register Patient Profile
                      </Button>
                    </form>
                  )}

                  <div className="pt-4 text-center border-t border-slate-100 mt-4">
                    <span className="text-xs text-slate-500">Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError(null);
                      }}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>MediServe Health System v1.0.0</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Firebase Connected (mediserve-c7043)
          </span>
        </div>
      </div>

      {/* Initial Administrator Setup Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register Administrator Account"
        subtitle="Initialize primary system access for MediServe"
      >
        <form onSubmit={handleRegisterAdmin} className="space-y-4 text-xs">
          {registerError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {registerError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              placeholder="e.g. System Administrator"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="admin@mediserve.health"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={newAdmin.phone}
              onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
              placeholder="+1 555-0100"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={registering}>
              Create Administrator Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
