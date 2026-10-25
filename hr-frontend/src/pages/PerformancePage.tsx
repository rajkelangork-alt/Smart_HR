import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Award, Plus, Star, X } from "lucide-react";

interface ReviewItem {
  id: string;
  rating: number;
  feedback: string;
  year: number;
  cycle: string;
  employee?: {
    firstName: string;
    lastName: string;
    departments?: { name: string };
  };
  reviewer?: {
    firstName: string;
    lastName: string;
  };
}

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Appraisal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [rating, setRating] = useState("5");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/performance");
      if (res.data?.success) setReviews(res.data.data);
    } catch (err) {
      console.error("Failed to load appraisals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();

    if (user?.role === "SUPER_ADMIN" || user?.role === "MANAGER") {
      api.get("/employees").then((res) => {
        if (res.data?.success) {
          // Rule: Cannot review oneself
          setTeamMembers(
            res.data.data.filter((e: any) => e.userId !== user.id),
          );
        }
      });
    }
  }, [user]);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setIsSubmitting(true);

    try {
      const res = await api.post("/performance", {
        employeeId: targetEmployeeId,
        rating: parseFloat(rating),
        feedback,
      });

      if (res.data?.success) {
        setIsModalOpen(false);
        setFeedback("");
        setTargetEmployeeId("");
        fetchReviews();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.error || "Failed to submit appraisal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Appraisals & Reviews
          </h1>
          <p className="text-sm font-medium text-slate-300 mt-1">
            {user.role === "EMPLOYEE"
              ? "Your evaluations and evaluator feedback records."
              : "Conduct subordinate appraisals and track team objectives."}
          </p>
        </div>

        {/* Single Icon (no duplicate + glyph) */}
        {(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create Appraisal</span>
          </button>
        )}
      </div>

      {/* Review Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading appraisal records...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
          No performance reviews recorded for this profile scope.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {rev.employee
                        ? `${rev.employee.firstName} ${rev.employee.lastName}`
                        : "Self"}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      {rev.employee?.departments?.name || "Operations"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-bold text-sm">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{rev.rating}/5</span>
                  </div>
                </div>

                <div className="mt-3 p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                  <p className="text-xs text-slate-300 italic font-medium leading-relaxed">
                    "{rev.feedback}"
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>
                  Cycle: {rev.cycle || "ANNUAL"} {rev.year}
                </span>
                <span className="text-indigo-400 font-semibold">
                  Evaluator:{" "}
                  {rev.reviewer
                    ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}`
                    : "Super Admin"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Appraisal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">
                Submit Appraisal Review
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Select Subordinate *
                </label>
                <select
                  required
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Member --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} (
                      {m.departments?.name || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Rating (1.0 to 5.0) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  required
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Appraisal Feedback *
                </label>
                <textarea
                  required
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter appraisal feedback and objectives"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Submit Appraisal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePage;
