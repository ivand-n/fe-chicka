"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
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

function LantaiMonitoringPageContent() {
  const { kandangId, lantaiId } = useParams() as {
    kandangId: string;
    lantaiId: string;
  };

  type predictRow = {
    monit_id: number;
    umur: number;
    date?: string;
    predict: number;
    anomali: number;
    score: number;
  };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [kandang, setKandang] = useState<any>(null);
  const [lantai, setLantai] = useState<any>(null);
  const [userInfo, setUserInfo] = useState({ username: "", email: "" });
  const [selectedMetric, setSelectedMetric] = useState<string>("sisa_ayam");
  const [showInfo, setShowInfo] = useState(false);
  const [prediksi, setPrediksi] = useState<{ fcr?: number[] }>({});
  const [predictList, setPredictList] = useState<predictRow[]>([]);
  const [showAllMonit, setShowAllMonit] = useState(false);
  const [showAllAnomai, setShowAllAnomai] = useState(false);

  const metricOptions = [
    { value: "sisa_ayam", label: "Sisa Ayam" },
    { value: "deplesi", label: "Deplesi" },
    { value: "deplesi_persen", label: "Deplesi (%)" },
    { value: "dh", label: "Daya Hidup (%)" },
    { value: "bb_ekor", label: "BB/Ekor (Gr)" },
    { value: "gr_ekor_hari", label: "gr/Ekor/Hari" },
    { value: "konsumsi", label: "Konsumsi (Kg)" },
    { value: "cum_pakan", label: "Cum Pakan" },
    { value: "cum_kons_pakan", label: "Cum Konsumsi Pakan" },
    { value: "karung", label: "Karung" },
    { value: "dg", label: "DG (Gr)" },
    { value: "adg_pbbh", label: "ADG / PBBH" },
    { value: "tonase", label: "Tonase (Kg)" },
    { value: "fcr", label: "FCR" },
    { value: "ip", label: "IP" },
    { value: "ep", label: "EP (%)" },
  ];

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

    setLoading(true);
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/kandang/${kandangId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const kd = res.data;
        setKandang(kd);
        const lant =
          (kd.lantai || []).find(
            (l: AnyObj) =>
              `${l.id}` === lantaiId ||
              `${l.id_lantai}` === lantaiId ||
              `${l.id?.Int64}` === lantaiId,
          ) || null;
        setLantai(lant);
      })
      .catch(() => {
        setKandang(null);
        setLantai(null);
      })
      .finally(() => setLoading(false));
  }, [kandangId, lantaiId, router]);

  console.log("data", kandang, lantai);
  const monit = useMemo(
    () =>
      Array.isArray(lantai?.monit)
        ? [...lantai.monit].sort(
            (a: AnyObj, b: AnyObj) => num(a.umur) - num(b.umur),
          )
        : [],
    [lantai],
  );

  const latest = monit.length ? monit[monit.length - 1] : null;

  const chartData = useMemo(() => {
    return {
      labels: monit.map((m: AnyObj) => `Umur ${num(m.umur)}`),
      datasets: [
        {
          label:
            metricOptions.find((m) => m.value === selectedMetric)?.label ||
            selectedMetric,
          data: monit.map((m: AnyObj) => num(m[selectedMetric])),
          borderColor: "rgba(255,125,0,0.9)",
          backgroundColor: "rgba(255,125,0,0.25)",
          tension: 0.25,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [monit, selectedMetric]);

  const anomalyCount = predictList.filter((p) => p.anomali === -1).length;
  const summaryCards = [
    {
      label: "Sisa Ayam",
      value: latest
        ? num(latest.sisa_ayam).toLocaleString("id-ID") + " ekor"
        : "-",
      color: "bg-emerald-500",
    },
    {
      label: "Deplesi",
      value: latest ? num(latest.deplesi_persen).toFixed(2) + " %" : "-",
      color: "bg-red-500",
    },
    {
      label: "FCR",
      value: latest ? num(latest.fcr).toFixed(2) : "-",
      color: "bg-indigo-500",
    },
    {
      label: "IP",
      value: latest ? num(latest.ip).toFixed(0) : "-",
      color: "bg-orange-500",
    },
    {
      label: "Anomali",
      value: `${anomalyCount} data`,
      color: "bg-rose-500",
    },
  ];

  const HandlePanenLantai = (id_lantai: string) => {
    if (confirm("Yakin ingin melakukan panen pada lantai ini?")) {
      try {
        const token =
          localStorage.getItem("auth_token") ?? localStorage.getItem("token");
        if (!token) {
          alert("Token tidak ditemukan. Silakan login kembali.");
          router.push("/login");
          return;
        }
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/csv/${kandangId}/${id_lantai}?token=${token}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.error("Error saat panen lantai:", err);
        alert("Gagal melakukan panen!");
      }
    }
  };

  // Fetch final prediction
  useEffect(() => {
    if (!lantai?.monit || lantai.monit.length === 0) return;

    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token") ?? "";

    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prediksi/${lantai.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((res) => {
        setPredictList(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setPredictList([]));
  }, [lantai]);

    const displayedMonit = useMemo(() => {
      if (showAllMonit) return monit;
      // Tampilkan 5 data terbaru di mobile/tablet
      return monit.slice(-5);
    }, [monit, showAllMonit]);

    // Tentukan data prediksi yang ditampilkan
    const displayedPredict = useMemo(() => {
      if (showAllAnomai) {
        return predictList.sort((a, b) => a.umur - b.umur);
      }
      // Tampilkan 5 data terbaru di mobile/tablet
      return predictList.sort((a, b) => a.umur - b.umur).slice(-5);
    }, [predictList, showAllAnomai]);

  const predictMap = useMemo(() => {
    const map = new Map<
      number,
      { predict: number; anomali: number; score: number }
    >();
    predictList.forEach((a) =>
      map.set(a.monit_id, {
        predict: a.predict,
        anomali: a.anomali,
        score: a.score,
      }),
    );
    return map;
  }, [predictList]);

  const latestPredict = useMemo(() => {
    if (!predictList.length) return null;
    return predictList.reduce<predictRow | null>(
      (best, cur) => (!best || cur.umur > best.umur ? cur : best),
      null,
    );
  }, [predictList]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!lantai || !kandang) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-600">
            Data lantai tidak ditemukan atau belum ada.
          </p>
          <button
            onClick={() => router.push("/monitoring")}
            className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium"
          >
            Kembali ke Monitoring
          </button>
        </div>
      </div>
    );
  }

  const isActive =
    kandang.status === 0 ||
    kandang.status?.Int64 === 0 ||
    kandang.status === false;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto">
        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Kandang {kandang.nama} • Lantai {lantai.no_lantai}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 space-y-1">
              <span className="block">
                Jenis DOC:{" "}
                <span className="font-medium text-gray-700">
                  {lantai.jenis_doc || "-"}
                </span>
              </span>
              <span className="block">
                Populasi Awal:{" "}
                <span className="font-medium text-gray-700">
                  {num(lantai.populasi).toLocaleString("id-ID")}
                </span>{" "}
                • Masuk:{" "}
                <span className="font-medium text-gray-700">
                  {lantai.tgl_masuk
                    ? new Date(lantai.tgl_masuk).toLocaleDateString("id-ID")
                    : "-"}
                </span>
              </span>
            </p>
          </div>

          {/* Buttons - Responsive Grid */}
          <div className="flex flex-wrap gap-2">
            {isActive && (
              <>
                <button
                  onClick={() =>
                    router.push(
                      `/monitoring/conclusion/${kandangId}/${lantaiId}`,
                    )
                  }
                  className="px-2 sm:px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  📊 Kesimpulan
                </button>
                <button
                  onClick={() =>
                    router.push(
                      `/monitoring/form/monit?id_kandang=${kandang.id}&id_lantai=${lantai.id}`,
                    )
                  }
                  className="px-2 sm:px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap"
                >
                  + Monitoring
                </button>
                <button
                  onClick={() =>
                    latest &&
                    router.push(
                      `/monitoring/form/penjarangan?id_kandang=${
                        kandang.id
                      }&id_lantai=${lantai.id}&id_monit=${
                        latest.id_monit || latest.id
                      }&umur=${latest.umur}&bbekor=${latest.bb_ekor}`,
                    )
                  }
                  disabled={!latest}
                  className={`px-2 sm:px-4 py-2 rounded text-xs font-medium whitespace-nowrap ${
                    latest
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  + Penjarangan
                </button>
                <button
                  onClick={() =>
                    router.push(
                      `/monitoring/form/ovk?id_kandang=${kandang.id}&id_lantai=${lantai.id}`,
                    )
                  }
                  className="px-2 sm:px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium whitespace-nowrap"
                >
                  + OVK
                </button>
                <button
                  onClick={() => HandlePanenLantai(lantaiId)}
                  className="px-2 sm:px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium whitespace-nowrap"
                >
                  🎯 Panen
                </button>
              </>
            )}
            <button
              onClick={() => setShowInfo(true)}
              className="px-2 sm:px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium whitespace-nowrap"
            >
              ℹ️ Info
            </button>
          </div>
        </div>

        {/* Summary Cards - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-6">
          {summaryCards.map((c) => (
            <div
              key={c.label}
              className={`${c.color} rounded-lg shadow p-3 sm:p-4 text-white`}
            >
              <p className="text-[10px] sm:text-xs uppercase tracking-wide">
                {c.label}
              </p>
              <p className="text-base sm:text-lg md:text-xl font-semibold mt-1 truncate">
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Prediksi Card */}
        <div className="mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide">
                Prediksi Performa Saat Panen
              </h3>
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 opacity-75"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12 7a1 1 0 110-2h.01a1 1 0 110 2H12zm-3.5 5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zm6-4a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs opacity-80">Score Performa</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {latestPredict?.predict ?? "-"}
                </p>
              </div>
              <div className="bg-white/20 rounded px-3 py-2 text-xs">
                {latestPredict?.predict ? (
                  latestPredict.predict > 0 ? (
                    <span>✓ Performa Baik</span>
                  ) : (
                    <span>⚠ Performa Perlu Perhatian</span>
                  )
                ) : (
                  <span>Data prediksi belum tersedia</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPIs - Responsive Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {[
            { k: "bb_ekor", label: "Berat Ekor (Gr)", decimals: 0 },
            { k: "adg_pbbh", label: "ADG/PBBH (Gr)", decimals: 2 },
            { k: "tonase", label: "Tonase (Kg)", decimals: 2 },
            {
              k: "gr_ekor_hari",
              label: "Feed Intake (Gr/Ekor/Hari)",
              decimals: 2,
            },
            {
              k: "cum_kons_pakan",
              label: "Feed Intake Kumulatif",
              decimals: 2,
            },
            { k: "ep", label: "EP (%)", decimals: 2 },
          ].map((m) => (
            <div
              key={m.k}
              className="bg-gray-50 hover:bg-gray-100 border rounded-lg p-2 sm:p-3 text-center"
            >
              <p className="text-[9px] sm:text-[11px] text-gray-500 leading-tight">
                {m.label}
              </p>
              <p className="text-sm sm:text-base font-semibold text-gray-800 mt-1">
                {latest ? num(latest[m.k]).toFixed(m.decimals) : "-"}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="mt-8 bg-white border rounded-lg shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Tren{" "}
              {metricOptions.find((m) => m.value === selectedMetric)?.label}
            </h2>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {metricOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-60 sm:h-72 p-2 sm:p-4">
            {monit.length ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: false },
                  },
                  interaction: { mode: "index", intersect: false },
                  scales: {
                    x: {
                      grid: { color: "rgba(0,0,0,0.06)" },
                      ticks: { color: "#374151", font: { size: 10 } },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: "rgba(0,0,0,0.06)" },
                      ticks: { color: "#374151", font: { size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                Belum ada data monitoring
              </div>
            )}
          </div>
        </div>

        {/* Table Monitoring - Enhanced Mobile */}
        <div className="mt-8 bg-white border rounded-lg shadow overflow-hidden">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Riwayat Monitoring
            </h2>
            {/* Show more button for mobile */}
            {monit.length > 5 && (
              <button
                onClick={() => setShowAllMonit(!showAllMonit)}
                className="lg:hidden px-2 sm:px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
              >
                {showAllMonit ? "Tampilkan 5 Terbaru" : "Tampilkan Semua"}
              </button>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            {monit.length ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 border-b font-medium text-left">
                      Umur
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-left">
                      Tanggal
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-center">
                      Mati
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-center">
                      Culing
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Sisa Ayam
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      DH (%)
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      BB/Ekor (Gr)
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Konsumsi (Kg)
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Cum Pakan (Kg)
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Feed Intake (gr/Ekor/Hari)
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Feed Intake Kumulatif
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Tonase (Kg)
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      FCR
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      IP
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      EP (%)
                    </th>
                    {isActive && (
                      <th className="px-3 py-2 border-b font-medium text-center">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {monit.map((m: AnyObj, idx: number) => {
                    const isLatest = idx === monit.length - 1;
                    const anomaly = predictMap.get(m.id_monit || m.id);
                    const isAnomaly = anomaly?.anomali === -1;

                    return (
                      <tr
                        key={m.id_monit || m.id || idx}
                        className={`hover:bg-gray-50 border-b ${
                          isAnomaly ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold">
                          <div className="flex items-center gap-2">
                            {num(m.umur)}
                            {isAnomaly && (
                              <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 font-semibold">
                                Anomali
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {m.date
                            ? new Intl.DateTimeFormat("id-ID", {
                                dateStyle: "short",
                                timeZone: "Asia/Jakarta",
                              }).format(new Date(m.date))
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {num(m.mati)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {num(m.culing)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.sisa_ayam).toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {num(m.dh).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.bb_ekor).toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.konsumsi).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.cum_pakan).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.gr_ekor_hari).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.cum_kons_pakan).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.tonase).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {num(m.fcr).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {num(m.ip).toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {num(m.ep).toFixed(2)}
                        </td>
                        {isActive && (
                          <td className="px-3 py-2 text-center">
                            {isLatest && monit.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm("Hapus monitoring terbaru?")) {
                                    const token =
                                      localStorage.getItem("auth_token") ??
                                      localStorage.getItem("token");
                                    axios
                                      .delete(
                                        `${
                                          process.env.NEXT_PUBLIC_API_BASE_URL
                                        }/api/data/${lantai.id}/${
                                          m.id_monit || m.id
                                        }`,
                                        {
                                          headers: {
                                            Authorization: `Bearer ${token}`,
                                          },
                                        },
                                      )
                                      .then(() => window.location.reload())
                                      .catch(() =>
                                        alert("Gagal menghapus data."),
                                      );
                                  }
                                }}
                                className="px-3 py-1 text-xs text-red-500 hover:bg-red-50 rounded font-medium"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Belum ada data monitoring.
              </div>
            )}
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            {displayedMonit.length ? (
              <div className="divide-y">
                {displayedMonit.map((m: AnyObj, idx: number) => {
                  const isLatest = idx === displayedMonit.length - 1;
                  const anomaly = predictMap.get(m.id_monit || m.id);
                  const isAnomaly = anomaly?.anomali === -1;

                  return (
                    <div
                      key={m.id_monit || m.id || idx}
                      className={`p-4 ${isAnomaly ? "bg-red-50" : ""}`}
                    >
                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-gray-800">
                              Umur {num(m.umur)}
                            </span>
                            {isAnomaly && (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-600 font-semibold">
                                Anomali
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {m.date
                              ? new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "short",
                                  timeZone: "Asia/Jakarta",
                                }).format(new Date(m.date))
                              : "-"}
                          </p>
                        </div>
                        {isActive && isLatest && monit.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm("Hapus monitoring terbaru?")) {
                                const token =
                                  localStorage.getItem("auth_token") ??
                                  localStorage.getItem("token");
                                axios
                                  .delete(
                                    `${
                                      process.env.NEXT_PUBLIC_API_BASE_URL
                                    }/api/data/${lantai.id}/${
                                      m.id_monit || m.id
                                    }`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    },
                                  )
                                  .then(() => window.location.reload())
                                  .catch(() => alert("Gagal menghapus data."));
                              }
                            }}
                            className="px-3 py-1 text-xs text-red-500 hover:bg-red-100 rounded font-medium"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      {/* Data Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Mati / Culing
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.mati)} / {num(m.culing)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Sisa Ayam
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.sisa_ayam).toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">DH (%)</p>
                            <p className="font-semibold text-gray-800">
                              {num(m.dh).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              BB/Ekor (Gr)
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.bb_ekor).toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Konsumsi (Kg)
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.konsumsi).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Cum Pakan (Kg)
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.cum_pakan).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              gr/Ekor/Hari
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.gr_ekor_hari).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Cum Kons Pakan
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.cum_kons_pakan).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Tonase (Kg)
                            </p>
                            <p className="font-semibold text-gray-800">
                              {num(m.tonase).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">FCR</p>
                            <p className="font-bold text-indigo-600">
                              {num(m.fcr).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">IP</p>
                            <p className="font-bold text-orange-600 text-base">
                              {num(m.ip).toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">EP (%)</p>
                            <p className="font-semibold text-gray-800">
                              {num(m.ep).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                Belum ada data monitoring.
              </div>
            )}
          </div>
        </div>

        {/* Anomali Table - Enhanced Mobile */}
        <div className="mt-8 bg-white border rounded-lg shadow overflow-hidden">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Deteksi Anomali
              </h2>
              <span className="text-xs text-gray-500">
                Total: {predictList.length} | Anomali: {anomalyCount}
              </span>
            </div>
            {/* Show more button for mobile */}
            {predictList.length > 5 && (
              <button
                onClick={() => setShowAllAnomai(!showAllAnomai)}
                className="lg:hidden px-2 sm:px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded font-medium whitespace-nowrap ml-2"
              >
                {showAllAnomai ? "5 Terbaru" : "Semua"}
              </button>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            {predictList.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 border-b font-medium text-left">
                      Umur
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-left">
                      Tgl
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-center">
                      Prediksi
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-center">
                      Status Performa
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-center">
                      Status Anomali
                    </th>
                    <th className="px-3 py-2 border-b font-medium text-right">
                      Score (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {predictList
                    .sort((a, b) => a.umur - b.umur)
                    .map((pred, idx) => {
                      const isAnomaly = pred.anomali === -1;
                      const scorePercent = (pred.score * 100).toFixed(1);
                      const performanceStatus =
                        pred.predict <= 300
                          ? "Kurang"
                          : pred.predict <= 350
                            ? "Cukup"
                            : pred.predict <= 400
                              ? "Baik"
                              : "Sangat Baik";

                      return (
                        <tr
                          key={pred.monit_id || idx}
                          className={`hover:bg-gray-50 border-b ${
                            isAnomaly ? "bg-red-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-semibold">
                            {pred.umur}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {pred.date
                              ? new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "short",
                                  timeZone: "Asia/Jakarta",
                                }).format(new Date(pred.date))
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded font-semibold text-sm ${
                                pred.predict <= 300
                                  ? "bg-red-100 text-red-700"
                                  : pred.predict <= 350
                                    ? "bg-yellow-100 text-yellow-700"
                                    : pred.predict <= 400
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-green-100 text-green-700"
                              }`}
                            >
                              {pred.predict}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-medium">
                            {performanceStatus}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded font-semibold text-sm ${
                                isAnomaly
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {isAnomaly ? "⚠️ Anomali" : "✓ Normal"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {scorePercent}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Belum ada data deteksi anomali.
              </div>
            )}
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            {displayedPredict.length > 0 ? (
              <div className="divide-y">
                {displayedPredict.map((pred, idx) => {
                  const isAnomaly = pred.anomali === -1;
                  const scorePercent = (pred.score * 100).toFixed(1);
                  const performanceStatus =
                    pred.predict <= 300
                      ? "Kurang"
                      : pred.predict <= 350
                        ? "Cukup"
                        : pred.predict <= 400
                          ? "Baik"
                          : "Sangat Baik";

                  return (
                    <div
                      key={pred.monit_id || idx}
                      className={`p-4 ${isAnomaly ? "bg-red-50" : ""}`}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            Umur {pred.umur}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {pred.date
                              ? new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "short",
                                  timeZone: "Asia/Jakarta",
                                }).format(new Date(pred.date))
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Prediksi
                            </p>
                            <p
                              className={`font-bold text-base ${
                                pred.predict <= 300
                                  ? "text-red-600"
                                  : pred.predict <= 350
                                    ? "text-yellow-600"
                                    : pred.predict <= 400
                                      ? "text-blue-600"
                                      : "text-green-600"
                              }`}
                            >
                              {pred.predict}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Status Performa
                            </p>
                            <p className="font-semibold text-gray-800">
                              {performanceStatus}
                            </p>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Status Anomali
                            </p>
                            <p
                              className={`font-bold ${
                                isAnomaly
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {isAnomaly ? "⚠️ Anomali" : "✓ Normal"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[11px]">
                              Score Confidence
                            </p>
                            <p className="font-semibold text-gray-800">
                              {scorePercent}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isAnomaly
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${pred.score * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                Belum ada data deteksi anomali.
              </div>
            )}
          </div>
        </div>

        {/* OVK & Penjarangan - Mobile Optimized */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* OVK Table */}
          <div className="bg-white border rounded-lg shadow overflow-hidden">
            <div className="p-3 sm:p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-800">OVK</h3>
            </div>
            <div className="p-3 sm:p-4 overflow-x-auto">
              {Array.isArray(lantai.ovk) && lantai.ovk.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-2 py-1 text-left">Tanggal</th>
                      <th className="px-2 py-1 text-left">Nama</th>
                      <th className="px-2 py-1 text-left hidden sm:table-cell">
                        Jenis
                      </th>
                      {isActive && (
                        <th className="px-2 py-1 text-center">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lantai.ovk.map((o: AnyObj, i: number) => (
                      <tr
                        key={o.id || i}
                        className="hover:bg-gray-50 border-b text-gray-700"
                      >
                        <td className="px-2 py-1 text-xs">
                          {o.date
                            ? new Intl.DateTimeFormat("id-ID", {
                                dateStyle: "short",
                              }).format(new Date(o.date))
                            : "-"}
                        </td>
                        <td className="px-2 py-1 text-xs truncate">{o.nama}</td>
                        <td className="px-2 py-1 text-xs hidden sm:table-cell">
                          {o.jenis}
                        </td>
                        {isActive && (
                          <td className="px-2 py-1 text-center space-x-1">
                            <button
                              onClick={() =>
                                router.push(
                                  `/monitoring/form/ovk?id_kandang=${kandang.id}&id_lantai=${lantai.id}&id_ovk=${o.id}`,
                                )
                              }
                              className="text-[10px] text-yellow-600 hover:underline"
                            >
                              E
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Hapus OVK?")) {
                                  const token =
                                    localStorage.getItem("auth_token") ??
                                    localStorage.getItem("token");
                                  axios
                                    .delete(
                                      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ovk/${kandang.id}/${o.id}`,
                                      {
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                        },
                                      },
                                    )
                                    .then(() => window.location.reload())
                                    .catch(() => alert("Gagal menghapus OVK."));
                                }
                              }}
                              className="text-[10px] text-red-600 hover:underline"
                            >
                              H
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-xs">Belum ada data OVK.</p>
              )}
            </div>
          </div>

          {/* Penjarangan Table */}
          <div className="bg-white border rounded-lg shadow overflow-hidden">
            <div className="p-3 sm:p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-800">
                Penjarangan
              </h3>
            </div>
            <div className="p-3 sm:p-4 overflow-x-auto">
              {Array.isArray(lantai.penjarangan) &&
              lantai.penjarangan.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-2 py-1 text-left">Tgl</th>
                      <th className="px-2 py-1 text-left">Pembeli</th>
                      <th className="px-2 py-1 text-right">Ekor</th>
                      <th className="px-2 py-1 text-right">BW</th>
                      <th className="px-2 py-1 text-right hidden sm:table-cell">
                        Umur
                      </th>
                      {isActive && (
                        <th className="px-2 py-1 text-center">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lantai.penjarangan.map((p: AnyObj, i: number) => {
                      const umurLatest = latest ? num(latest.umur) : null;
                      const allowDelete = umurLatest === num(p.umur);
                      return (
                        <tr
                          key={p.id || i}
                          className="hover:bg-gray-50 border-b text-gray-700"
                        >
                          <td className="px-2 py-1 text-xs">
                            {p.date
                              ? new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "short",
                                }).format(new Date(p.date))
                              : "-"}
                          </td>
                          <td className="px-2 py-1 text-xs truncate">
                            {p.nama}
                          </td>
                          <td className="px-2 py-1 text-right text-xs font-semibold">
                            {p.ekor}
                          </td>
                          <td className="px-2 py-1 text-right text-xs">
                            {p.bw}
                          </td>
                          <td className="px-2 py-1 text-right text-xs hidden sm:table-cell">
                            {p.umur}
                          </td>
                          {isActive && (
                            <td className="px-2 py-1 text-center">
                              {allowDelete && (
                                <button
                                  onClick={() => {
                                    if (confirm("Hapus penjarangan?")) {
                                      const token =
                                        localStorage.getItem("auth_token") ??
                                        localStorage.getItem("token");
                                      axios
                                        .delete(
                                          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/penjarangan/${lantai.id}/${p.id}`,
                                          {
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          },
                                        )
                                        .then(() => window.location.reload())
                                        .catch(() =>
                                          alert("Gagal menghapus penjarangan."),
                                        );
                                    }
                                  }}
                                  className="text-[10px] text-red-600 hover:underline font-medium"
                                >
                                  H
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-xs">Belum ada penjarangan.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Keterangan Istilah
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
              <li>
                <span className="font-semibold">Deplesi:</span> Penyusutan
                populasi (mati + culling).
              </li>
              <li className="text-justify">
                <span className="font-semibold">Feed Intake:</span> Rata rata
                pakan yang dimakan satu ekor ayam dalam Gram (Gr). Parameter ini
                penting karena merupakan indikator nafsu makan.
              </li>
              <li>
                <span className="font-semibold">DG:</span> Pertambahan bobot
                harian (gram).
              </li>
              <li>
                <span className="font-semibold">ADG/PBBH:</span> Pertambahan
                bobot harian rata-rata (gram).
              </li>
              <li>
                <span className="font-semibold">FCR:</span> Efisiensi konversi
                pakan (lebih rendah lebih baik).
              </li>
              <li>
                <span className="font-semibold">IP:</span> Indeks performa
                produksi (target 300–350+).
              </li>
              <li>
                <span className="font-semibold">EP:</span> Efisiensi produksi.
              </li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LantaiMonitoringPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LantaiMonitoringPageContent />
    </Suspense>
  );
}
