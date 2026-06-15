"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

type AnyObj = any;

type FloorItem = {
  id: number;
  name: string;
  chickenCount: number; // latest sisa_ayam atau fallback populasi
};

type KandangItem = {
  id: number;
  nama: string;
  floors: FloorItem[];
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expandedKandang, setExpandedKandang] = useState<number | null>(null);

  // User info
  const [userInfo, setUserInfo] = useState<{
    username: string | null;
    email: string | null;
    picture: string | null;
  }>({ username: null, email: null, picture: null });

  // Data fetch
  const [loading, setLoading] = useState(true);
  const [kandangs, setKandangs] = useState<KandangItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Utils untuk ambil latest monit pada lantai
  const getLatestMonit = (monitArr: AnyObj[]) => {
    if (!Array.isArray(monitArr) || monitArr.length === 0) return null;
    return monitArr.reduce(
      (latest: AnyObj | null, curr: AnyObj) =>
        (curr?.umur?.Int64 ?? 0) > (latest?.umur?.Int64 ?? 0) ? curr : latest,
      null
    );
  };

  // Ambil id kandang dari URL agar auto-expand
  const kandangIdFromPath = useMemo(() => {
    const m = pathname.match(/\/monitoring\/kandang\/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }, [pathname]);

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

    if (!token) {
      router.push("/login");
      return;
    }

    setUserInfo({ username: name, email, picture });

    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const url = `${base}/api/index?email=${encodeURIComponent(
          email || ""
        )}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        // Bentuk ulang data menjadi KandangItem[]
        const mapped: KandangItem[] = (raw || []).map((k: AnyObj) => {
          const floors: FloorItem[] = (k.lantai || []).map((l: AnyObj) => {
            const latest = getLatestMonit(l.monit || []);
            const chickenCount =
              latest?.sisa_ayam?.Int64 ?? l.populasi?.Int64 ?? 0;
            return {
              id: Number(l.id?.Int64 ?? 0),
              name: `Lantai ${l.no_lantai?.Int64 ?? "-"}`,
              chickenCount,
            };
          });
          return { id: k.id, nama: k.nama, floors };
        });

        setKandangs(mapped);

        // Auto expand jika URL mengarah ke kandang tertentu
        if (kandangIdFromPath) setExpandedKandang(kandangIdFromPath);
      } catch (e: any) {
        setFetchError(e?.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // sengaja tidak memasukkan kandangIdFromPath agar tidak refetch

  const toggleKandang = (kandangId: number) => {
    setExpandedKandang((prev) => (prev === kandangId ? null : kandangId));
  };

  const isActive = (href: string, opts?: { exact?: boolean }) => {
    const clean = (p: string) => p.split("?")[0].replace(/\/+$/, "");
    const path = clean(pathname);
    const target = clean(href);
    if (opts?.exact) return path === target;
    return path === target || path.startsWith(`${target}/`);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay untuk mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen
          w-52 bg-white border-r border-gray-200
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo/Header */}
        <div className="h-20 flex items-center justify-center border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">
            Chick-<span className="text-orange-400">A</span>
          </h1>
        </div>

        {/* Menu Items - Scrollable */}
        <nav className="h-[calc(100vh-180px)] overflow-y-auto p-4 space-y-1">
          {/* Dashboard */}
          <Link
            href="/monitoring"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg
              transition-all duration-200
              ${
                isActive("/monitoring", { exact: true })
                  ? "bg-orange-400 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }
            `}
          >
            <span className="text-xl">📊</span>
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Kandang */}
          <Link
            href={`/monitoring/kandang?email=${userInfo.email}`}
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg
              transition-all duration-200
              ${
                isActive("/monitoring/kandang")
                  ? "bg-orange-400 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }
            `}
          >
            <span className="text-xl">🏡</span>
            <span className="font-medium">Kandang</span>
          </Link>

          {/* Divider */}
          <div className="pt-2 pb-1">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Kandang
            </p>
          </div>

          {/* State: loading */}
          {loading && (
            <div className="space-y-2 px-4">
              <div className="h-9 bg-gray-100 rounded animate-pulse" />
              <div className="h-9 bg-gray-100 rounded animate-pulse" />
              <div className="h-9 bg-gray-100 rounded animate-pulse" />
            </div>
          )}

          {/* State: error */}
          {!loading && fetchError && (
            <p className="px-4 text-sm text-red-500">
              Gagal memuat data: {fetchError}
            </p>
          )}

          {/* State: empty */}
          {!loading && !fetchError && kandangs.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-600">
              Belum ada kandang.
            </div>
          )}

          {/* Kandang List dengan Nested Lantai */}
          {!loading &&
            !fetchError &&
            kandangs.length > 0 &&
            kandangs.map((kandang) => (
              <div key={kandang.id}>
                {/* Kandang Button */}
                <button
                  onClick={() => toggleKandang(kandang.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏠</span>
                    <span className="font-medium">{kandang.nama}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expandedKandang === kandang.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Lantai List (Nested) */}
                {expandedKandang === kandang.id && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200">
                    {kandang.floors.map((floor) => {
                      const href = `/monitoring/kandang/${kandang.id}/lantai/${floor.id}`;
                      return (
                        <Link
                          key={floor.id}
                          href={href}
                          onClick={() => setIsOpen(false)}
                          className={`
                            flex items-center justify-between pl-8 pr-4 py-2 rounded-r-lg
                            transition-all duration-200
                            ${
                              isActive(href)
                                ? "bg-orange-100 text-orange-600 border-l-2 border-orange-400"
                                : "text-gray-600 hover:bg-gray-50"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">
                            {floor.name}
                          </span>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                            {floor.chickenCount}
                          </span>
                        </Link>
                      );
                    })}
                    {kandang.floors.length === 0 && (
                      <div className="pl-8 pr-4 py-2 text-xs text-gray-500">
                        Belum ada lantai
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

          {/* Divider */}
          {/* <div className="pt-2 pb-1">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Penjualan
            </p>
          </div> */}

          {/* Penjualan */}
          {/* <Link
            href="/penjualan"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg
              transition-all duration-200
              ${
                isActive("/penjualan")
                  ? "bg-orange-400 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }
            `}
          >
            <span className="text-xl">📝</span>
            <span className="font-medium">Penjualan</span>
          </Link> */}

          {/* Divider */}
          {/* <div className="pt-2 pb-1">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Arsip Data
            </p>
          </div> */}

          {/* Arsip Data */}
          {/* <Link
            href="/arsip-data"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg
              transition-all duration-200
              ${
                isActive("/arsip-data")
                  ? "bg-orange-400 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }
            `}
          >
            <span className="text-xl">📦</span>
            <span className="font-medium">Arsip Data</span>
          </Link> */}
        </nav>

        {/* Footer/User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            {userInfo.picture && !imageError ? (
              <img
                src={userInfo.picture}
                alt={userInfo.username || "User"}
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-semibold text-sm">
                {userInfo.username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {userInfo.username || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {userInfo.email || "user@example.com"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer untuk desktop */}
      <div className="hidden lg:block lg:w-52 shrink-0" />
    </>
  );
}
