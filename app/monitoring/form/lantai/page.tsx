"use client";

import { Suspense, useEffect, useState } from "react"; // Tambahkan Suspense
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import axios from "axios";

const JENIS_DOC_OPTIONS = ["Cobb", "Ross", "Hubbard", "Arbor Acres"];

type FormData = {
  no_lantai: number | null;
  jenis_doc: string;
  populasi: number | null;
  tgl_masuk: string;
  kandang_id: number | null;
  bb_ekor: number | null;
};

function FormLantaiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tambah = searchParams.get("tambah");
  const ubah = searchParams.get("ubah");
  const hapus = searchParams.get("hapus");
  const id_kandang = searchParams.get("id_kandang");
  const id_lantai = searchParams.get("id_lantai");

  const [userInfo, setUserInfo] = useState({
    username: "",
    email: "",
    picture: "",
  });

  const [formData, setFormData] = useState<FormData>({
    no_lantai: null,
    jenis_doc: "",
    populasi: null,
    tgl_masuk: "",
    kandang_id: id_kandang ? parseInt(id_kandang, 10) : null,
    bb_ekor: null,
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lantaiList, setLantaiList] = useState<any[]>([]);
  const [selectedLantai, setSelectedLantai] = useState<string>("");

  // Auth check & prefill user
  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token") ?? "";
    const username =
      localStorage.getItem("user_name") ?? localStorage.getItem("name") ?? "";
    const email =
      localStorage.getItem("user_email") ?? localStorage.getItem("email") ?? "";
    const picture =
      localStorage.getItem("user_picture") ??
      localStorage.getItem("picture") ??
      "";
    const exp = localStorage.getItem("token_expiration");

    setUserInfo({ username, email, picture });

    if (!token || !email || (exp && Date.now() > parseInt(exp, 10))) {
      localStorage.clear();
      router.push("/login");
      return;
    }

    if (!id_kandang) {
      alert("ID kandang tidak ditemukan.");
      router.push("/monitoring/kandang");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      kandang_id: parseInt(id_kandang, 10),
    }));

    // Jika mode ubah/hapus, ambil daftar lantai
    if (ubah || hapus) {
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/kandang/${id_kandang}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          const lantai = res.data?.lantai || [];
          setLantaiList(lantai);
          setInitialLoading(false);
        })
        .catch(() => {
          alert("Gagal memuat data lantai.");
          setInitialLoading(false);
        });
    } else if (id_lantai) {
      // Mode edit spesifik (dari query)
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${id_lantai}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          const data = res.data;
          setFormData({
            no_lantai: data.no_lantai ?? null,
            jenis_doc: data.jenis_doc ?? "",
            populasi: data.populasi ?? null,
            tgl_masuk: data.tgl_masuk ? data.tgl_masuk.split("T")[0] : "",
            kandang_id: parseInt(id_kandang, 10),
            bb_ekor: data.bb_ekor ?? null,
          });
          setInitialLoading(false);
        })
        .catch(() => {
          alert("Gagal mengambil data lantai.");
          setInitialLoading(false);
        });
    } else {
      setInitialLoading(false);
    }
  }, [id_kandang, id_lantai, ubah, hapus, router]);

  // Handle pilih lantai untuk ubah/hapus
  useEffect(() => {
    if (selectedLantai && (ubah || hapus)) {
      const token =
        localStorage.getItem("auth_token") ?? localStorage.getItem("token");
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${selectedLantai}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          const data = res.data;
          setFormData({
            no_lantai: data.no_lantai ?? null,
            jenis_doc: data.jenis_doc ?? "",
            populasi: data.populasi ?? null,
            tgl_masuk: data.tgl_masuk ? data.tgl_masuk.split("T")[0] : "",
            kandang_id: parseInt(id_kandang!, 10),
            bb_ekor: data.bb_ekor ?? null,
          });
        })
        .catch(() => alert("Gagal memuat data lantai."));
    }
  }, [selectedLantai, ubah, hapus, id_kandang]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]:
        id === "bb_ekor"
        ? value === ""
          ? null
          : parseFloat(value)
         :
        id === "no_lantai" || id === "populasi" || id === "kandang_id"
          ? value === ""
            ? null
            : parseInt(value, 10)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token");
    if (!token) {
      alert("Token tidak ada / kedaluwarsa");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      if (hapus && selectedLantai) {
        // Hapus lantai
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${selectedLantai}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        router.push(`/monitoring/kandang?success=hapuslantai`);
      } else if (ubah && selectedLantai) {
        // Update lantai
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${selectedLantai}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        router.push(`/monitoring/kandang?success=editlantai`);
      } else if (id_lantai) {
        // Edit dari query
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${id_lantai}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        router.push(`/monitoring/kandang?success=editlantai`);
      } else {
        // Tambah baru
        const createPayload = {
          no_lantai: formData.no_lantai,
          jenis_doc: formData.jenis_doc,
          populasi: formData.populasi,
          tgl_masuk: formData.tgl_masuk,
          bb_ekor: formData.bb_ekor === null ? null : Number(formData.bb_ekor),
        };

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}`,
          createPayload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        router.push(`/monitoring/kandang?success=tambahlantai`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLantai) {
      alert("Pilih lantai terlebih dahulu.");
      return;
    }
    if (!confirm("Yakin ingin menghapus lantai ini?")) return;

    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token");
    setLoading(true);
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${selectedLantai}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/monitoring/kandang?success=hapuslantai`);
    } catch {
      alert("Gagal menghapus lantai.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Memuat form...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {hapus
                ? "Hapus Lantai"
                : ubah
                  ? "Ubah Lantai"
                  : id_lantai
                    ? "Ubah Lantai"
                    : "Tambah Lantai"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Kandang ID: <span className="font-medium">{id_kandang}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Pengguna</p>
            <p className="text-sm font-semibold text-gray-700 truncate">
              {userInfo.username || "-"}
            </p>
          </div>
        </div>

        {/* Pilih Lantai (untuk mode ubah/hapus) */}
        {(ubah || hapus) && (
          <div className="mt-6 bg-white border rounded-lg shadow p-6 max-w-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Lantai
            </label>
            <select
              value={selectedLantai}
              onChange={(e) => setSelectedLantai(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
            >
              <option value="">-- Pilih Lantai --</option>
              {lantaiList.map((l: any) => {
                const id = l.id_lantai ?? l.id ?? l.id?.Int64 ?? 0;
                const noLantai = l.no_lantai ?? l.no_lantai?.Int64 ?? id;
                return (
                  <option key={id} value={id}>
                    Lantai {noLantai} - {l.jenis_doc || "N/A"}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Form */}
        {!hapus && (tambah || ubah || id_lantai) && (
          <div className="mt-6 bg-white border rounded-lg shadow p-6 max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nomor Lantai
                </label>
                <input
                  id="no_lantai"
                  type="number"
                  value={formData.no_lantai ?? ""}
                  onChange={handleInputChange}
                  className="w-full rounded border px-3 py-2 text-sm text-black"
                  required
                  min={1}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Jenis DOC
                </label>
                <select
                  id="jenis_doc"
                  value={formData.jenis_doc}
                  onChange={handleInputChange}
                  className="w-full rounded border px-3 py-2 text-sm text-black"
                  required
                >
                  <option value="" disabled>
                    -- Pilih Jenis DOC --
                  </option>
                  {JENIS_DOC_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Populasi
                </label>
                <input
                  id="populasi"
                  type="number"
                  value={formData.populasi ?? ""}
                  onChange={handleInputChange}
                  className="w-full rounded border px-3 py-2 text-sm text-black"
                  required
                  min={1}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tanggal Masuk
                </label>
                <input
                  id="tgl_masuk"
                  type="date"
                  value={formData.tgl_masuk}
                  onChange={handleInputChange}
                  className="w-full rounded border px-3 py-2 text-sm text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  BB Monitoring Awal
                </label>
                <input
                  id="bb_ekor"
                  type="number"
                  step="0.01"
                  value={formData.bb_ekor ?? ""}
                  onChange={handleInputChange}
                  className="w-full rounded border px-3 py-2 text-sm text-black"
                  required
                  min={0}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className={`px-5 py-2 rounded text-sm font-medium text-white ${
                    loading || (ubah && !selectedLantai)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading
                    ? "Menyimpan..."
                    : ubah || id_lantai
                      ? "Update Lantai"
                      : "Simpan Lantai"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/monitoring/kandang")}
                  className="px-5 py-2 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tombol Hapus (mode hapus) */}
        {hapus && (
          <div className="mt-6 bg-white border rounded-lg shadow p-6 max-w-xl">
            <p className="text-sm text-gray-700 mb-4">
              Data lantai yang dipilih akan dihapus secara permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={loading || !selectedLantai}
                className={`px-5 py-2 rounded text-sm font-medium text-white ${
                  loading || !selectedLantai
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Menghapus..." : "Hapus Lantai"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/monitoring/kandang")}
                className="px-5 py-2 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-500 max-w-xl leading-relaxed">
          {tambah && "Pastikan data populasi dan tanggal masuk sudah benar."}
          {ubah && "Pilih lantai dari dropdown untuk mengubah data."}
          {hapus && "Pilih lantai dari dropdown lalu klik Hapus Lantai."}
        </div>
      </div>
    </div>
  );
}

export default function FormLantaiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-white">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Memuat form...
          </div>
        </div>
      }
    >
      <FormLantaiContent />
    </Suspense>
  );
}
