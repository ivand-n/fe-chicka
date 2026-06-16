"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const MapClient = dynamic(() => import("./components/MapClient"), {
  ssr: false,
});

// Type definitions
interface BenefitCardProps {
  icon: string;
  title: string;
  description: string;
}

interface ComparisonRow {
  fitur: string;
  chickA: boolean;
  chickAPro: boolean;
}

export default function Home() {
  const comparisonData: ComparisonRow[] = [
    {
      fitur: "Daily monitoring",
      chickA: true,
      chickAPro: true,
    },
    {
      fitur: "Otomatisasi Data",
      chickA: true,
      chickAPro: true,
    },
    {
      fitur: "Kalkulasi hingga panen",
      chickA: true,
      chickAPro: true,
    },
    {
      fitur: "Export data ke CSV",
      chickA: true,
      chickAPro: true,
    },
    {
      fitur: "Integrasi Sapronak",
      chickA: true,
      chickAPro: true,
    },
    {
      fitur: "Monitoring kandang via website",
      chickA: false,
      chickAPro: true,
    },
    {
      fitur: "Konsultasikan ayam dengan dokter",
      chickA: false,
      chickAPro: true,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-white">
      <Navbar />
      <main className="p-4 sm:p-6 md:p-8" id="home">
        {/* Hero Title */}
        <div className="mt-6 sm:mt-10 mb-6 sm:mb-10 text-3xl sm:text-5xl md:text-6xl text-black text-center font-bold">
          Solusi Kemudahan Beternak.
        </div>

        {/* Hero Image */}
        <section className="relative mx-auto w-full md:w-3/5 h-64 sm:h-96 md:h-[60vh] z-10 -mb-12 sm:-mb-20 md:-mb-80 border-2 border-black rounded-lg overflow-hidden">
          <Image
            src="/1.jpeg"
            alt="Hero"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <p className="mt-4 text-white text-sm sm:text-base md:text-lg max-w-2xl text-center">
              Platform untuk memudahkan manajemen ternak dan monitoring.
            </p>
            <div className="mt-4 sm:mt-6">
              <button className="px-4 sm:px-6 py-2 sm:py-3 bg-orange-400 text-white rounded-lg shadow-md hover:bg-orange-300 text-sm sm:text-base font-medium transition">
                Mulai Sekarang
              </button>
            </div>
          </div>
        </section>

        {/* Orange Section */}
        <div className="w-full h-32 sm:h-48 md:h-80 bg-orange-400 rounded-lg mt-16 sm:mt-24 md:mt-32"></div>

        {/* Benefits Section */}
        <div className="mt-20 sm:mt-32 md:mt-40">
          <h2
            id="produk"
            className="text-black border-t border-gray-300 text-lg sm:text-xl md:text-2xl hover:underline font-bold pt-4"
          >
            Keunggulan
          </h2>
          <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-10 justify-center items-start">
            <BenefitCard
              icon="/easy.png"
              title="Easy"
              description="Antarmuka yang user-friendly untuk semua kalangan peternak."
            />
            <BenefitCard
              icon="/accurate.png"
              title="Accurate"
              description="Data akurat untuk pengambilan keputusan yang tepat."
            />
            <BenefitCard
              icon="/visual.png"
              title="Visual"
              description="Grafik dan laporan visual untuk pemantauan mudah."
            />
          </div>
        </div>

        {/* About Section */}
        <div id="tentang-kami" className="mt-20 sm:mt-32 md:mt-40 w-full">
          <div className="mx-auto p-4 sm:p-6 md:p-8 min-h-48 sm:min-h-60 md:h-60 bg-orange-400 rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-white text-lg sm:text-xl md:text-2xl font-bold">
                Tentang Kami
              </h1>
              <p className="text-white text-xs sm:text-sm md:text-base text-justify mt-4 max-w-4xl">
                Chick-A adalah platform inovatif yang dirancang untuk memudahkan
                peternak dalam mengelola dan memantau kesehatan ternak mereka.
                Dengan antarmuka yang user-friendly, data yang akurat, dan
                laporan visual yang informatif, Chick-A membantu peternak
                membuat keputusan yang tepat untuk meningkatkan produktivitas
                dan kesejahteraan ternak mereka. Berawal dari penelitian bersama
                pascasarjana Peternakan, Teknik Elektro, dan Informatika
                Universitas Jenderal Soedirman.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-10 sm:mt-16 md:mt-20 bg-white rounded-xl p-4 sm:p-6 md:p-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black text-center mb-6 sm:mb-8">
            Perbandingan Chick-A dan Chick-A PRO
          </h2>
          <div className="overflow-x-auto">
            <table className="table-auto border-collapse w-full text-left text-black text-xs sm:text-sm md:text-base">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3">
                    Fitur
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center">
                    Chick-A
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center">
                    Chick-A PRO
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-orange-50 border-b border-gray-300"
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium">
                      {row.fitur}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      {row.chickA ? (
                        <span className="text-green-500 font-bold text-lg sm:text-xl">
                          ✔
                        </span>
                      ) : (
                        <span className="text-red-500 font-bold text-lg sm:text-xl">
                          ✘
                        </span>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      {row.chickAPro ? (
                        <span className="text-green-500 font-bold text-lg sm:text-xl">
                          ✔
                        </span>
                      ) : (
                        <span className="text-red-500 font-bold text-lg sm:text-xl">
                          ✘
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="justify-center items-center flex mt-6 sm:mt-8">
            <a
              href="https://wa.me/6281222220000"
              className="w-full md:w-1/2 bg-orange-400 hover:bg-orange-500 p-3 sm:p-4 rounded-lg text-center text-white font-bold text-sm sm:text-base transition"
            >
              Hubungi kami
            </a>
          </div>
        </div>

        {/* Location Section */}
        <div className="mt-20 sm:mt-32 md:mt-40 w-full">
          <div className="h-16 sm:h-20 md:h-24 mx-auto rounded-t-xl flex items-center justify-center bg-gray-50">
            <h1 className="text-black text-base sm:text-lg md:text-xl font-bold">
              Lokasi Chick-A
            </h1>
          </div>
          <div className="mx-auto p-4 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto md:h-96">
              <div className="h-64 md:h-full rounded-xl overflow-hidden shadow-md">
                <MapClient />
              </div>
              <div className="flex flex-col items-center justify-center h-auto md:h-full bg-white rounded-xl p-4 sm:p-6 shadow-md">
                <h1 className="text-black text-lg sm:text-xl md:text-2xl font-bold text-center">
                  Chick-A Farm House
                </h1>
                <p className="text-black text-xs sm:text-sm md:text-base text-justify mt-4">
                  Chick-A Farm House Fakultas Peternakan Universitas Jenderal
                  Soedirman
                </p>
                <p className="text-black text-xs sm:text-sm md:text-base text-justify mt-3">
                  Jl. Raya Jendral Sudirman No.KM 5, Karangwangkal, Kec.
                  Purwokerto Utara, Kabupaten Banyumas, Jawa Tengah 53122
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Reusable Benefit Card Component dengan proper typing
function BenefitCard({ icon, title, description }: BenefitCardProps) {
  return (
    <div className="w-full h-auto bg-white flex flex-col items-center p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition">
      <img
        src={icon}
        alt={title}
        height={40}
        width={40}
        className="sm:h-12 sm:w-12"
      />
      <div className="text-black text-base sm:text-lg font-bold mt-3">
        {title}
      </div>
      <div className="text-black text-xs sm:text-sm mt-2 text-center">
        {description}
      </div>
    </div>
  );
}
