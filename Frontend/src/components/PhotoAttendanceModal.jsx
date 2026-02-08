import { useState } from "react";
import axios from "axios";
import { X, Upload } from "lucide-react";
import { attendanceAPI } from "../services/api";

export default function PhotoAttendanceModal({
  session,
  user,
  onClose,
  onApply,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an image.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const form = new FormData();
      form.append("image", file);
      form.append("session_id", session.id);
      form.append("faculty_id", user.id);

      const res = await axios.post(
        "http://localhost:5000/api/attendance/photo-upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setResults(res.data.results);
    } catch (err) {
      console.error(err);
      setError("Failed to process image. Try a clearer photo.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (sid) => {
    setResults((prev) =>
      prev.map((r) =>
        r.student_id === sid
          ? { ...r, status: r.status === "present" ? "absent" : "present" }
          : r
      )
    );
  };

  const applyAttendance = async () => {
    const records = results.map((r) => ({
      student_id: r.student_id,
      status: r.status,
    }));

    await attendanceAPI.markAttendance({
      session_id: session.id,
      marked_by: user.id,
      records,
    });

    onApply();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl p-6 relative">
        
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
          onClick={onClose}
        >
          <X size={22} />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Upload Attendance Log Photo
        </h2>

        {/* Step 1: Upload Image */}
        {!results.length && (
          <>
            <label
              className="block border-2 border-dashed p-6 text-center cursor-pointer rounded-lg hover:bg-gray-50"
            >
              <Upload size={32} className="mx-auto mb-2 text-indigo-600" />
              <p className="text-gray-600">Click to choose image</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>

            {file && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {file.name}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upload & Extract Attendance"}
            </button>

            {error && (
              <p className="text-red-600 mt-2 text-sm">{error}</p>
            )}
          </>
        )}

        {/* Step 2: Show OCR Results */}
        {results.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mt-6 mb-3">
              OCR Results — Review & Confirm
            </h3>

            <div className="max-h-72 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="p-2 text-left">Roll No</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{r.roll_no}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => toggleStatus(r.student_id)}
                          className={`px-3 py-1 rounded text-white ${
                            r.status === "present"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          {r.status === "present" ? "Present" : "Absent"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={applyAttendance}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Apply Attendance
            </button>
          </>
        )}
      </div>
    </div>
  );
}
