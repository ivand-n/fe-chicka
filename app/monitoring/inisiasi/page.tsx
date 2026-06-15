"use client";
import Sidebar from "@/app/components/Sidebar";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import axios from "axios";

const JENIS_DOC_OPTIONS = ["Cobb", "Ross", "Hubbard", "Arbor Acres"];

type Monit = {
  umur: number;
  mati: number | null;
  culing: number | null;
  konsumsi: number | null;
  bb_ekor: number | null;
};

type Lantai = {
  no_lantai: number;
  jenisDOC: string;
  populasi: number | null;
  tgl_masuk: string;
  monit: Monit[];
};

type Kandang = {
  nama: string;
  tingkat: number | null;
  kapasitas: number | null;
  alamat: string;
  pemilik: string;
};

type FormData = {
  kandang: Kandang;
  lantai: Lantai[];
  users: string[]; // untuk relasi N-N
};

export default function InisiasiPage() {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState({
    username: "",
    email: "",
  });

  const [formData, setFormData] = useState<FormData>({
    kandang: {
      nama: "",
      tingkat: null,
      kapasitas: null,
      alamat: "",
      pemilik: "",
    },
    lantai: [
      {
        no_lantai: 1,
        jenisDOC: "",
        populasi: null,
        tgl_masuk: "",
        monit: [
          {
            umur: 0,
            mati: null,
            culing: null,
            konsumsi: null,
            bb_ekor: null,
          },
        ],
      },
    ],
    users: [], // akan diisi dengan email user
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token") ?? "";
    const name =
      localStorage.getItem("user_name") ?? localStorage.getItem("name") ?? "";
    const email =
      localStorage.getItem("user_email") ?? localStorage.getItem("email") ?? "";
    const tokenExpiration = localStorage.getItem("token_expiration");

    if (
      !token ||
      (tokenExpiration && Date.now() > parseInt(tokenExpiration, 10))
    ) {
      localStorage.clear();
      router.push("/login");
      return;
    }

    setUserInfo({ username: name, email });

    // Set pemilik & users default
    setFormData((prev) => ({
      ...prev,
      kandang: { ...prev.kandang, pemilik: email },
      users: [email], // default owner
    }));
  }, [router]);

  const handleKandangChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    let processedValue: string | number | null = value;

    if (id === "tingkat") {
      let tingkat = parseInt(value, 10);
      if (tingkat > 3) {
        alert("Maksimal tingkat adalah 3!");
        tingkat = 3;
      } else if (tingkat < 1) {
        tingkat = 1;
      }
      processedValue = tingkat;

      // Update jumlah lantai berdasarkan tingkat
      const currentLantaiCount = formData.lantai.length;
      const targetLantaiCount = tingkat;

      if (targetLantaiCount > currentLantaiCount) {
        // Tambah lantai
        const newLantai = [...formData.lantai];
        for (let i = currentLantaiCount + 1; i <= targetLantaiCount; i++) {
          newLantai.push({
            no_lantai: i,
            jenisDOC: "",
            populasi: null,
            tgl_masuk: "",
            monit: [
              {
                umur: 0,
                mati: null,
                culing: null,
                konsumsi: null,
                bb_ekor: null,
              },
            ],
          });
        }
        setFormData((prev) => ({ ...prev, lantai: newLantai }));
      } else if (targetLantaiCount < currentLantaiCount) {
        // Kurangi lantai
        setFormData((prev) => ({
          ...prev,
          lantai: prev.lantai.slice(0, targetLantaiCount),
        }));
      }
    } else if (id === "kapasitas") {
      processedValue = parseInt(value, 10) || null;
    }

    setFormData((prev) => ({
      ...prev,
      kandang: {
        ...prev.kandang,
        [id]: processedValue,
      },
    }));
  };

  const handleLantaiChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => {
      const lantai = [...prev.lantai];
      lantai[index] = { ...lantai[index], [id]: value };

      if (id === "populasi") {
        lantai[index] = { ...lantai[index], [id]: parseInt(value, 10) || null };
      } else {
        lantai[index] = { ...lantai[index], [id]: value };
      }

      return { ...prev, lantai };
    });
  };

  const handleMonitChange = (
    lantaiIndex: number,
    monitIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { id, value } = e.target;
    const updatedLantai = [...formData.lantai];
    const currentMonit = { ...updatedLantai[lantaiIndex].monit[monitIndex] };

    if (id === "bb_ekor") {
      currentMonit[id] = parseFloat(value) || null;
    } else if (["umur", "mati", "culing", "konsumsi"].includes(id)) {
      currentMonit[id as keyof Monit] = parseInt(value, 10);
    } else {
      (currentMonit as any)[id] = value;
    }

    updatedLantai[lantaiIndex].monit[monitIndex] = currentMonit;
    setFormData((prev) => ({ ...prev, lantai: updatedLantai }));
  };

  const addLantai = () => {
    setFormData((prev) => ({
      ...prev,
      lantai: [
        ...prev.lantai,
        {
          no_lantai: prev.lantai.length + 1,
          jenisDOC: "",
          populasi: null,
          tgl_masuk: "",
          monit: [
            {
              umur: 0,
              mati: null,
              culing: null,
              konsumsi: null,
              bb_ekor: null,
            },
          ],
        },
      ],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    if (!formData.kandang.nama || !formData.kandang.tingkat) {
      alert("Nama kandang dan tingkat wajib diisi!");
      return;
    }

    for (const lantai of formData.lantai) {
      if (!lantai.jenisDOC || !lantai.populasi || !lantai.tgl_masuk) {
        alert(`Lengkapi data untuk Lantai ${lantai.no_lantai}`);
        return;
      }
      for (const monit of lantai.monit) {
        if (monit.bb_ekor === null) {
          alert(`BB/Ekor wajib diisi untuk Lantai ${lantai.no_lantai}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const token =
        localStorage.getItem("auth_token") ?? localStorage.getItem("token");
      const payload = {
        kandang: formData.kandang,
        lantai: formData.lantai,
        users: userInfo.email, // kirim array email user
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/inisiasi?email=${userInfo.email}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert("Data berhasil disimpan!");
      router.push("/monitoring");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      alert(
        `Terjadi kesalahan: ${
          error.response?.data || error.message || "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-white min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-64 mt-10 container mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Monitoring Chick-A
        </h1>
        <div className="flex items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">
              Selamat Datang, {userInfo.username}!
            </h2>
            <h3 className="text-gray-600">Form Tambah Kandang</h3>
          </div>
        </div>

        {/* Breadcrumb optional */}
        <nav className="flex mb-4 text-sm text-gray-600">
          <span
            className="hover:underline cursor-pointer"
            onClick={() => router.push("/monitoring")}
          >
            Monitoring
          </span>
          <span className="mx-2">/</span>
          <span className="text-gray-800 font-semibold">Inisiasi</span>
        </nav>

        <div className="shadow-lg rounded-lg bg-white p-6">
          <form onSubmit={handleSubmit}>
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
              Tambah Kandang
            </h1>

            {/* Form Kandang */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kandang <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nama"
                value={formData.kandang.nama}
                onChange={handleKandangChange}
                className="border border-gray-300 text-black rounded p-2 w-full focus:ring-2 focus:ring-orange-400 focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tingkat (1-3) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="tingkat"
                value={formData.kandang.tingkat || ""}
                onChange={handleKandangChange}
                className="border border-gray-300 text-black rounded p-2 w-full focus:ring-2 focus:ring-orange-400 focus:outline-none"
                min="1"
                max="5"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kapasitas (opsional)
              </label>
              <input
                type="number"
                id="kapasitas"
                value={formData.kandang.kapasitas || ""}
                onChange={handleKandangChange}
                className="border border-gray-300 text-black rounded p-2 w-full focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat
              </label>
              <textarea
                id="alamat"
                value={formData.kandang.alamat}
                onChange={handleKandangChange}
                className="border border-gray-300 text-black rounded p-2 w-full focus:ring-2 focus:ring-orange-400 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pemilik
              </label>
              <input
                type="text"
                id="pemilik"
                value={userInfo.email}
                className="border border-gray-300 text-black rounded p-2 w-full bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>

            {/* Form Lantai */}
            <h2 className="text-lg font-semibold mt-8 mb-4 text-gray-800">
              Lantai
            </h2>
            {formData.lantai.map((lantai, index) => {
              const selectedJenis = JENIS_DOC_OPTIONS.includes(lantai.jenisDOC)
                ? lantai.jenisDOC
                : lantai.jenisDOC
                ? "__custom__"
                : "";
              return (
                <div
                  key={index}
                  className="border border-gray-200 p-4 rounded-lg mb-4 bg-gray-50"
                >
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Lantai {lantai.no_lantai}
                  </h3>

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jenis DOC <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="jenisDOC"
                    value={selectedJenis}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        // tampilkan input custom di bawah
                        // setShowCustomJenis(true);
                        handleLantaiChange(index, e);
                      } else {
                        // setShowCustomJenis(false);
                        handleLantaiChange(index, e);
                      }
                    }}
                    className="border border-gray-300 text-black rounded p-2 w-full mb-3 focus:ring-2 focus:ring-orange-400 focus:outline-none"
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

                  {selectedJenis === "__custom__" && (
                    <input
                      type="text"
                      id="jenisDOC"
                      value={lantai.jenisDOC}
                      onChange={(e) => handleLantaiChange(index, e)}
                      className="border border-gray-300 text-black rounded p-2 w-full mb-3 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                      placeholder="Tuliskan jenis DOC"
                      required
                    />
                  )}

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Populasi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="populasi"
                    value={lantai.populasi || ""}
                    onChange={(e) => handleLantaiChange(index, e)}
                    className="border border-gray-300 text-black rounded p-2 w-full mb-3 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    required
                  />

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Masuk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="tgl_masuk"
                    value={lantai.tgl_masuk}
                    onChange={(e) => handleLantaiChange(index, e)}
                    className="border border-gray-300 text-black rounded p-2 w-full mb-4 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    required
                  />

                  {/* Form Monit */}
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Monitoring Awal
                  </h4>
                  {lantai.monit.map((monit, monitIndex) => (
                    <div key={monitIndex} className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Berat / Ekor (Gr) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="bb_ekor"
                        value={monit.bb_ekor || ""}
                        onChange={(e) => handleMonitChange(index, monitIndex, e)}
                        className="border border-gray-300 text-black rounded p-2 w-full focus:ring-2 focus:ring-orange-400 focus:outline-none"
                        step="0.01"
                        required
                      />
                    </div>
                  ))}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLantai}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded mb-4 transition-colors"
            >
              + Tambah Lantai Manual
            </button>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                } text-white font-semibold px-6 py-2 rounded transition-colors`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
