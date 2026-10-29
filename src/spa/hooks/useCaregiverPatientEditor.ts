import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch, parseJsonSafely, useAuth } from "../hooks";

export interface CaregiverPatientFormData {
  name: string;
  mrn: string;
  dateOfBirth: string;
  sex: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
}

export interface AssignedPatientOption {
  id: string;
  name: string;
  mrn: string;
  dateOfBirth?: string;
}

export function useCaregiverPatientEditor(initialPatientId?: string) {
  const { user, logout } = useAuth();

  const [assignedPatients, setAssignedPatients] = useState<AssignedPatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || "");

  const [formData, setFormData] = useState<CaregiverPatientFormData>({
    name: "",
    mrn: "",
    dateOfBirth: "",
    sex: "Undisclosed",
    emergencyName: "",
    emergencyPhone: "",
    notes: "",
  });

  const [initialData, setInitialData] = useState<CaregiverPatientFormData>({
    name: "",
    mrn: "",
    dateOfBirth: "",
    sex: "Undisclosed",
    emergencyName: "",
    emergencyPhone: "",
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Compute dirty tracking
  const isDirty = useMemo(() => {
    return Object.keys(formData).some((k) => {
      const key = k as keyof CaregiverPatientFormData;
      if (key === "mrn") return false; // MRN is immutable
      const curr = formData[key] === undefined || formData[key] === null ? "" : String(formData[key]).trim();
      const init = initialData[key] === undefined || initialData[key] === null ? "" : String(initialData[key]).trim();
      return curr !== init;
    });
  }, [formData, initialData]);

  // 1. Fetch all assigned patients for this caregiver
  const loadAssignedPatients = useCallback(async () => {
    try {
      const res = await apiFetch("/api/caregiver/assigned-patients");
      if (res.ok) {
        const json = await parseJsonSafely<{ ok: boolean; patients: AssignedPatientOption[] }>(res);
        if (json.patients) {
          setAssignedPatients(json.patients);
          // Default to initial patient or first available assigned patient
          if (!selectedPatientId && json.patients.length > 0) {
            setSelectedPatientId(json.patients[0].id);
          }
        }
      } else {
        // Fallback: fetch caregiver dashboard
        const dashRes = await apiFetch("/api/caregiver/dashboard");
        if (dashRes.ok) {
          const dashJson = await parseJsonSafely(dashRes);
          if (dashJson.patients) {
            const list = dashJson.patients.map((r: any) => ({
              id: r.patient.id,
              name: r.patient.name,
              mrn: r.patient.mrn,
              dateOfBirth: r.patient.dateOfBirth,
            }));
            setAssignedPatients(list);
            if (!selectedPatientId && list.length > 0) {
              setSelectedPatientId(list[0].id);
            }
          }
        }
      }
    } catch {
      // Handled silently for dropdown options
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadAssignedPatients();
  }, [loadAssignedPatients]);

  // 2. Fetch selected patient details
  const loadPatientDetails = useCallback(async (patientId: string) => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setSaveError(null);
      setFieldErrors({});

      const res = await apiFetch(`/api/caregiver/patient-details/${patientId}`);
      if (res.ok) {
        const json = await parseJsonSafely<{ ok: boolean; patient: any }>(res);
        if (json.patient) {
          const p = json.patient;
          let dobString = "";
          if (p.dateOfBirth) {
            dobString = String(p.dateOfBirth).split("T")[0];
          }

          const mapped: CaregiverPatientFormData = {
            name: p.name || "",
            mrn: p.mrn || "",
            dateOfBirth: dobString,
            sex: p.sex || "Undisclosed",
            emergencyName: p.emergencyName || "",
            emergencyPhone: p.emergencyPhone || "",
            notes: p.notes || "",
          };
          setFormData(mapped);
          setInitialData(mapped);
          return;
        }
      }

      // Fallback: try caregiver patient overview endpoint
      const fbRes = await apiFetch(`/api/caregiver/patient/${patientId}`);
      if (fbRes.ok) {
        const fbJson = await parseJsonSafely(fbRes);
        const p = fbJson.patient;
        if (p) {
          let dobString = "";
          if (p.dateOfBirth) {
            dobString = String(p.dateOfBirth).split("T")[0];
          }
          const mapped: CaregiverPatientFormData = {
            name: p.name || "",
            mrn: p.mrn || "",
            dateOfBirth: dobString,
            sex: p.sex || "Undisclosed",
            emergencyName: p.emergencyName || "",
            emergencyPhone: p.emergencyPhone || "",
            notes: p.notes || "",
          };
          setFormData(mapped);
          setInitialData(mapped);
          return;
        }
      }

      throw new Error(`Failed to load patient records (HTTP ${res.status}). Verify assignment permissions.`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error loading patient details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId, loadPatientDetails]);

  // Update a single form field
  const updateField = (key: keyof CaregiverPatientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Client-side validation: must reject before save attempt
  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Patient full legal name is required.";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Patient name must be at least 2 characters.";
    } else if (formData.name.trim().length > 100) {
      errors.name = "Patient name cannot exceed 100 characters.";
    }

    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required.";
    } else {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        errors.dateOfBirth = "Please enter a valid calendar date.";
      } else {
        const now = new Date();
        if (dob > now) {
          errors.dateOfBirth = "Date of birth cannot be in the future.";
        }
      }
    }

    if (!formData.emergencyName.trim()) {
      errors.emergencyName = "Emergency contact name is required.";
    } else if (formData.emergencyName.trim().length < 2) {
      errors.emergencyName = "Emergency contact name must be at least 2 characters.";
    }

    if (!formData.emergencyPhone.trim()) {
      errors.emergencyPhone = "Emergency contact phone number is required.";
    } else {
      const digits = formData.emergencyPhone.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) {
        errors.emergencyPhone = "Phone number must contain between 8 and 15 digits.";
      }
    }

    if (formData.notes && formData.notes.length > 500) {
      errors.notes = "Clinical notes cannot exceed 500 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes
  const save = async (): Promise<boolean> => {
    setSaveError(null);

    // Validate before submission: reject missing required fields and malformed values
    const valid = validateClient();
    if (!valid) {
      // NO SAVE ATTEMPTED
      return false;
    }

    if (!selectedPatientId) {
      setSaveError("No patient selected for update.");
      return false;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/caregiver/patient-details/${selectedPatientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await parseJsonSafely(res);

      if (!res.ok || !json.ok) {
        if (json.errors) {
          setFieldErrors(json.errors);
        }
        throw new Error(json.error || `Server rejected update with HTTP ${res.status}`);
      }

      // Success: update snapshot and reset dirty state
      setInitialData({ ...formData });
      setFieldErrors({});
      setSaveSuccess(true);
      const timer = setTimeout(() => setSaveSuccess(false), 4000);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save patient changes. Record remains unchanged.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discard changes
  const resetForm = () => {
    setFormData({ ...initialData });
    setFieldErrors({});
    setSaveError(null);
  };

  return {
    user,
    assignedPatients,
    selectedPatientId,
    setSelectedPatientId,
    formData,
    initialData,
    isDirty,
    loading,
    isSubmitting,
    saveSuccess,
    saveError,
    fieldErrors,
    updateField,
    save,
    resetForm,
    reload: () => loadPatientDetails(selectedPatientId),
    logout,
  };
}
