"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Sidebar from "@/app/components/Sidebar";
import axios from "axios";

type FormState = {
  umur: number | null;
  mati: number | null;
  culing: number | null;
  konsumsi: number | null;
  bb_ekor: number | null;
  id_lantai: number | null;
};

const num = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "object") {
    if (typeof v.Int64 === "number") return v.Int64;
    if (typeof v.Float64 === "number") return v.Float64;
    if (typeof v.Int64 === "string") return parseFloat(v.Int64) || 0;
    if (typeof v.Float64 === "string") return parseFloat(v.Float64) || 0;
  }
  return 0;
};

function FormMonitoringContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const id_kandang = sp.get("id_kandang");
  const id_lantai = sp.get("id_lantai");
  const id_monit = sp.get("id_monit");

  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState({ username: "", email: "" });

  const [formData, setFormData] = useState<FormState>({
    umur: null,
    mati: null,
    culing: null,
    konsumsi: null,
    bb_ekor: null,
    id_lantai: null,
  });

  // Prefill user & auth check
  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token") ?? "";
    const username =
      localStorage.getItem("user_name") ?? localStorage.getItem("name") ?? "";
    const email =
      localStorage.getItem("user_email") ?? localStorage.getItem("email") ?? "";
    const exp = localStorage.getItem("token_expiration");
    setUserInfo({ username, email });

    if (!token || !email || (exp && Date.now() > parseInt(exp, 10))) {
      localStorage.clear();
      router.push("/login");
      return;
    }

    if (!id_lantai) {
      alert("ID lantai tidak ditemukan.");
      router.push("/monitoring");
      setInitialLoading(false);
      return;
    }

    // Set lantai id
    setFormData((prev) => ({ ...prev, id_lantai: parseInt(id_lantai, 10) }));

    // Jika edit, ambil data monitoring spesifik
    const fetchExisting = async () => {
      if (!id_monit) {
        setInitialLoading(false);
        return;
      }
      try {
        setInitialLoading(true);
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/data/${id_lantai}/${id_monit}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setFormData({
          umur: num(data?.umur) || null,
          mati: data?.mati ?? null,
          culing: data?.culing ?? null,
          konsumsi: data?.konsumsi ?? null,
          bb_ekor: data?.bb_ekor ?? null,
          id_lantai: parseInt(id_lantai, 10),
        });
      } catch (err) {
        console.error("Error fetching monitoring data:", err);
        alert("Gagal memuat data monitoring.");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExisting();
  }, [id_lantai, id_monit, router]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]:
        value === ""
          ? null
          : id === "bb_ekor" || id === "konsumsi"
          ? parseFloat(value)
          : ["mati", "culing", "umur"].includes(id)
          ? parseInt(value, 10)
          : value,
    }));
  }, []);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.id_lantai) {
      alert("ID lantai tidak valid.");
      return;
    }

    if (!id_kandang) {
      alert("ID kandang tidak ditemukan.");
      return;
    }

    // Validasi input
    if (
      formData.mati === null ||
      formData.culing === null ||
      formData.konsumsi === null ||
      formData.bb_ekor === null
    ) {
      alert("Semua field harus diisi!");
      return;
    }

    setLoading(true);
    try {
      const token =
        localStorage.getItem("auth_token") ?? localStorage.getItem("token");
      if (!token) {
        alert("Token tidak ada / kedaluwarsa");
        router.push("/login");
        return;
      }

      if (id_monit) {
        // Update existing monitoring
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/data/${formData.id_lantai}/${id_monit}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new monitoring
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/data/${formData.id_lantai}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      router.refresh();
      
      router.push(
        `/monitoring/kandang/${id_kandang}/lantai/${id_lantai}?success=${
          id_monit ? "ubah" : "tambah"
        }`
      );
    } catch (err: any) {
      console.error("Error saving monitoring:", err);
      alert(err.response?.data?.error || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Memuat form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {id_monit ? "Ubah Monitoring" : "Tambah Monitoring"}
            </h1>
            <p className="text-sm text-gray-500">
              ID Lantai: <span className="font-medium">{id_lantai}</span> •
              ID Kandang: <span className="font-medium">{id_kandang}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Pengguna</p>
            <p className="text-sm font-semibold text-gray-700 truncate">
              {userInfo.username || "-"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="mt-6 bg-white border rounded-lg shadow p-6 max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {id_monit && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Umur (hari)
                </label>
                <input
                  id="umur"
                  type="number"
                  value={formData.umur ?? ""}
                  disabled
                  className="w-full rounded border bg-gray-100 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Umur tidak dapat diubah saat edit
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mati <span className="text-red-500">*</span>
              </label>
              <input
                id="mati"
                type="number"
                value={formData.mati ?? ""}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                min={0}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Culing <span className="text-red-500">*</span>
              </label>
              <input
                id="culing"
                type="number"
                value={formData.culing ?? ""}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                min={0}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Konsumsi (Kg) <span className="text-red-500">*</span>
              </label>
              <input
                id="konsumsi"
                type="number"
                step="0.01"
                value={formData.konsumsi ?? ""}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                min={0}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Berat / Ekor (Gr) <span className="text-red-500">*</span>
              </label>
              <input
                id="bb_ekor"
                type="number"
                step="0.01"
                value={formData.bb_ekor ?? ""}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                min={0}
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 rounded text-sm font-medium text-white transition-colors ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading
                  ? "Menyimpan..."
                  : id_monit
                  ? "Update Monitoring"
                  : "Simpan Monitoring"}
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/monitoring/kandang/${id_kandang}/lantai/${id_lantai}`
                  )
                }
                className="px-5 py-2 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-xl">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Tips:</h3>
          <ul className="text-xs text-blue-700 space-y-1 leading-relaxed">
            <li>• Pastikan nilai konsumsi dan BB/Ekor akurat</li>
            <li>• Umur akan otomatis terisi saat menambah data baru</li>
            <li>• Saat edit, umur tidak dapat diubah</li>
            <li>• Field bertanda * wajib diisi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function FormMonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-white">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Memuat...</p>
            </div>
          </div>
        </div>
      }
    >
      <FormMonitoringContent />
    </Suspense>
  );
}
