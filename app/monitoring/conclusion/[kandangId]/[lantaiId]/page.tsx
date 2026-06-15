"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import axios from "axios";

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

function ConclusionPageContent() {
  const { kandangId, lantaiId } = useParams() as {
    kandangId: string;
    lantaiId: string;
  };

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [kandang, setKandang] = useState<any>(null);
  const [lantai, setLantai] = useState<any>(null);
  const [predictList, setPredictList] = useState<any[]>([]);

  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") ?? localStorage.getItem("token") ?? "";
    const email =
      localStorage.getItem("user_email") ?? localStorage.getItem("email") ?? "";
    const exp = localStorage.getItem("token_expiration");

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

  // Fetch prediction data
  useEffect(() => {
    if (!lantai?.id) return;

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

  const monit = useMemo(
    () =>
      Array.isArray(lantai?.monit)
        ? [...lantai.monit].sort(
            (a: AnyObj, b: AnyObj) => num(a.umur) - num(b.umur),
          )
        : [],
    [lantai],
  );

  const conclusionSummary = useMemo(() => {
    if (monit.length === 0) return null;

    const totalMati = monit.reduce((sum, m) => sum + num(m.mati), 0);
    const totalCuling = monit.reduce((sum, m) => sum + num(m.culing), 0);
    const avgDeplesi =
      monit.reduce((sum, m) => sum + num(m.deplesi_persen), 0) / monit.length;
    const avgDH = monit.reduce((sum, m) => sum + num(m.dh), 0) / monit.length;
    const avgFCR = monit.reduce((sum, m) => sum + num(m.fcr), 0) / monit.length;
    const avgIP = monit.reduce((sum, m) => sum + num(m.ip), 0) / monit.length;
    const minBB = Math.min(...monit.map((m) => num(m.bb_ekor)));
    const maxBB = Math.max(...monit.map((m) => num(m.bb_ekor)));
    const finalBB = monit.length > 0 ? num(monit[monit.length - 1].bb_ekor) : 0;
    const finalTonase =
      monit.length > 0 ? num(monit[monit.length - 1].tonase) : 0;
    const finalSisaAyam =
      monit.length > 0 ? num(monit[monit.length - 1].sisa_ayam) : 0;
    const anomalyCount = predictList.filter((p) => p.anomali === -1).length;

    return {
      totalRecords: monit.length,
      totalMati,
      totalCuling,
      totalDeaths: totalMati + totalCuling,
      avgDeplesi,
      avgDH,
      avgFCR,
      avgIP,
      minBB,
      maxBB,
      finalBB,
      finalTonase,
      finalSisaAyam,
      anomalyCount,
      survivalRate: ((finalSisaAyam / num(lantai.populasi)) * 100).toFixed(2),
    };
  }, [monit, predictList, lantai]);

  const getConclusionStatus = (summary: any) => {
    if (!summary) return null;

    const status = {
      fcr:
        summary.avgFCR <= 1.8
          ? "Sangat Baik"
          : summary.avgFCR <= 2.0
            ? "Baik"
            : "Perlu Improvement",
      ip:
        summary.avgIP >= 380
          ? "Sangat Baik"
          : summary.avgIP >= 340
            ? "Baik"
            : "Perlu Improvement",
      dh:
        summary.avgDH >= 97
          ? "Sangat Baik"
          : summary.avgDH >= 95
            ? "Baik"
            : "Perlu Improvement",
      deplesi:
        summary.avgDeplesi <= 3
          ? "Sangat Baik"
          : summary.avgDeplesi <= 5
            ? "Baik"
            : "Perlu Improvement",
    };

    return status;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const conclusionText = `
KESIMPULAN MONITORING KESELURUHAN
=====================================

Kandang: ${kandang?.nama || "-"}
Lantai: ${lantai?.no_lantai || "-"}
Jenis DOC: ${lantai?.jenis_doc || "-"}
Tanggal Masuk: ${lantai?.tgl_masuk ? new Date(lantai.tgl_masuk).toLocaleDateString("id-ID") : "-"}
Periode Monitoring: Hari 1 - ${monit[monit.length - 1]?.umur || 0}
Tanggal Laporan: ${new Date().toLocaleDateString("id-ID")}

1. DATA RINGKAS
=====================================
- Total Hari Monitoring: ${conclusionSummary?.totalRecords || 0} hari
- Populasi Awal: ${num(lantai?.populasi).toLocaleString("id-ID") || 0} ekor
- Sisa Ayam: ${conclusionSummary?.finalSisaAyam.toLocaleString("id-ID") || 0} ekor
- Total Kematian: ${conclusionSummary?.totalDeaths || 0} ekor
- Survival Rate: ${conclusionSummary?.survivalRate || 0}%
- Berat Akhir: ${conclusionSummary?.finalBB.toFixed(0) || 0} Gr/Ekor
- Tonase Akhir: ${conclusionSummary?.finalTonase.toFixed(2) || 0} Kg

2. KPI UTAMA
=====================================
- FCR Rata-rata: ${conclusionSummary?.avgFCR.toFixed(2) || 0} (Target: ≤ 1.80)
- IP Rata-rata: ${conclusionSummary?.avgIP.toFixed(0) || 0} (Target: ≥ 380)
- Daya Hidup: ${conclusionSummary?.avgDH.toFixed(2) || 0}% (Target: ≥ 97%)
- Deplesi Rata-rata: ${conclusionSummary?.avgDeplesi.toFixed(2) || 0}% (Target: ≤ 3%)

3. STATUS EVALUASI
=====================================
- FCR: ${getConclusionStatus(conclusionSummary)?.fcr || "-"}
- IP: ${getConclusionStatus(conclusionSummary)?.ip || "-"}
- Daya Hidup: ${getConclusionStatus(conclusionSummary)?.dh || "-"}
- Deplesi: ${getConclusionStatus(conclusionSummary)?.deplesi || "-"}

4. DETEKSI ANOMALI
=====================================
- Total Data Monitoring: ${predictList.length || 0}
- Data Dengan Anomali: ${conclusionSummary?.anomalyCount || 0}

5. REKOMENDASI
=====================================
${
  conclusionSummary?.avgFCR && conclusionSummary.avgFCR > 1.9
    ? "- Tingkatkan manajemen pakan dan kontrol pemberian pakan untuk meningkatkan efisiensi FCR.\n"
    : ""
}
${
  conclusionSummary?.avgIP && conclusionSummary.avgIP < 340
    ? "- Fokus pada peningkatan performa melalui manajemen kesehatan dan nutrisi yang lebih optimal.\n"
    : ""
}
${
  conclusionSummary?.avgDH && conclusionSummary.avgDH < 95
    ? "- Perhatikan faktor biosekuritas dan kesehatan untuk meningkatkan daya hidup ayam.\n"
    : ""
}
${
  conclusionSummary?.anomalyCount && conclusionSummary.anomalyCount > 0
    ? "- Lakukan investigasi mendalam pada tanggal-tanggal yang menunjukkan anomali untuk mencegah masalah serupa.\n"
    : ""
}
Laporan ini dibuat secara otomatis oleh sistem Chicka.

Generated: ${new Date().toLocaleString("id-ID")}
    `;

    const blob = new Blob([conclusionText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kesimpulan_${kandang?.nama}_Lantai${lantai?.no_lantai}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  if (!lantai || !kandang || !conclusionSummary) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-600">
            Data tidak tersedia atau belum ada monitoring.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const status = getConclusionStatus(conclusionSummary);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Kembali ke Monitoring
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            Kesimpulan Monitoring Keseluruhan
          </h1>
          <p className="text-gray-600 mt-2">
            Kandang <span className="font-semibold">{kandang.nama}</span> •
            Lantai <span className="font-semibold">{lantai.no_lantai}</span>
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Data Dasar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042L5.05 9H9V5a1 1 0 011-1h1a1 1 0 011 1v4h3.95l1.414-5.694c.021-.083.031-.167.031-.25A1.5 1.5 0 0012.5 1H12V2h1V1H3z" />
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 001 1h12a1 1 0 11-2 0V5H5v0a1 1 0 01-2 0V4a1 1 0 00-1-1H0a1 1 0 001 1zm0 6a1 1 0 001 1h12a1 1 0 11-2 0v-1H5v1a1 1 0 01-2 0v-1a1 1 0 00-1-1H0a1 1 0 001 1z"
                  clipRule="evenodd"
                />
              </svg>
              Data Dasar Lantai
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-semibold">Jenis DOC</p>
                <p className="text-lg font-bold text-blue-900 mt-1">
                  {lantai.jenis_doc || "-"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-xs text-green-600 font-semibold">
                  Populasi Awal
                </p>
                <p className="text-lg font-bold text-green-900 mt-1">
                  {num(lantai.populasi).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-xs text-purple-600 font-semibold">
                  Tanggal Masuk
                </p>
                <p className="text-lg font-bold text-purple-900 mt-1">
                  {lantai.tgl_masuk
                    ? new Date(lantai.tgl_masuk).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <p className="text-xs text-orange-600 font-semibold">
                  Hari Monitoring
                </p>
                <p className="text-lg font-bold text-orange-900 mt-1">
                  {conclusionSummary.totalRecords}
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Ringkasan Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded p-4">
                <p className="text-xs text-emerald-600 font-semibold">
                  Sisa Ayam
                </p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {conclusionSummary.finalSisaAyam.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  Survival Rate: {conclusionSummary.survivalRate}%
                </p>
              </div>
              <div className="border-l-4 border-red-500 bg-red-50 rounded p-4">
                <p className="text-xs text-red-600 font-semibold">
                  Total Mortality
                </p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {conclusionSummary.totalDeaths.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Mati: {conclusionSummary.totalMati} | Culling:{" "}
                  {conclusionSummary.totalCuling}
                </p>
              </div>
              <div className="border-l-4 border-blue-500 bg-blue-50 rounded p-4">
                <p className="text-xs text-blue-600 font-semibold">
                  Berat Akhir
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {conclusionSummary.finalBB.toFixed(0)}{" "}
                  <span className="text-sm">Gr</span>
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Range: {conclusionSummary.minBB.toFixed(0)} -{" "}
                  {conclusionSummary.maxBB.toFixed(0)} Gr
                </p>
              </div>
              <div className="border-l-4 border-purple-500 bg-purple-50 rounded p-4">
                <p className="text-xs text-purple-600 font-semibold">
                  Tonase Akhir
                </p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {conclusionSummary.finalTonase.toFixed(2)}{" "}
                  <span className="text-sm">Kg</span>
                </p>
              </div>
            </div>
          </div>

          {/* KPI Utama */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              KPI Utama
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: "FCR Rata-rata",
                  value: conclusionSummary.avgFCR.toFixed(2),
                  key: "fcr",
                  ideal: "≤ 1.80",
                  color: "indigo",
                },
                {
                  label: "IP Rata-rata",
                  value: conclusionSummary.avgIP.toFixed(0),
                  key: "ip",
                  ideal: "≥ 380",
                  color: "orange",
                },
                {
                  label: "Daya Hidup (%)",
                  value: conclusionSummary.avgDH.toFixed(2),
                  key: "dh",
                  ideal: "≥ 97%",
                  color: "green",
                },
                {
                  label: "Deplesi Rata-rata (%)",
                  value: conclusionSummary.avgDeplesi.toFixed(2),
                  key: "deplesi",
                  ideal: "≤ 3%",
                  color: "red",
                },
              ].map((kpi) => {
                const statusText = status?.[kpi.key as keyof typeof status];
                const statusColor =
                  statusText === "Sangat Baik"
                    ? "bg-green-100 text-green-700"
                    : statusText === "Baik"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700";

                return (
                  <div
                    key={kpi.label}
                    className={`bg-${kpi.color}-50 border border-${kpi.color}-200 rounded-lg p-4`}
                  >
                    <p
                      className={`text-xs text-${kpi.color}-600 font-semibold`}
                    >
                      {kpi.label}
                    </p>
                    <p
                      className={`text-3xl font-bold text-${kpi.color}-900 mt-2`}
                    >
                      {kpi.value}
                    </p>
                    <p className={`text-xs text-${kpi.color}-600 mt-2`}>
                      Target: {kpi.ideal}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${statusColor}`}
                    >
                      {statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analisis Kesehatan & Produksi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kesehatan */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                Analisis Kesehatan
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm text-gray-700">Daya Hidup</span>
                  <span className="font-bold text-green-900">
                    {conclusionSummary.avgDH.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="text-sm text-gray-700">Total Mortality</span>
                  <span className="font-bold text-red-900">
                    {conclusionSummary.totalDeaths} ekor
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                  <span className="text-sm text-gray-700">
                    Deplesi Rata-rata
                  </span>
                  <span className="font-bold text-orange-900">
                    {conclusionSummary.avgDeplesi.toFixed(2)}%
                  </span>
                </div>
                <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 rounded">
                  <p className="font-semibold text-green-800 text-sm mb-2">
                    ✓ Kesimpulan
                  </p>
                  <p className="text-sm text-green-700">
                    {conclusionSummary.avgDH >= 95
                      ? "Tingkat kesehatan ayam dalam kondisi baik. Manajemen kesehatan dan nutrisi berjalan optimal."
                      : "Perlu perhatian khusus pada kesehatan ayam. Review protokol biosekuritas dan nutrisi."}
                  </p>
                </div>
              </div>
            </div>

            {/* Produksi */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0015.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                Analisis Produksi
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm text-gray-700">Berat Akhir</span>
                  <span className="font-bold text-blue-900">
                    {conclusionSummary.finalBB.toFixed(0)} Gr
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="text-sm text-gray-700">Tonase</span>
                  <span className="font-bold text-purple-900">
                    {conclusionSummary.finalTonase.toFixed(2)} Kg
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded">
                  <span className="text-sm text-gray-700">FCR</span>
                  <span className="font-bold text-indigo-900">
                    {conclusionSummary.avgFCR.toFixed(2)}
                  </span>
                </div>
                <div className="mt-4 p-4 bg-blue-100 border-l-4 border-blue-500 rounded">
                  <p className="font-semibold text-blue-800 text-sm mb-2">
                    ✓ Kesimpulan
                  </p>
                  <p className="text-sm text-blue-700">
                    {conclusionSummary.avgFCR <= 1.8
                      ? "Efisiensi pakan sangat baik, produksi optimal. Manajemen pakan efektif dan konsisten."
                      : "Efisiensi pakan perlu ditingkatkan. Review kualitas pakan dan teknik pemberian pakan."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deteksi Anomali */}
          {conclusionSummary.anomalyCount > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
              <h2 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                ⚠ Peringatan: Anomali Terdeteksi
              </h2>
              <p className="text-red-700 text-sm">
                Ditemukan{" "}
                <span className="font-semibold">
                  {conclusionSummary.anomalyCount} data monitoring
                </span>{" "}
                dengan pola anomali. Silakan periksa tabel "Deteksi Anomali" di
                halaman monitoring untuk detail selengkapnya dan lakukan
                pengecekan pada kondisi kandang.
              </p>
            </div>
          )}

          {/* Rekomendasi */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 000-2H8z"
                  clipRule="evenodd"
                />
              </svg>
              Rekomendasi
            </h2>
            <ul className="space-y-2 text-sm text-amber-900 list-disc list-inside">
              {conclusionSummary.avgFCR > 1.9 && (
                <li>
                  Tingkatkan manajemen pakan dan kontrol pemberian pakan untuk
                  meningkatkan efisiensi FCR.
                </li>
              )}
              {conclusionSummary.avgIP < 340 && (
                <li>
                  Fokus pada peningkatan performa melalui manajemen kesehatan
                  dan nutrisi yang lebih optimal.
                </li>
              )}
              {conclusionSummary.avgDH < 95 && (
                <li>
                  Perhatikan faktor biosekuritas dan kesehatan untuk
                  meningkatkan daya hidup ayam.
                </li>
              )}
              {conclusionSummary.anomalyCount > 0 && (
                <li>
                  Lakukan investigasi mendalam pada tanggal-tanggal yang
                  menunjukkan anomali untuk mencegah masalah serupa.
                </li>
              )}
              {conclusionSummary.avgFCR <= 1.8 &&
                conclusionSummary.avgIP >= 380 &&
                conclusionSummary.avgDH >= 97 && (
                  <li>
                    ✓ Pertahankan sistem manajemen yang sudah berjalan dengan
                    baik, produksi dalam kondisi optimal.
                  </li>
                )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end print:hidden">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
            >
              Kembali
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConclusionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConclusionPageContent />
    </Suspense>
  );
}
