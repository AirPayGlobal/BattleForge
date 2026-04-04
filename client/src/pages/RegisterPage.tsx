import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-arc-cyan tracking-wide">
            BATTLEFORGE
          </h1>
          <p className="font-ui text-secondary-text mt-2 uppercase tracking-[0.15em] text-sm">
            Craft your weapon. Stake your name.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-display text-2xl text-primary-text text-center">
            REGISTER
          </h2>

          {error && (
            <div className="bg-danger-red/10 border border-danger-red/30 rounded-lg px-4 py-2 text-danger-red text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Choose your warrior name"
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="warrior@battleforge.gg"
              required
            />
          </div>

          <div>
            <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-deep-navy border-t-transparent rounded-full animate-spin" />
                Forging account...
              </span>
            ) : (
              "Begin Your Legacy"
            )}
          </button>

          <p className="text-center text-sm text-secondary-text">
            Already a warrior?{" "}
            <Link
              to="/login"
              className="text-arc-cyan hover:text-arc-cyan/80 font-semibold"
            >
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
