"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles`,
          {
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error("Failed to fetch articles");
        const data = await res.json();
        setArticles(data || []);
      } catch (err) {
        console.error("Error fetching articles:", err);
        setError(null);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // Ambil 3 artikel terbaru untuk featured
  const featuredArticles = articles.sort(() => Math.random() - 0.5).slice(0, 3);

  const mainArticles = articles.slice(3);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-96">
            <p className="text-gray-500 text-lg">Memuat artikel...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-black mb-6 sm:mb-8">
          Artikel
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Featured Articles */}
            {featuredArticles.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">
                  Artikel Terbaru
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {featuredArticles.map((article, idx) => (
                    <ArticleCard key={idx} article={article} featured />
                  ))}
                </div>
              </div>
            )}

            {/* All Articles */}
            {mainArticles.length > 0 && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">
                  Semua Artikel
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {mainArticles.map((article, idx) => (
                    <ArticleCard key={idx} article={article} />
                  ))}
                </div>
              </div>
            )}

            {articles.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-base sm:text-lg">
                  Belum ada artikel tersedia
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-orange-50 rounded-lg p-4 sm:p-6 sticky top-4">
              <h3 className="text-lg sm:text-xl font-bold text-black mb-4">
                Info Terbaru
              </h3>
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Artikel
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-400">
                    {articles.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-black mb-2">
                    Kategori Populer
                  </p>
                  <div className="space-y-2">
                    <button className="w-full text-left text-xs sm:text-sm px-3 py-2 bg-white hover:bg-orange-100 rounded text-black transition">
                      Peternakan
                    </button>
                    <button className="w-full text-left text-xs sm:text-sm px-3 py-2 bg-white hover:bg-orange-100 rounded text-black transition">
                      Kesehatan
                    </button>
                    <button className="w-full text-left text-xs sm:text-sm px-3 py-2 bg-white hover:bg-orange-100 rounded text-black transition">
                      Tips & Trik
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Reusable Article Card Component
function ArticleCard({ article, featured = false }: { article: any; featured?: boolean }) {
  return (
    <article
      className={`bg-white border rounded-lg overflow-hidden hover:shadow-lg transition ${
        featured ? "border-orange-300" : "border-gray-200"
      }`}
    >
      {/* Image */}
      {article.image && (
        <div className="relative w-full h-40 sm:h-48 bg-gray-200">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          {featured && (
            <div className="absolute top-2 right-2 bg-orange-400 text-white px-2 sm:px-3 py-1 rounded text-xs font-semibold">
              Featured
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Category */}
        {article.category && (
          <span className="inline-block text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
            {article.category}
          </span>
        )}

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-black mb-2 line-clamp-2">
          {article.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 sm:line-clamp-3">
          {article.description}
        </p>

        {/* Metadata */}
        <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
          <span>{article.author || "Admin"}</span>
          <span>
            {article.date
              ? new Date(article.date).toLocaleDateString("id-ID")
              : "Tanpa tanggal"}
          </span>
        </div>

        {/* Read More Button */}
        <Link
          href={`/articles/${article.id}`}
          className="inline-block w-full text-center bg-orange-400 hover:bg-orange-500 text-white font-semibold py-2 rounded transition text-sm"
        >
          Baca Selengkapnya
        </Link>
      </div>
    </article>
  );
}
