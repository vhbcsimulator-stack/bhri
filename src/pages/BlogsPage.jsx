import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useScrollReveal from '../hooks/useScrollReveal';
import useSeo from '../hooks/useSeo';
import { useBlogs } from '../hooks/useBlogs';

export default function BlogsPage() {
  const { blogs, loading, error, isLiveEmpty, refetch } = useBlogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalBlog, setActiveModalBlog] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useScrollReveal([blogs, searchQuery]);

  // Dynamic SEO metadata based on live blogs or active modal blog
  const seoConfig = useMemo(() => {
    if (activeModalBlog) {
      const primaryImg = activeModalBlog.images?.[0]?.url;
      const allImages = activeModalBlog.images?.map((img) => img.url) || [];
      return {
        title: activeModalBlog.title,
        description: activeModalBlog.excerpt || activeModalBlog.caption.slice(0, 160),
        keywords: `${activeModalBlog.title}, Bright Hermosa Realty news, BHRI blog, Cavite Batangas real estate, Atty. Adrian Carlo Escay, VHBC`,
        image: primaryImg,
        url: typeof window !== 'undefined' ? `${window.location.origin}/blogs#${activeModalBlog.id}` : undefined,
        type: 'article',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: activeModalBlog.title,
          description: activeModalBlog.excerpt || activeModalBlog.caption.slice(0, 160),
          datePublished: activeModalBlog.isoDate || activeModalBlog.date,
          dateModified: activeModalBlog.isoDate || activeModalBlog.date,
          url: typeof window !== 'undefined' ? `${window.location.origin}/blogs#${activeModalBlog.id}` : undefined,
          image: allImages,
          author: {
            '@type': 'Organization',
            name: 'Bright Hermosa Realty Inc.',
            url: 'https://bhri.com.ph'
          },
          publisher: {
            '@type': 'Organization',
            name: 'Bright Hermosa Realty Inc.',
            logo: {
              '@type': 'ImageObject',
              url: 'https://bhri.com.ph/logo.png'
            }
          }
        }
      };
    }

    const latestStories = blogs.map((b) => b.title).slice(0, 3).join('. ');
    const desc = latestStories
      ? `${latestStories}. Stay updated with the latest community milestones, partnership news, and project announcements from Bright Hermosa Realty.`
      : 'Stay updated with the latest happenings, community milestones, event photos, and property development stories directly from Bright Hermosa Realty.';

    const topImg = blogs?.[0]?.images?.[0]?.url || 'https://lh3.googleusercontent.com/d/11ZpZfZQGM1ldDLRu6LMvA0_sTs-eFpd8=w1200-rw';

    return {
      title: 'Blogs & Latest News',
      description: desc,
      keywords: 'Bright Hermosa blogs, BHRI news, Cavite farm community updates, Batangas real estate news, East West Breeze updates, Atty. Adrian Carlo Escay, VHBC Lamudi partnership',
      image: topImg,
      url: typeof window !== 'undefined' ? `${window.location.origin}/blogs` : undefined,
      type: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Bright Hermosa Realty Inc. | Blogs & Latest News',
        description: desc,
        url: typeof window !== 'undefined' ? `${window.location.origin}/blogs` : 'https://bhri.com.ph/blogs',
        publisher: {
          '@type': 'Organization',
          name: 'Bright Hermosa Realty Inc.',
          logo: {
            '@type': 'ImageObject',
            url: 'https://bhri.com.ph/logo.png'
          }
        },
        blogPost: blogs.map((b) => ({
          '@type': 'BlogPosting',
          headline: b.title,
          description: b.excerpt,
          datePublished: b.isoDate || b.date,
          dateModified: b.isoDate || b.date,
          url: typeof window !== 'undefined' ? `${window.location.origin}/blogs#${b.id}` : `https://bhri.com.ph/blogs#${b.id}`,
          image: b.images && b.images.length > 0 ? b.images.map((img) => img.url) : undefined
        }))
      }
    };
  }, [blogs, activeModalBlog]);

  useSeo(seoConfig);

  // Filter posts by search query
  const filteredBlogs = useMemo(() => {
    if (!searchQuery) return blogs;
    const q = searchQuery.toLowerCase();
    return blogs.filter((blog) =>
      blog.title.toLowerCase().includes(q) ||
      blog.caption.toLowerCase().includes(q)
    );
  }, [blogs, searchQuery]);

  // Handle direct section / deep-link navigation from Google or shared links (e.g. /blogs#blog-0)
  useEffect(() => {
    if (loading || !blogs || blogs.length === 0 || typeof window === 'undefined') return;
    const rawHash = window.location.hash.replace(/^#/, '').trim();
    if (!rawHash) return;

    // Find blog by exact id, or by title slug match
    const matched = blogs.find(
      (b) => b.id.toLowerCase() === rawHash.toLowerCase() ||
             (b.title && b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(rawHash.toLowerCase()))
    );

    if (matched) {
      setActiveModalBlog(matched);
      const timer = setTimeout(() => {
        const el = document.getElementById(matched.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [blogs, loading]);

  const handleOpenBlog = (blog) => {
    setActiveModalBlog(blog);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${blog.id}`);
    }
  };

  const handleCloseBlog = () => {
    setActiveModalBlog(null);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleCopyShare = (blog, e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/blogs#${blog.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(blog.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary-container selection:text-on-primary-container">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-primary/10 via-surface to-background py-16 md:py-24 border-b border-outline-variant/30">
          <div className="max-w-7xl mx-auto px-margin-page">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">newspaper</span>
                BHRI Insights & Community Stories
              </div>
              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
                Blogs & Latest News
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Stay updated with the latest happenings, community milestones, event photos, and property development stories directly from Bright Hermosa Realty.
              </p>
            </div>

            {/* Live Sheet Banner Notification */}
            {isLiveEmpty && (
              <div className="mt-8 p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">info</span>
                  <div className="text-sm">
                    <strong className="font-semibold block sm:inline mr-1">Your Google Sheet is connected!</strong>
                    <span>No entries found yet. Add rows with date, image links, title, and caption to your Google Sheet to see them live here.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://docs.google.com/spreadsheets/d/1kjT32In422t_VI0XO0JunxQMoM9a4rwd-a9HvuZEgvE/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Open Sheet
                  </a>
                  <button
                    onClick={() => setShowGuideModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                    Sheet Guide
                  </button>
                  <button
                    onClick={() => refetch()}
                    className="p-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface hover:text-primary transition-colors cursor-pointer"
                    title="Refresh data"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filter Bar */}
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search articles, keywords, or captions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-xs font-semibold shrink-0"
                title="Reload from Google Sheets"
              >
                <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </section>

        {/* Content Feed Section */}
        <section className="py-12 md:py-16 max-w-7xl mx-auto px-margin-page">
          {loading && blogs.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-surface rounded-2xl border border-outline-variant/40 overflow-hidden p-4 space-y-4 animate-pulse">
                  <div className="h-56 bg-surface-container rounded-xl"></div>
                  <div className="h-4 bg-surface-container rounded w-3/4"></div>
                  <div className="h-3 bg-surface-container rounded w-1/2"></div>
                  <div className="h-16 bg-surface-container rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-2xl border border-outline-variant/40 p-8 max-w-lg mx-auto">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">search_off</span>
              <h3 className="font-headline-md text-primary text-lg font-bold">No articles match your criteria</h3>
              <p className="font-body-sm text-on-surface-variant mt-1 text-sm">
                Try searching with different keywords.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBlogs.map((blog, index) => {
                const hasImages = blog.images && blog.images.length > 0;
                const primaryImage = hasImages ? (blog.images[0].thumbnailUrl || blog.images[0].url) : null;
                const primaryHighRes = hasImages ? blog.images[0].url : null;

                return (
                  <article
                    key={blog.id}
                    id={blog.id}
                    itemScope
                    itemType="https://schema.org/BlogPosting"
                    data-reveal
                    style={{ '--reveal-delay': `${(index % 6) * 100}ms` }}
                    className="group bg-surface rounded-2xl border border-outline-variant/50 hover:border-primary/40 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between scroll-mt-28"
                  >
                    <meta itemProp="headline" content={blog.title} />
                    <meta itemProp="datePublished" content={blog.isoDate || blog.date} />
                    <meta itemProp="dateModified" content={blog.isoDate || blog.date} />
                    <meta itemProp="description" content={blog.excerpt} />
                    {/* Index every image for Google Image Search crawlers */}
                    {blog.images?.map((img, imgIdx) => (
                      <meta key={imgIdx} itemProp="image" content={img.url} />
                    ))}
                    <div>
                      {/* Image Thumbnail Container */}
                      <div className="relative h-64 w-full bg-surface-container overflow-hidden">
                        {primaryImage ? (
                          <>
                            <img
                              src={primaryImage}
                              alt={blog.images[0]?.altText || `${blog.title} | Bright Hermosa Realty Inc.`}
                              title={blog.images[0]?.title || blog.images[0]?.name || blog.title}
                              loading={index === 0 ? "eager" : "lazy"}
                              fetchpriority={index === 0 ? "high" : "auto"}
                              decoding="async"
                              itemProp="image"
                              onClick={() => setLightboxImage({ url: primaryHighRes, caption: blog.caption, alt: blog.images[0]?.altText || blog.title })}
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 cursor-pointer"
                            />
                            {blog.images.length > 1 && (
                              <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium shadow-md">
                                <span className="material-symbols-outlined text-sm">photo_library</span>
                                {blog.images.length} photos
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-on-surface-variant p-6 text-center">
                            <span className="material-symbols-outlined text-5xl text-primary/60 mb-2">
                              {blog.isFolder ? 'folder' : 'image'}
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {blog.isFolder ? 'Google Drive Folder' : 'Google Drive Media'}
                            </span>
                          </div>
                        )}

                        {/* Date badge */}
                        <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md border border-outline-variant/30 text-on-surface text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                          {blog.date}
                        </div>
                      </div>

                      {/* Related Images Gallery Strip - Exposes ALL photos to Google Search & visitors */}
                      {blog.images && blog.images.length > 1 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low/70 border-b border-outline-variant/30 overflow-x-auto scrollbar-none">
                          {blog.images.slice(0, 5).map((img, photoIdx) => (
                            <figure
                              key={photoIdx}
                              itemScope
                              itemType="https://schema.org/ImageObject"
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/40 shrink-0 cursor-pointer hover:border-primary transition-colors m-0 group/thumb"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({
                                  url: img.url,
                                  caption: img.caption || blog.caption,
                                  alt: img.altText || img.name
                                });
                              }}
                            >
                              <img
                                src={img.previewUrl || img.thumbnailUrl || img.url}
                                alt={img.altText || `${blog.title} - Photo ${photoIdx + 1}`}
                                title={img.title || img.name}
                                loading="lazy"
                                decoding="async"
                                itemProp="contentUrl"
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                              />
                              <meta itemProp="name" content={img.title || img.name} />
                              <meta itemProp="caption" content={img.caption || img.altText} />
                            </figure>
                          ))}
                          {blog.images.length > 5 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenBlog(blog);
                              }}
                              className="text-[11px] font-bold text-primary px-2 py-1 bg-surface rounded-md border border-outline-variant shrink-0 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                            >
                              +{blog.images.length - 5}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Content Body */}
                      <div className="p-6 space-y-3">
                        <h2
                          onClick={() => handleOpenBlog(blog)}
                          className="font-subhead-lg font-bold text-lg text-primary group-hover:text-secondary transition-colors cursor-pointer line-clamp-2"
                        >
                          {blog.title}
                        </h2>

                        <p className="font-body-sm text-body-sm text-on-surface-variant text-sm leading-relaxed line-clamp-3">
                          {blog.excerpt}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="px-6 pb-6 pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenBlog(blog)}
                        className="inline-flex items-center gap-1 text-primary text-xs font-bold hover:text-secondary transition-colors cursor-pointer"
                      >
                        Read Full Story
                        <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleCopyShare(blog, e)}
                          title="Copy Link to Article"
                          className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">
                            {copiedId === blog.id ? 'check' : 'share'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Story Details Modal */}
      {activeModalBlog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          onClick={handleCloseBlog}
        >
          <div
            className="bg-surface rounded-2xl border border-outline-variant max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseBlog}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {activeModalBlog.date}
              </span>
              <h2 className="font-display-lg text-2xl md:text-3xl font-bold text-primary mt-1">
                {activeModalBlog.title}
              </h2>
            </div>

            {/* Images Gallery */}
            {activeModalBlog.images && activeModalBlog.images.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeModalBlog.images.map((img, i) => (
                    <figure
                      key={i}
                      itemScope
                      itemType="https://schema.org/ImageObject"
                      className="relative h-48 sm:h-56 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 cursor-pointer group m-0"
                      onClick={() => setLightboxImage({ url: img.url, caption: img.caption || activeModalBlog.caption, alt: img.altText || img.name, title: img.title || img.name })}
                    >
                      <img
                        src={img.url}
                        alt={img.altText || `${activeModalBlog.title} - Photo ${i + 1} | Bright Hermosa Realty Inc.`}
                        title={img.title || img.name || `${activeModalBlog.title} - Photo ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        itemProp="contentUrl"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <meta itemProp="name" content={img.title || img.name || `${activeModalBlog.title} - Photo ${i + 1}`} />
                      <meta itemProp="caption" content={img.caption || img.altText} />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
                      </div>
                      <figcaption className="sr-only">
                        {img.caption || img.altText || `${activeModalBlog.title} - Photo ${i + 1}`}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {/* Full Caption Content */}
            <div className="space-y-3 text-on-surface-variant font-body-md text-sm md:text-base leading-relaxed whitespace-pre-line border-t border-outline-variant/20 pt-4">
              {activeModalBlog.caption}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-outline-variant/30">
              <button
                onClick={(e) => handleCopyShare(activeModalBlog, e)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedId === activeModalBlog.id ? 'check' : 'share'}
                </span>
                {copiedId === activeModalBlog.id ? 'Copied link!' : 'Share Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 text-2xl"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          <img
            src={lightboxImage.url}
            alt={lightboxImage.alt || 'Bright Hermosa Realty High-Resolution Media Preview'}
            title={lightboxImage.title || lightboxImage.alt || 'Bright Hermosa Realty Inc.'}
            loading="eager"
            decoding="async"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Guide Modal on how to enter data */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="bg-surface rounded-2xl border border-outline-variant max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-3xl">menu_book</span>
              <h3 className="font-headline-md text-xl font-bold">Google Sheet Publishing Guide</h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              <div className="p-3 bg-surface-container rounded-xl space-y-1">
                <span className="font-bold text-primary block">Column A: Date</span>
                <p>
                  The article date (e.g., <code>October 10, 2026</code>).
                </p>
              </div>

              <div className="p-3 bg-surface-container rounded-xl space-y-1">
                <span className="font-bold text-primary block">Column B: GDrive Link</span>
                <p>
                  Right-click your image in Google Drive &gt; <strong>Share &gt; Copy link</strong> and paste it here.
                  <br />
                  <span className="text-outline text-xs mt-1 block">
                    • <strong>Multiple photos:</strong> Separate links by comma or newline.
                    <br />
                    • <strong>SEO Image Names:</strong> To define custom photo file names for SEO alt text, format as <code>photo-name.jpg: https://drive...</code> or <code>[photo-name.jpg](https://drive...)</code>. Otherwise, SEO alt text is automatically generated from Title &amp; Caption!
                  </span>
                </p>
              </div>

              <div className="p-3 bg-surface-container rounded-xl space-y-1">
                <span className="font-bold text-primary block">Column C: Title</span>
                <p>
                  The headline / story title (e.g., &quot;East West Breeze Milestone&quot;).
                </p>
              </div>

              <div className="p-3 bg-surface-container rounded-xl space-y-1">
                <span className="font-bold text-primary block">Column D: Caption</span>
                <p>
                  The story content or description.
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-amber-900 dark:text-amber-200">
                <span className="font-bold block">Important Permission:</span>
                <p>
                  Ensure your Google Drive image sharing permission is set to <strong>&quot;Anyone with the link can view&quot;</strong> so images can load on the public website.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
