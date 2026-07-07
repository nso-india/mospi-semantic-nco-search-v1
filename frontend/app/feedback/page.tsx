"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !image) return;

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("text", text);
      if (image) {
        formData.append("image", image);
      }

      // We'll proxy this or call backend directly. Assuming NEXT_PUBLIC_API_BASE points to FastAPI
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      
      const res = await fetch(`${API_BASE}/api/feedback/submit`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage("Feedback submitted successfully!");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        setMessage("Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setMessage("An error occurred while submitting feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="bg-surface border border-border shadow-md p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Provide Feedback</h2>
        <p className="text-sm text-text-secondary mb-6">
          Help us improve the MoSPI-NCO Finder. Please share your thoughts or report an issue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Feedback Message</label>
            <textarea
              className="p-3 border border-border bg-bg-main text-text-primary focus:border-violet outline-none min-h-[120px]"
              placeholder="Describe your feedback or issue..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required={!image}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Attach an Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              className="file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-violet/10 file:text-violet hover:file:bg-violet/20"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImage(e.target.files[0]);
                }
              }}
            />
          </div>

          {message && (
            <div className={`p-3 text-sm ${message.includes("successfully") ? "bg-teal/10 text-teal" : "bg-rose/10 text-rose"}`}>
              {message}
            </div>
          )}

          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-subtle"
              onClick={() => router.push("/")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!text && !image)}
              className="px-6 py-2 bg-violet text-white text-sm font-medium hover:bg-violet/90 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
