"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

type AnyObj = any;

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

const latestByUmur = (arr: AnyObj[]) =>
  (arr || []).reduce(
    (latest: AnyObj | null, curr: AnyObj) =>
      num(curr?.umur) > num(latest?.umur) ? curr : latest,
    null as AnyObj | null,
  );

export default function MonitoringPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Data dari backend
  const [data, setData] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<{
    username: string;
    email: string;
    picture: string;
  }>({
    username: "",
    email: "",
    picture: "",
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [isDeplesiModalOpen, setIsDeplesiModalOpen] = useState(false);
  const [deplesiModalData, setDeplesiModalData] = useState<any[]>([]);
  const [isPersentaseModalOpen, setIsPersentaseModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Selection states
  const [selectedLantai, setSelectedLantai] = useState<number | null>(null);
  const [selectedMonit, setSelectedMonit] = useState<any>(null);
  const [selectedKandang, setSelectedKandang] = useState<number | null>(null);

  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token") ?? "";
    const name =
      localStorage.getItem("user_name") ?? localStorage.getItem("name") ?? "";
    const email =
      localStorage.getItem("user_email") ?? localStorage.getItem("email") ?? "";
    const picture =
      localStorage.getItem("user_picture") ??
      localStorage.getItem("picture") ??
      "";
    const tokenExpiration = localStorage.getItem("token_expiration");

    setUserInfo({ username: name, email, picture });

    if (
      !token ||
      (tokenExpiration && Date.now() > parseInt(tokenExpiration, 10)) ||
      !email
    ) {
      localStorage.clear();
      router.push("/login");
      return;
    }

    setIsLoading(true);
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/index?email=${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("API data ->", res.data);
        setData(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching monitoring data:", err);
        setData([]);
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  // Util: total sisa ayam terbaru
  const getTotalSisaAyam = (rows: any[]) =>
    rows.reduce((total, kandang) => {
      const lantaiArr = kandang.lantai || [];
      const totalPerKandang = lantaiArr.reduce(
        (lantaiTotal: number, l: AnyObj) => {
          const monit = Array.isArray(l?.monit) ? l.monit : [];
          if (monit.length === 0) return lantaiTotal + num(l?.populasi);
          const latest = latestByUmur(monit);
          const sisa = num(latest?.sisa_ayam);
          return lantaiTotal + (sisa || num(l?.populasi));
        },
        0,
      );
      return total + totalPerKandang;
    }, 0);

  const getTotalDeplesi = (rows: any[]) =>
    rows.reduce((total, kandang) => {
      const lantaiArr = kandang.lantai || [];
      const totalPerKandang = lantaiArr.reduce(
        (lantaiTotal: number, l: AnyObj) => {
          const monit = Array.isArray(l?.monit) ? l.monit : [];
          if (monit.length === 0) return lantaiTotal;
          const latest = latestByUmur(monit);
          return lantaiTotal + num(latest?.deplesi);
        },
        0,
      );
      return total + totalPerKandang;
    }, 0);

  const getTotalPopulasiAwal = (rows: any[]) =>
    rows.reduce((total, kandang) => {
      const lantaiArr = kandang.lantai || [];
      const totalPerKandang = lantaiArr.reduce(
        (lantaiTotal: number, l: AnyObj) => lantaiTotal + num(l?.populasi),
        0,
      );
      return total + totalPerKandang;
    }, 0);

  const filteredData = useMemo(
    () =>
      selectedKandang ? data.filter((k) => k.id === selectedKandang) : data,
    [data, selectedKandang],
  );

  const totalSisaAyam = useMemo(
    () => getTotalSisaAyam(filteredData),
    [filteredData],
  );
  const totalDeplesi = useMemo(
    () => getTotalDeplesi(filteredData),
    [filteredData],
  );
  const totalPopulasiAwal = useMemo(
    () => getTotalPopulasiAwal(filteredData),
    [filteredData],
  );
  const persenSisaAyamHidup =
    totalPopulasiAwal > 0 ? (totalSisaAyam / totalPopulasiAwal) * 100 : 0;

  const getBackgroundColor = (percentage: number) => {
    if (percentage <= 0) return "hsl(0,100%,50%)";
    if (percentage >= 100) return "hsl(120,100%,50%)";
    const hue = Math.round((percentage / 100) * 120);
    return `hsl(${hue},100%,50%)`;
  };

  // Chart labels (unique umur, sorted)
  const chartLabels = useMemo(() => {
    const labels = Array.from(
      new Set(
        filteredData.flatMap((k) =>
          (k.lantai || []).flatMap((l: AnyObj) =>
            (l.monit || []).map((m: AnyObj) => num(m.umur)),
          ),
        ),
      ),
    )
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .map((n) => `Umur ${n}`);
    return labels;
  }, [filteredData]);

  const sisaAyamChartData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: filteredData.flatMap((k) =>
        (k.lantai || []).map((l: AnyObj) => ({
          label: `Lantai ${num(l.no_lantai)} - ${k.nama}`,
          data: (l.monit || [])
            .sort((a: AnyObj, b: AnyObj) => num(a.umur) - num(b.umur))
            .map((m: AnyObj) => num(m.sisa_ayam)),
          borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255,
          )}, ${Math.floor(Math.random() * 255)}, 1)`,
          backgroundColor: `rgba(${Math.floor(
            Math.random() * 255,
          )}, ${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255,
          )}, 0.2)`,
          fill: false,
          tension: 0.2,
        })),
      ),
    }),
    [chartLabels, filteredData],
  );

  const deplesiChartData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: filteredData.flatMap((k) =>
        (k.lantai || []).map((l: AnyObj) => ({
          label: `Lantai ${num(l.no_lantai)} - ${k.nama}`,
          data: (l.monit || [])
            .sort((a: AnyObj, b: AnyObj) => num(a.umur) - num(b.umur))
            .map((m: AnyObj) => num(m.deplesi)),
          borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255,
          )}, ${Math.floor(Math.random() * 255)}, 1)`,
          backgroundColor: `rgba(${Math.floor(
            Math.random() * 255,
          )}, ${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255,
          )}, 0.2)`,
          fill: false,
          tension: 0.2,
        })),
      ),
    }),
    [chartLabels, filteredData],
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: { size: 11 },
          padding: 8,
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 10 } },
      },
      y: {
        ticks: { font: { size: 10 } },
      },
    },
  };

  // Handlers
  const handleOpenModal = () => {
    const sisaAyamPerLantai = filteredData.flatMap((k) =>
      (k.lantai || []).map((l: AnyObj) => {
        const latest =
          (l.monit || []).length > 0
            ? (l.monit as AnyObj[]).reduce(
                (latest: AnyObj | null, curr: AnyObj) =>
                  curr.umur.Int64 > (latest?.umur.Int64 || 0) ? curr : latest,
                null,
              )
            : null;
        return {
          nama: k.nama,
          lantai: l.no_lantai?.Int64 ?? "Tidak diketahui",
          sisaAyam: latest
            ? (latest.sisa_ayam?.Int64 ?? 0)
            : (l.populasi?.Int64 ?? 0),
        };
      }),
    );
    setModalData(sisaAyamPerLantai);
    setIsModalOpen(true);
  };

  const handleOpenDeplesiModal = () => {
    const deplesiPerLantai = filteredData.flatMap((k) =>
      (k.lantai || []).map((l: AnyObj) => {
        const latest =
          (l.monit || []).length > 0
            ? (l.monit as AnyObj[]).reduce(
                (latest: AnyObj | null, curr: AnyObj) =>
                  curr.umur.Int64 > (latest?.umur.Int64 || 0) ? curr : latest,
                null,
              )
            : null;
        return {
          nama: k.nama,
          lantai: l.no_lantai?.Int64 ?? "Tidak diketahui",
          deplesi: latest?.deplesi?.Int64 ?? 0,
        };
      }),
    );
    setDeplesiModalData(deplesiPerLantai);
    setIsDeplesiModalOpen(true);
  };

  const handleLantaiChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const lantaiId = parseInt(event.target.value, 10);
    setSelectedLantai(isNaN(lantaiId) ? null : lantaiId);
    const lantai = data
      .flatMap((k: AnyObj) => k.lantai || [])
      .find((l: AnyObj) => l.id?.Int64 === lantaiId);
    if (lantai && (lantai.monit || []).length > 0) {
      const latest = (lantai.monit as AnyObj[]).reduce(
        (latest: AnyObj | null, curr: AnyObj) =>
          curr.umur.Int64 > (latest?.umur.Int64 || 0) ? curr : latest,
        null,
      );
      setSelectedMonit(latest);
    } else {
      setSelectedMonit(null);
    }
  };

  const handleKandangChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const kandangId = parseInt(event.target.value, 10);
    setSelectedKandang(isNaN(kandangId) ? null : kandangId);
  };

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col md:flex-row bg-white min-h-svh">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
            <p className="mb-4 text-base sm:text-lg text-gray-700">
              Belum ada data kandang.
            </p>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm sm:text-base"
              onClick={() => router.push("/monitoring/inisiasi")}
            >
              Inisiasi Kandang
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log("Rendered with data:", data);

  return (
    <div className="flex flex-col md:flex-row bg-white min-h-svh">
      <Sidebar />
      <div className="flex-1 w-full">
        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Header Section */}
          <div className="border-b pb-4 mb-6">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
                Monitoring Chick-A
              </h1>
              <button
                onClick={() => setIsInfoModalOpen(true)}
                className="p-2 hover:bg-blue-100 rounded-full transition"
              >
                <svg
                  className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6 hover:text-blue-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </button>
            </div>
            <h2 className="text-sm sm:text-base text-gray-600">
              Selamat Datang,{" "}
              <span className="font-semibold text-black">
                {userInfo.username}
              </span>
              !
            </h2>
          </div>

          {/* Filter Kandang */}
          <div className="mb-6">
            <label
              htmlFor="kandang"
              className="block mb-2 text-xs sm:text-sm font-semibold text-gray-900"
            >
              Pilih Kandang
            </label>
            <select
              id="kandang"
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
              onChange={handleKandangChange}
              defaultValue=""
            >
              <option value="">Semua Kandang</option>
              {data.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Stat cards - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-8">
            <div className="bg-gray-200 p-3 sm:p-4 rounded-lg shadow-md">
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Kandang
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-black mt-1">
                {filteredData.length}
              </p>
            </div>
            <div
              className="bg-green-500 p-3 sm:p-4 rounded-lg shadow-md cursor-pointer hover:bg-green-600 transition"
              onClick={handleOpenModal}
            >
              <p className="text-xs sm:text-sm text-black truncate">
                Sisa Ayam
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-black mt-1">
                {(totalSisaAyam / 1000).toFixed(1)}K
              </p>
            </div>
            <div
              className="bg-red-500 p-3 sm:p-4 rounded-lg shadow-md cursor-pointer hover:bg-red-600 transition"
              onClick={handleOpenDeplesiModal}
            >
              <p className="text-xs sm:text-sm text-black truncate">Deplesi</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-black mt-1">
                {totalDeplesi}
              </p>
            </div>
            <div
              className="p-3 sm:p-4 rounded-lg shadow-md cursor-pointer transition hover:opacity-90"
              style={{
                backgroundColor: getBackgroundColor(persenSisaAyamHidup),
              }}
              onClick={() => setIsPersentaseModalOpen(true)}
            >
              <p className="text-xs sm:text-sm text-black truncate">Hidup %</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-black mt-1">
                {persenSisaAyamHidup.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Charts - Responsive */}
          <div className="space-y-6 mb-8">
            {/* Chart 1 */}
            <div className="bg-gray-100 p-3 sm:p-4 rounded-lg shadow-md">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-black mb-3">
                Grafik Sisa Ayam
              </h2>
              <div className="h-48 sm:h-64 md:h-80">
                <Line
                  data={sisaAyamChartData as any}
                  options={chartOptions as any}
                />
              </div>
            </div>

            {/* Chart 2 */}
            <div className="bg-gray-100 p-3 sm:p-4 rounded-lg shadow-md">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-black mb-3">
                Grafik Deplesi
              </h2>
              <div className="h-48 sm:h-64 md:h-80">
                <Line
                  data={deplesiChartData as any}
                  options={chartOptions as any}
                />
              </div>
            </div>
          </div>

          {/* Select Lantai */}
          <div className="mb-6">
            <label
              htmlFor="lantai"
              className="block mb-2 text-xs sm:text-sm font-semibold text-gray-900"
            >
              Pilih Lantai untuk dipantau
            </label>
            <select
              id="lantai"
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
              onChange={handleLantaiChange}
              defaultValue=""
            >
              <option value="">Pilih Lantai</option>
              {data.flatMap((k) =>
                (k.lantai || []).map((l: AnyObj) => (
                  <option key={l.id?.Int64} value={l.id?.Int64}>
                    Lantai {l.no_lantai?.Int64}, kandang {k.nama}
                  </option>
                )),
              )}
            </select>
          </div>

          {/* Spotlight - Responsive */}
          {selectedMonit ? (
            <div className="bg-white border rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-black flex items-center gap-2">
                  Spotlight Lantai
                  <button
                    onClick={() => setIsInfoModalOpen(true)}
                    className="p-1 hover:bg-blue-100 rounded-full"
                  >
                    <svg
                      className="text-blue-400 w-4 h-4 hover:text-blue-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                  </button>
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 text-black">
                <div className="bg-blue-50 p-3 rounded">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600">
                    IP
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-blue-600 mt-1">
                    {selectedMonit.ip?.Float64?.toFixed(0) ?? "-"}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600">
                    FCR
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-purple-600 mt-1">
                    {selectedMonit.fcr?.Float64?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600">
                    ADG/PBBH
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-orange-600 mt-1">
                    {selectedMonit.adg_pbbh?.Float64?.toFixed(0) ?? "-"}
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600">
                    Deplesi %
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-red-600 mt-1">
                    {selectedMonit.deplesi_persen?.Float64?.toFixed(2) ?? "-"}%
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600">
                    Feed Intake
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-green-600 mt-1">
                    {selectedMonit.gr_ekor_hari?.Float64?.toFixed(1) ?? "-"}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600">
                    Cum Konsumsi
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-indigo-600 mt-1">
                    {selectedMonit.cum_kons_pakan?.Float64?.toFixed(0) ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500 text-sm sm:text-base">
              Pilih lantai untuk melihat data monit terbaru.
            </p>
          )}
        </div>
      </div>

      {/* Modal Sisa Ayam */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-96 overflow-y-auto">
            <h2 className="text-base sm:text-lg text-black font-bold mb-4">
              Detail Sisa Ayam per Lantai
            </h2>
            <ul className="space-y-2">
              {modalData.map((item, idx) => (
                <li
                  key={idx}
                  className="flex justify-between text-black text-xs sm:text-sm p-2 bg-gray-50 rounded"
                >
                  <span className="truncate">
                    Lantai {item.lantai} ({item.nama})
                  </span>
                  <span className="font-semibold ml-2">
                    {(item.sisaAyam / 1000).toFixed(1)}K
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Deplesi */}
      {isDeplesiModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-96 overflow-y-auto">
            <h2 className="text-base sm:text-lg text-black font-bold mb-4">
              Detail Deplesi per Lantai
            </h2>
            <ul className="space-y-2">
              {deplesiModalData.map((item, idx) => (
                <li
                  key={idx}
                  className="flex justify-between text-black text-xs sm:text-sm p-2 bg-gray-50 rounded"
                >
                  <span className="truncate">
                    Lantai {item.lantai} ({item.nama})
                  </span>
                  <span className="font-semibold ml-2">{item.deplesi}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setIsDeplesiModalOpen(false)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Persentase */}
      {isPersentaseModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-base sm:text-lg text-black font-bold mb-4">
              Persentase Ayam Hidup
            </h2>
            <div className="space-y-3">
              {[
                { label: "90%", value: 90 },
                { label: "70%", value: 70 },
                { label: "50%", value: 50 },
              ].map((item) => (
                <div key={item.value} className="flex items-center gap-3">
                  <p className="text-base sm:text-lg font-bold text-black w-12">
                    {item.label}
                  </p>
                  <div
                    className="flex-1 h-8 sm:h-10 rounded-md shadow-md"
                    style={{
                      backgroundColor: getBackgroundColor(item.value),
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-black font-medium mt-4">
              Pertahankan kesehatan ayam kalian yaa 🐓
            </p>
            <button
              onClick={() => setIsPersentaseModalOpen(false)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Info */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-base sm:text-lg text-black font-bold mb-4">
              Keterangan
            </h2>
            <div className="space-y-3 text-black">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  Deplesi
                </p>
                <p className="text-xs text-gray-600 text-justify mt-1">
                  Deplesi ayam adalah penyusutan populasi karena kematian dan
                  culling.
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  FCR (Feed Conversion Ratio)
                </p>
                <p className="text-xs text-gray-600 text-justify mt-1">
                  Rasio pakan terhadap bobot badan. Semakin rendah FCR semakin
                  efisien.
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  IP (Indeks Performance)
                </p>
                <p className="text-xs text-gray-600 text-justify mt-1">
                  Indeks kinerja produksi. Ideal 300–350, makin tinggi makin
                  baik.
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  ADG/PBBH
                </p>
                <p className="text-xs text-gray-600 text-justify mt-1">
                  Pertambahan berat harian rata-rata; lebih tinggi menandakan
                  pertumbuhan optimal.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
