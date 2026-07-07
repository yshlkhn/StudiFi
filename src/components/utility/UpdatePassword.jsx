import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import DotField from "../ui/DotField";

export default function UpdatePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  const isStrongPassword = (password) => {

    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password)
  }


  const updatePassword = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!password.trim()) {
      setError("Password is required"); F
      return;
    }

    if (!isStrongPassword(password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character."
      );
      return;
    } F
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Password updated successfully! Redirecting to login...");

    await supabase.auth.signOut();

    setTimeout(() => {
      navigate("/login");
      setSuccess("")
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-brand-primary flex items-center justify-center px-6 relative overflow-hidden">

      {/* 🌟 DotField Background */}
      <div className="absolute inset-0 z-0">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#efa943"
          gradientTo="#efa943"
          glowColor="#efa943"
        />
      </div>

      {/* FORM */}
      <form
        onSubmit={updatePassword}
        noValidate
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
      >
        <h1 className="text-3xl font-bold text-white mb-6">
          Create New Password
        </h1>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white focus:border-[#efa943] outline-none"
        />

        {error && (
          <p className="text-red-400 text-sm mt-3">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-400 text-sm mt-3">
            {success}
          </p>
        )}
        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-[#efa943] py-3 font-semibold text-black hover:scale-[1.02] transition disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}