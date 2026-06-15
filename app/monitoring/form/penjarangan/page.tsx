"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import axios from "axios";

type FormData = {
  id?: number | null;
  no: number | null;
  nama: string;
  ekor: number | null;
  bw: number | null;
  umur: number | null;
  id_lantai: number | null;
};

function FormPenjaranganContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id_kandang = searchParams.get("id_kandang");
  const id_lantai = searchParams.get("id_lantai");
  const id_monit = searchParams.get("id_monit");
  const umur = searchParams.get("umur");
  const bbekor = searchParams.get("bbekor");
  const id = searchParams.get("id");

  const [userInfo, setUserInfo] = useState({
    username: "",
    email: "",
    picture: "",
  });

  const [formData, setFormData] = useState<FormData>({
    id: id ? parseInt(id, 10) : null,
    no: null,
    nama: "",
    ekor: null,
    bw: null,
    umur: umur ? parseInt(umur, 10) : null,
    id_lantai: id_lantai ? parseInt(id_lantai, 10) : null,
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [datalantai, setDatalantai] = useState<any>(null);

  // Auth check & prefill
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

    if (!id_lantai) {
      alert("ID lantai tidak ditemukan.");
      router.push("/monitoring");
      return;
    }

    // Fetch data lantai untuk info tambahan
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/lantai/${id_kandang}/${id_lantai}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDatalantai(res.data))
      .catch(() => console.log("Gagal memuat data lantai"));

    // Jika mode edit, ambil data penjarangan
    if (id) {
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/penjarangan/${id_lantai}/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setFormData(res.data);
        })
        .catch(() => {
          alert("Gagal mengambil data Penjarangan");
        })
        .finally(() => setInitialLoading(false));
    } else {
      setInitialLoading(false);
    }
  }, [id_lantai, id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]:
        type === "number" ? (value === "" ? null : parseFloat(value)) : value,
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

    const dataToSend = {
      ...formData,
      no: formData.no !== null ? Number(formData.no) : null,
      ekor: formData.ekor !== null ? Number(formData.ekor) : null,
      bw: formData.bw !== null ? Number(formData.bw) : null,
      umur: formData.umur !== null ? Number(formData.umur) : null,
      id_lantai:
        formData.id_lantai !== null ? Number(formData.id_lantai) : null,
    };

    setLoading(true);
    try {
      if (id) {
        // Update
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/penjarangan/${id_lantai}/${id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Tambah
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/penjarangan/${id_lantai}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      router.push(
        `/monitoring/kandang/${id_kandang}/lantai/${id_lantai}?success=${
          id ? "editpenjarangan" : "tambahpenjarangan"
        }`
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
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
              {id ? "Ubah Penjarangan" : "Tambah Penjarangan"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Lantai: <span className="font-medium">{id_lantai}</span> •
              Kandang: <span className="font-medium">{id_kandang}</span>
              {umur && (
                <>
                  {" "}
                  • Umur: <span className="font-medium">{umur} hari</span>
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Pengguna</p>
            <p className="text-sm font-semibold text-gray-700 truncate">
              {userInfo.username || "-"}
            </p>
          </div>
        </div>

        {/* Info Card (optional) */}
        {datalantai && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-xl">
            <p className="text-xs text-blue-700 font-medium mb-1">
              Informasi Lantai
            </p>
            <p className="text-sm text-blue-900">
              Jenis DOC:{" "}
              <span className="font-semibold">
                {datalantai.jenis_doc || "-"}
              </span>{" "}
              • Populasi:{" "}
              <span className="font-semibold">
                {datalantai.populasi?.toLocaleString("id-ID") || "-"}
              </span>
            </p>
          </div>
        )}

        {/* Form Card */}
        <div className="mt-6 bg-white border rounded-lg shadow p-6 max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="no"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                No DO <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="no"
                value={formData.no ?? ""}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                required
                placeholder="Nomor Delivery Order"
              />
            </div>

            <div>
              <label
                htmlFor="nama"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Nama Pembeli <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nama"
                value={formData.nama}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                required
                placeholder="Nama perusahaan atau individu"
              />
            </div>

            <div>
              <label
                htmlFor="ekor"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Total Ekor <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="ekor"
                value={formData.ekor ?? ""}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2 text-sm text-black focus:ring-2 focus:ring-orange-400"
                required
                min={1}
                placeholder="Jumlah ayam yang dijual"
              />
            </div>

            <div>
              <label
                htmlFor="bw"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Berat Ekor - Gr
              </label>
              <input
                type="number"
                step="0.001"
                id="bw"
                value={formData.bw ?? ""}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2 text-sm text-black bg-gray-50"
                placeholder="Otomatis dari BB/Ekor monitoring"
              />
            </div>

            <div>
              <label
                htmlFor="umur"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Umur (Hari)
              </label>
              <input
                type="number"
                id="umur"
                value={formData.umur ?? ""}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2 text-sm text-black bg-gray-50 cursor-not-allowed"
                disabled
                placeholder="Otomatis dari monitoring terakhir"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Umur saat penjarangan dilakukan
              </p>
            </div>

            {/* Hidden field */}
            <input
              type="hidden"
              id="id_lantai"
              value={formData.id_lantai ?? ""}
            />

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 rounded text-sm font-medium text-white ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading
                  ? "Menyimpan..."
                  : id
                  ? "Update Penjarangan"
                  : "Simpan Penjarangan"}
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/monitoring/kandang/${id_kandang}/lantai/${id_lantai}`
                  )
                }
                className="px-5 py-2 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Batal
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-500 max-w-xl leading-relaxed">
          <p className="font-medium mb-1">Panduan pengisian:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>No DO: Nomor surat jalan pengiriman ayam</li>
            <li>Nama Pembeli: Nama perusahaan atau pembeli individual</li>
            <li>Total Ekor: Jumlah ayam yang dijual pada penjarangan ini</li>
            <li>BW & Umur: Otomatis terisi dari data monitoring terakhir</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
export default function FormPenjaranganPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormPenjaranganContent />
    </Suspense>
  );
}
