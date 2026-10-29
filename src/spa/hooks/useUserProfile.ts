import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch, parseJsonSafely, setClerkToken, useAuth } from "../hooks";

export interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  // Doctor fields
  specialty?: string;
  licenseNumber?: string;
  issuingAuthority?: string;
  hospitalAffiliation?: string;
  yearsOfPractice?: number | string;
  npi?: string;
  // Caregiver fields
  certifications?: string;
  yearsOfExperience?: number | string;
  typesOfCare?: string;
  availability?: string;
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "DOCTOR" | "CAREGIVER";
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  isVerified: boolean;
  createdAt: string;
  doctor?: {
    id: string;
    specialty: string;
    licenseNumber?: string;
    issuingAuthority?: string;
    hospitalAffiliation?: string;
    yearsOfPractice?: number;
    npi?: string;
  };
  caregiver?: {
    id: string;
    phone: string;
    certifications?: string;
    yearsOfExperience?: number;
    typesOfCare?: string;
    availability?: string;
  };
}

export function useUserProfile() {
  const { user: authUser, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    licenseNumber: "",
    issuingAuthority: "",
    hospitalAffiliation: "",
    yearsOfPractice: "",
    npi: "",
    certifications: "",
    yearsOfExperience: "",
    typesOfCare: "",
    availability: "",
  });
  const [initialData, setInitialData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    licenseNumber: "",
    issuingAuthority: "",
    hospitalAffiliation: "",
    yearsOfPractice: "",
    npi: "",
    certifications: "",
    yearsOfExperience: "",
    typesOfCare: "",
    availability: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Compute dirty state by deep comparing editable fields against initial snapshot
  const isDirty = useMemo(() => {
    return Object.keys(formData).some((key) => {
      const k = key as keyof ProfileFormData;
      const currentVal = formData[k] === undefined || formData[k] === null ? "" : String(formData[k]).trim();
      const initialVal = initialData[k] === undefined || initialData[k] === null ? "" : String(initialData[k]).trim();
      return currentVal !== initialVal;
    });
  }, [formData, initialData]);

  // Load profile data from API or current auth state
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setSaveError(null);
      const res = await apiFetch("/api/profile");
      if (res.ok) {
        const json = await parseJsonSafely<{ ok: boolean; profile: UserProfileData }>(res);
        if (json.profile) {
          const p = json.profile;
          setProfile(p);
          const mapped: ProfileFormData = {
            name: p.name || "",
            email: p.email || "",
            phone: p.phone || p.caregiver?.phone || "",
            specialty: p.doctor?.specialty || "",
            licenseNumber: p.doctor?.licenseNumber || "",
            issuingAuthority: p.doctor?.issuingAuthority || "",
            hospitalAffiliation: p.doctor?.hospitalAffiliation || "",
            yearsOfPractice: p.doctor?.yearsOfPractice !== undefined ? String(p.doctor.yearsOfPractice) : "",
            npi: p.doctor?.npi || "",
            certifications: p.caregiver?.certifications || "",
            yearsOfExperience: p.caregiver?.yearsOfExperience !== undefined ? String(p.caregiver.yearsOfExperience) : "",
            typesOfCare: p.caregiver?.typesOfCare || "",
            availability: p.caregiver?.availability || "",
          };
          setFormData(mapped);
          setInitialData(mapped);
          return;
        }
      }
      // Fallback to session user if API is initializing
      if (authUser) {
        const fallbackProfile: UserProfileData = {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          phone: authUser.phone || "",
          role: authUser.role,
          verificationStatus: authUser.verificationStatus || "APPROVED",
          isVerified: authUser.isVerified ?? true,
          createdAt: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        const mapped: ProfileFormData = {
          name: authUser.name || "",
          email: authUser.email || "",
          phone: authUser.phone || "",
        };
        setFormData(mapped);
        setInitialData(mapped);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Update a single form field and clear its corresponding inline error
  const updateField = (key: keyof ProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Client-side responsiveness validation
  const validateClient = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = "Full legal name is required.";
    } else if (formData.name.trim().length < 2) {
      errs.name = "Full legal name must be at least 2 characters.";
    } else if (formData.name.trim().length > 100) {
      errs.name = "Full legal name cannot exceed 100 characters.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!emailPattern.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address (e.g. name@hospital.org).";
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      const cleanDigits = formData.phone.replace(/\D/g, "");
      if (cleanDigits.length < 8 || cleanDigits.length > 15) {
        errs.phone = "Phone number must contain between 8 and 15 digits.";
      }
    }

    if (profile?.role === "DOCTOR" && formData.yearsOfPractice) {
      const yrs = Number(formData.yearsOfPractice);
      if (isNaN(yrs) || yrs < 0 || yrs > 75) {
        errs.yearsOfPractice = "Years of practice must be a number between 0 and 75.";
      }
    }

    if (profile?.role === "CAREGIVER" && formData.yearsOfExperience) {
      const exp = Number(formData.yearsOfExperience);
      if (isNaN(exp) || exp < 0 || exp > 75) {
        errs.yearsOfExperience = "Years of experience must be a number between 0 and 75.";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save profile modifications
  const saveProfile = async (): Promise<boolean> => {
    setSaveError(null);

    // Run client validation first
    if (!validateClient()) {
      return false;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await parseJsonSafely(res);

      if (!res.ok || !json.ok) {
        // IMPORTANT: On failure, keep formData intact! Do not revert user input!
        if (json.errors) {
          setFieldErrors(json.errors);
        }
        throw new Error(json.error || "Failed to update profile. Server rejected the changes.");
      }

      // Update local snapshots and reset dirty state
      if (json.profile) {
        setProfile(json.profile);
      }
      setInitialData({ ...formData });
      setFieldErrors({});
      setSaveSuccess(true);

      // If server returned a refreshed session token with updated claims, update token store
      if (json.token) {
        setClerkToken(json.token);
      }

      const timer = setTimeout(() => setSaveSuccess(false), 4000);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile changes.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revert unsaved edits back to initial snapshot
  const resetForm = () => {
    setFormData({ ...initialData });
    setFieldErrors({});
    setSaveError(null);
  };

  return {
    profile,
    formData,
    initialData,
    isDirty,
    loading,
    isSubmitting,
    saveSuccess,
    saveError,
    fieldErrors,
    updateField,
    saveProfile,
    resetForm,
    reloadProfile: loadProfile,
    logout,
  };
}

