import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { resolveImage } from '../data/staticImages';
import { PageLoader, PageLoadError } from '../components/PageState';
import useScrollReveal from '../hooks/useScrollReveal';
import { useAboutContent } from '../hooks/useContentQueries';
import useSeo from '../hooks/useSeo';

function toSlug(text, fallback = '') {
  if (!text) return fallback;
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AboutPage() {
  const { data: content, isPending, isError, refetch } = useAboutContent();
  const [activeDept, setActiveDept] = useState(1);
  const deptDragStartX = useRef(null);
  const deptDragMoved = useRef(false);

  useScrollReveal([content]);

  // Guarded with `?? []` only so the hooks below can run before the content
  // query resolves; the component returns a loader until `content` exists.
  const coreValues = content?.coreValues?.items ?? [];
  const boardOfDirectors = content?.board?.members ?? [];
  const offices = content?.offices?.items ?? [];
  const companyEvents = content?.events?.items ?? [];
  const reasonsToChoose = content?.whyChooseUs?.reasons ?? [];
  const departments = content?.departments?.items ?? [];

  // Generate Person schemas for leadership with deep section anchor URLs for Google Knowledge Graph
  const directorsStructuredData = boardOfDirectors.map((m, index) => {
    const rawImg = resolveImage(m);
    const absoluteImg = rawImg && rawImg.startsWith('http')
      ? rawImg
      : (typeof window !== 'undefined' && rawImg ? `${window.location.origin}${rawImg}` : rawImg);
    const slug = toSlug(m.name, `director-${index}`);
    return {
      '@type': 'Person',
      '@id': `https://bhri.com.ph/about#${slug}`,
      'url': `https://bhri.com.ph/about#${slug}`,
      'name': m.name,
      'jobTitle': m.position,
      'description': m.desc,
      'image': absoluteImg || undefined,
      'worksFor': {
        '@type': 'Organization',
        'name': 'Bright Hermosa Realty Inc.',
        'url': 'https://bhri.com.ph'
      }
    };
  });

  // Handle direct section deep-linking from search engines (e.g. #leadership, #atty-adrian-carlo-uy-escay, #core-values)
  useEffect(() => {
    if (isPending || typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '').trim();
    if (!hash) return;

    const timer = setTimeout(() => {
      const target = document.getElementById(hash) ||
                     (hash.includes('escay') ? document.querySelector('[id*="escay"]') : null) ||
                     (hash.includes('leader') || hash.includes('board') ? document.getElementById('leadership') : null) ||
                     (hash.includes('mission') || hash.includes('vision') ? document.getElementById('mission-vision') : null);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isPending]);

  useSeo({
    title: 'About Us | Leadership & Board of Directors',
    description: 'Learn about Bright Hermosa Realty Inc. (BHRI) and our leadership team led by Chairman Hernando B. Signo, President & CEO Atty. Adrian Carlo Uy Escay, and Vice President Richard Mapusao. Discover our sustainable luxury farm communities in Cavite and Batangas.',
    keywords: 'Hernando B. Signo, Hernando Signo, Atty. Adrian Carlo Uy Escay, Adrian Carlo Escay, Adrian Escay, Richard Mapusao, Bright Hermosa Realty Board of Directors, BHRI Chairman, BHRI President, BHRI leadership, Bright Hermosa Realty executives, Cavite Batangas real estate leaders',
    image: resolveImage(boardOfDirectors[1]) || resolveImage(content?.aboutIntro),
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'AboutPage',
          '@id': 'https://bhri.com.ph/about#webpage',
          'url': 'https://bhri.com.ph/about',
          'name': 'About Us & Board of Directors | Bright Hermosa Realty Inc.',
          'description': 'Meet the leadership and Board of Directors of Bright Hermosa Realty Inc. driving sustainable leisure farm developments.',
          'publisher': {
            '@type': 'Organization',
            'name': 'Bright Hermosa Realty Inc.',
            'url': 'https://bhri.com.ph',
            'logo': 'https://bhri.com.ph/favicon.png'
          }
        },
        {
          '@type': 'Organization',
          '@id': 'https://bhri.com.ph/#organization',
          'name': 'Bright Hermosa Realty Inc.',
          'alternateName': ['BHRI', 'Bright Hermosa Realty'],
          'url': 'https://bhri.com.ph',
          'logo': 'https://bhri.com.ph/favicon.png',
          'founder': directorsStructuredData[0] || undefined,
          'employee': directorsStructuredData
        },
        ...directorsStructuredData
      ]
    }
  });

  const handleDeptDragStart = (clientX) => {
    deptDragStartX.current = clientX;
    deptDragMoved.current = false;
  };

  const handleDeptDragMove = (clientX) => {
    if (deptDragStartX.current === null) return;
    if (Math.abs(clientX - deptDragStartX.current) > 10) {
      deptDragMoved.current = true;
    }
  };

  const handleDeptDragEnd = (clientX) => {
    if (deptDragStartX.current === null) return;
    const delta = clientX - deptDragStartX.current;
    const swipeThreshold = 50;
    if (delta > swipeThreshold) {
      setActiveDept((current) => Math.max(0, current - 1));
    } else if (delta < -swipeThreshold) {
      setActiveDept((current) => Math.min(departments.length - 1, current + 1));
    }
    deptDragStartX.current = null;
  };

  const [selectedEventIndex, setSelectedEventIndex] = useState(null);
  const [rotatingEventIndex, setRotatingEventIndex] = useState(null);
  const [containedEventIndex, setContainedEventIndex] = useState(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const isEventExpanded = selectedEventIndex !== null;

  const handleToggleShowAllEvents = () => {
    setShowAllEvents((current) => {
      if (current && selectedEventIndex !== null && selectedEventIndex >= 4) {
        setSelectedEventIndex(null);
      }
      return !current;
    });
  };

  useEffect(() => {
    if (selectedEventIndex !== null) {
      setContainedEventIndex(selectedEventIndex);
      return;
    }
    const timeout = setTimeout(() => setContainedEventIndex(null), 500);
    return () => clearTimeout(timeout);
  }, [selectedEventIndex]);

  const handleEventThumbnailClick = (index) => {
    setRotatingEventIndex(index);
    setSelectedEventIndex((current) => (current === index ? null : index));
  };

  const showPrevEvent = useCallback(() => {
    setSelectedEventIndex((current) =>
      current === null ? null : (current - 1 + companyEvents.length) % companyEvents.length
    );
  }, [companyEvents.length]);

  const showNextEvent = useCallback(() => {
    setSelectedEventIndex((current) =>
      current === null ? null : (current + 1) % companyEvents.length
    );
  }, [companyEvents.length]);

  useEffect(() => {
    if (!isEventExpanded) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedEventIndex(null);
      if (e.key === 'ArrowLeft') showPrevEvent();
      if (e.key === 'ArrowRight') showNextEvent();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEventExpanded, showPrevEvent, showNextEvent]);

  if (isError) return <PageLoadError onRetry={refetch} />;
  if (isPending || !content) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-lg antialiased flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* About Us */}
        <section id="company-overview" className="px-margin-page py-section-gap max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center gap-stack-lg scroll-mt-20">
          <div data-reveal="left" className="w-full md:w-1/2 space-y-stack-md">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
              {content.aboutIntro.title}
            </h2>
            {content.aboutIntro.paragraphs.map((paragraph, index) => (
              <p key={index} className="font-body-lg text-body-lg text-on-surface-variant">
                {paragraph}
              </p>
            ))}
          </div>
          <div data-reveal="right" className="w-full md:w-1/2 overflow-hidden rounded-xl">
            <img
              className="w-full h-auto rounded-xl object-cover shadow-sm border border-outline-variant/30 hover:scale-105 duration-300 ease-in-out"
              src={content.aboutIntro.image}
              alt="Bright Hermosa Realty Inc. Corporate Headquarters and Development Team in Cavite"
              title="Bright Hermosa Realty Inc. Headquarters and Team"
              loading="lazy"
              decoding="async"
            />
          </div>
        </section>
        {/* Hero Section */}
        <section id="story" className="px-margin-page py-section-gap max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-stack-lg scroll-mt-20">
          <div data-reveal="right" className="w-full md:w-1/2 space-y-stack-md">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
              {content.hero.title}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {content.hero.text}
            </p>
          </div>
          <div data-reveal="left" className="w-full md:w-1/2 overflow-hidden rounded-xl">
            <img
              className="w-full h-auto rounded-xl object-cover shadow-sm border border-outline-variant/30 hover:scale-105 duration-300 ease-in-out"
              src={content.hero.image}
              alt="Bright Hermosa Luxury Leisure Farm Communities in Cavite and Batangas"
              title="Bright Hermosa Realty Scenic Landscape"
              loading="eager"
              decoding="async"
            />
          </div>
        </section>

        {/* Mission & Vision */}
        <section id="mission-vision" className="bg-surface-container py-section-gap scroll-mt-20">
          <div className="px-margin-page max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {/* Mission Card */}
            <div data-reveal className="group bg-primary text-on-primary p-12 rounded-xl flex flex-col justify-center space-y-stack-md min-h-[300px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out">
              <h2 className="font-headline-md text-headline-md">{content.mission.title}</h2>
              <p className="font-body-lg text-body-lg opacity-90 leading-relaxed">
                {content.mission.text}
              </p>
              <div className="pt-stack-md border-t border-on-primary/30 mt-auto">
                <span className="font-label-caps text-label-caps text-secondary-fixed relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-secondary-fixed after:w-0 group-hover:after:w-full after:transition-all after:duration-300">{content.mission.tagline}</span>
              </div>
            </div>

            {/* Vision Card */}
            <div data-reveal style={{ '--reveal-delay': '120ms' }} className="group bg-surface-container-low border border-outline-variant p-12 rounded-xl flex flex-col justify-center space-y-stack-md min-h-[300px] shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 ease-in-out">
              <h2 className="font-headline-md text-headline-md text-primary">{content.vision.title}</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {content.vision.text}
              </p>
              <div className="pt-stack-md border-t border-outline-variant mt-auto">
                <span className="font-label-caps text-label-caps text-primary relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-primary after:w-0 group-hover:after:w-full after:transition-all after:duration-300">{content.vision.tagline}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Narrative / Journey */}
        <section id="ceo" className="py-section-gap scroll-mt-20">
          <div className="px-margin-page max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center gap-stack-lg">
            <div data-reveal="left" className="w-full md:w-1/2 space-y-stack-md">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
                {content.coreNarrative.title}
              </h2>
              {content.coreNarrative.paragraphs.map((paragraph, index) => (
                <p key={index} className="font-body-lg text-body-lg text-on-surface-variant">
                  {paragraph}
                </p>
              ))}
            </div>
            <div data-reveal="right" className="w-full md:w-1/2 relative mt-8 md:mt-0 overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-primary/10 rounded-xl transform translate-x-4 translate-y-4"></div>
              <img
                className="relative w-full h-auto rounded-xl object-cover border border-outline-variant z-10 shadow-sm hover:scale-105 duration-300 ease-in-out"
                src={content.coreNarrative.image}
                alt="Atty. Adrian Carlo Uy Escay, President and CEO of Bright Hermosa Realty Inc."
                title="Atty. Adrian Carlo Uy Escay - President & CEO"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* Core Commitment */}
        <section id="core-commitment" className="bg-surface py-section-gap scroll-mt-20">
          <div className="px-margin-page max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-stack-lg">
            <div data-reveal="right" className="w-full md:w-1/2 space-y-stack-md">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
                {content.coreCommitment.title}
              </h2>
              {content.coreCommitment.paragraphs.map((paragraph, index) => (
                <p key={index} className="font-body-lg text-body-lg text-on-surface-variant">
                  {paragraph}
                </p>
              ))}
            </div>
            <div data-reveal="left" className="w-full md:w-1/2 mt-8 md:mt-0 relative overflow-hidden rounded-xl">
              <img
                className="w-full h-auto rounded-xl object-cover shadow-sm border border-outline-variant/30 hover:scale-105 duration-300 ease-in-out"
                src={content.coreCommitment.image}
                alt="Bright Hermosa Realty professional real estate consultation and client partnership"
                title="Bright Hermosa Realty Client Commitment"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* Board of Directors */}
        <section id="leadership" className="bg-surface-container py-section-gap scroll-mt-20">
          <div className="px-margin-page max-w-7xl mx-auto">
            <div data-reveal className="text-center max-w-2xl mx-auto mb-stack-lg space-y-stack-sm">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary">{content.board.title}</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">{content.board.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {boardOfDirectors.map((member, index) => {
                const slug = toSlug(member.name, `director-${index}`);
                return (
                  <article
                    key={index}
                    id={slug}
                    itemScope
                    itemType="https://schema.org/Person"
                    data-reveal
                    style={{ '--reveal-delay': `${index * 120}ms` }}
                    className="group bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/40 transition-all duration-300 ease-in-out scroll-mt-28"
                  >
                    <meta itemProp="name" content={member.name} />
                    <meta itemProp="jobTitle" content={member.position} />
                    <meta itemProp="worksFor" content="Bright Hermosa Realty Inc." />
                    <meta itemProp="description" content={member.desc} />
                    <meta itemProp="url" content={`https://bhri.com.ph/about#${slug}`} />

                    <div className="relative w-full h-80 overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-surface-container-low">
                      {/* Soft floor shadow under the cutout */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-5 bg-primary/30 rounded-full blur-lg transition-all duration-500 group-hover:w-3/5 group-hover:bg-primary/40"></div>
                      <img
                        itemProp="image"
                        className="absolute inset-0 h-full w-full object-contain object-bottom px-6 pt-6 drop-shadow-[0_16px_24px_rgba(0,0,0,0.28)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        src={resolveImage(member)}
                        alt={member.name}
                        title={`${member.name} - ${member.position} | Bright Hermosa Realty Inc.`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="relative p-6 pt-5 space-y-2 border-t border-outline-variant/40">
                      <span className="block w-10 h-0.5 rounded-full bg-secondary transition-all duration-500 ease-out group-hover:w-16"></span>
                      <h3 itemProp="name" className="font-subhead-lg text-subhead-lg text-primary">{member.name}</h3>
                      <p itemProp="jobTitle" className="font-label-caps text-label-caps text-secondary uppercase tracking-wide">{member.position}</p>
                      <p itemProp="description" className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed pt-1">{member.desc}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Company Departments */}
        <section id="departments" className="bg-surface py-section-gap overflow-hidden border-t border-b border-outline-variant/30 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-margin-page">
            <div data-reveal className="text-center max-w-2xl mx-auto mb-12 space-y-stack-sm">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
                {content.departments?.title}
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                {content.departments?.subtitle}
              </p>
            </div>

            {/* 3D Overlapping Card Container */}
            <div
              data-reveal="zoom"
              className="relative w-full h-[450px] flex items-center justify-center select-none overflow-visible cursor-grab active:cursor-grabbing touch-pan-y"
              onTouchStart={(e) => handleDeptDragStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleDeptDragMove(e.touches[0].clientX)}
              onTouchEnd={(e) => handleDeptDragEnd(e.changedTouches[0].clientX)}
              onMouseDown={(e) => handleDeptDragStart(e.clientX)}
              onMouseMove={(e) => handleDeptDragMove(e.clientX)}
              onMouseUp={(e) => handleDeptDragEnd(e.clientX)}
              onMouseLeave={() => { deptDragStartX.current = null; }}
            >
              <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
                {departments.map((dept, index) => {
                  const diff = index - activeDept;
                  const isActive = diff === 0;

                  // Compute dynamic transform and z-index offsets similar to visual diary deck
                  let zIndex = 0;
                  let scale = 0.8;
                  let translatePercent = -50;
                  let opacity = 0;
                  let pointerEvents = 'none';

                  if (diff === 0) {
                    zIndex = 30;
                    scale = 1.08;
                    translatePercent = -50;
                    opacity = 1;
                    pointerEvents = 'auto';
                  } else if (diff === -1) {
                    zIndex = 20;
                    scale = 0.9;
                    translatePercent = -120;
                    opacity = 0.75;
                    pointerEvents = 'auto';
                  } else if (diff === 1) {
                    zIndex = 20;
                    scale = 0.9;
                    translatePercent = 20; 
                    opacity = 0.75;
                    pointerEvents = 'auto';
                  } else if (diff === -2) {
                    zIndex = 10;
                    scale = 0.78;
                    translatePercent = -180; 
                    opacity = 0.35;
                    pointerEvents = 'auto';
                  } else if (diff === 2) {
                    zIndex = 10;
                    scale = 0.78;
                    translatePercent = 80;
                    opacity = 0.35;
                    pointerEvents = 'auto';
                  }

                  return (
                    <div
                      key={index}
                      onClick={() => { if (!deptDragMoved.current) setActiveDept(index); }}
                      className={`absolute left-1/2 top-4 w-[20rem] sm:w-[30rem] md:w-[36rem] h-[380px] rounded-2xl overflow-hidden shadow-lg border border-outline-variant/30 transition-all duration-500 ease-out cursor-pointer ${isActive ? 'shadow-2xl border-primary/20 ring-1 ring-primary/10' : 'hover:opacity-90'
                        }`}
                      style={{
                        transform: `translateX(${translatePercent}%) scale(${scale})`,
                        zIndex,
                        opacity,
                        pointerEvents
                      }}
                    >
                      {/* Department image background */}
                      <img
                        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 ease-in-out"
                        src={dept.image}
                        alt={`${dept.name} Department - Bright Hermosa Realty Inc.`}
                        title={`${dept.name} - Bright Hermosa Realty`}
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Smooth text overlay */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-6 text-white transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          }`}
                      >
                        <h3 className="font-headline-md text-xl font-bold leading-tight mb-2 text-white">
                          {dept.name}
                        </h3>
                        <p className="font-body-sm text-xs text-white/90 leading-relaxed font-light">
                          {dept.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Our Office */}
        <section id="offices" className="px-margin-page py-section-gap max-w-7xl mx-auto scroll-mt-20">
          <div data-reveal className="text-center max-w-2xl mx-auto mb-stack-lg space-y-stack-sm">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary">{content.offices.title}</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">{content.offices.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {offices.map((office, index) => (
              <a
                key={index}
                href={office.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                data-reveal
                style={{ '--reveal-delay': `${index * 120}ms` }}
                className="group relative flex flex-col sm:flex-row bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 ease-in-out cursor-pointer"
              >
                <div className="sm:w-2/5 h-48 sm:h-auto overflow-hidden">
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 ease-in-out"
                    src={resolveImage(office)}
                    alt={`${office.name} Office - Bright Hermosa Realty Inc., ${office.address}`}
                    title={`${office.name} - Bright Hermosa Realty`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Perforated ticket-style divider */}
                <div className="hidden sm:flex flex-col items-center justify-between py-4">
                  <span className="w-3 h-3 rounded-full bg-surface-container-low -ml-1.5 border border-outline-variant"></span>
                  <span className="flex-1 border-l border-dashed border-outline-variant my-1"></span>
                  <span className="w-3 h-3 rounded-full bg-surface-container-low -ml-1.5 border border-outline-variant"></span>
                </div>

                <div className="flex-1 p-6 space-y-3">
                  <h3 className="font-subhead-lg font-bold text-lg text-primary transition-colors duration-300 group-hover:text-secondary">{office.name}</h3>
                  <div className="flex gap-3 items-start">
                    <span className="material-symbols-outlined text-primary text-xl shrink-0 transition-transform duration-300 group-hover:scale-110">location_on</span>
                    <p className="font-body-sm text-body-sm text-sm leading-relaxed">{office.address}</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="material-symbols-outlined text-primary text-xl shrink-0 transition-transform duration-300 group-hover:scale-110">call</span>
                    <span
                      role="link"
                      tabIndex={0}
                      className="font-body-sm text-body-sm text-sm hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `tel:${office.contact.replace(/\s+/g, '')}`;
                      }}
                    >
                      {office.contact}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Company Events */}
        <section id="company-events" className="bg-surface-container-low py-section-gap scroll-mt-20">
          <div className="px-margin-page max-w-7xl mx-auto">
            <div data-reveal className="text-center max-w-2xl mx-auto mb-stack-lg space-y-stack-sm">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary">{content.events.title}</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">{content.events.subtitle}</p>
            </div>

            {(() => {
              const bentoAreas = [
                { cols: [0, 1], rows: [0, 1] },
                { cols: [2, 3], rows: [0, 0] },
                { cols: [2, 2], rows: [1, 1] },
                { cols: [3, 3], rows: [1, 1] }
              ];
              const mobileBentoAreas = [
                { cols: [0, 1], rows: [0, 1] },
                { cols: [0, 1], rows: [2, 2] },
                { cols: [0, 0], rows: [3, 3] },
                { cols: [1, 1], rows: [3, 3] }
              ];
              const bentoPlacement = [
                'col-start-1 col-span-2 row-start-1 row-span-2',
                'col-start-1 col-span-2 row-start-3 row-span-1 md:col-start-3 md:col-span-2 md:row-start-1 md:row-span-1',
                'col-start-1 col-span-1 row-start-4 row-span-1 md:col-start-3 md:col-span-1 md:row-start-2 md:row-span-1',
                'col-start-2 col-span-1 row-start-4 row-span-1 md:col-start-4 md:col-span-1 md:row-start-2 md:row-span-1'
              ];

              const renderEventTile = (event, index, placementClass = '') => {
                const isSelected = index === selectedEventIndex;
                const isContained = index === containedEventIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEventThumbnailClick(index)}
                    onAnimationEnd={() => setRotatingEventIndex(null)}
                    className={`group relative overflow-hidden rounded-md border border-outline-variant shadow-sm min-h-0 transition-all duration-300 ease-in-out cursor-pointer ${placementClass} ${rotatingEventIndex === index ? 'animate-clickSpin' : ''} ${isSelected ? 'bg-surface-container-high' : ''}`}
                  >
                    <img
                      className={`relative w-full h-full transition-transform duration-500 ease-in-out ${isContained ? 'object-contain sm:object-cover' : 'object-cover group-hover:scale-110 '}`}
                      src={resolveImage(event)}
                      alt={event.title || `Bright Hermosa Realty Company Milestone Event ${index + 1}`}
                      title={event.title || `Bright Hermosa Realty Event ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                );
              };

              const renderFullBentoChunk = (events, baseIndex) => {
                const colWeights = [1, 1, 1, 1];
                const rowWeights = [1, 1];
                const mobileColWeights = [1, 1];
                const mobileRowWeights = [1, 1, 1, 1];
                const localSelected =
                  selectedEventIndex !== null && selectedEventIndex >= baseIndex && selectedEventIndex < baseIndex + 4
                    ? selectedEventIndex - baseIndex
                    : null;
                if (localSelected !== null) {
                  const area = bentoAreas[localSelected];
                  for (let c = 0; c < 4; c++) colWeights[c] = c >= area.cols[0] && c <= area.cols[1] ? 2.4 : 0.5;
                  for (let r = 0; r < 2; r++) rowWeights[r] = r >= area.rows[0] && r <= area.rows[1] ? 2.4 : 0.5;

                  const mobileArea = mobileBentoAreas[localSelected];
                  for (let c = 0; c < 2; c++) mobileColWeights[c] = c >= mobileArea.cols[0] && c <= mobileArea.cols[1] ? 2.4 : 0.5;
                  for (let r = 0; r < 4; r++) mobileRowWeights[r] = r >= mobileArea.rows[0] && r <= mobileArea.rows[1] ? 2.4 : 0.5;
                }
                return (
                  <div
                    key={baseIndex}
                    style={{
                      '--bento-cols': colWeights.map((w) => `${w}fr`).join(' '),
                      '--bento-rows': rowWeights.map((w) => `${w}fr`).join(' '),
                      '--bento-cols-mobile': mobileColWeights.map((w) => `${w}fr`).join(' '),
                      '--bento-rows-mobile': mobileRowWeights.map((w) => `${w}fr`).join(' ')
                    }}
                    className="grid [grid-template-columns:var(--bento-cols-mobile)] [grid-template-rows:var(--bento-rows-mobile)] md:[grid-template-columns:var(--bento-cols)] md:[grid-template-rows:var(--bento-rows)] gap-1 sm:gap-2 md:gap-3 h-[65vh] max-h-[520px] sm:h-[440px] sm:max-h-none md:h-[500px] lg:h-[560px] transition-[grid-template-columns,grid-template-rows] duration-500 ease-in-out"
                  >
                    {events.map((event, i) => renderEventTile(event, baseIndex + i, bentoPlacement[i]))}
                  </div>
                );
              };

              const renderPartialChunk = (events, baseIndex) => {
                const count = events.length;
                const weights = Array(count).fill(1);
                const localSelected =
                  selectedEventIndex !== null && selectedEventIndex >= baseIndex && selectedEventIndex < baseIndex + count
                    ? selectedEventIndex - baseIndex
                    : null;
                if (localSelected !== null && count > 1) {
                  for (let c = 0; c < count; c++) weights[c] = c === localSelected ? 2.4 : 0.5;
                }
                return (
                  <div
                    key={baseIndex}
                    style={{ '--partial-cols': weights.map((w) => `${w}fr`).join(' ') }}
                    className={`grid [grid-template-columns:var(--partial-cols)] gap-1 sm:gap-2 md:gap-3 transition-[grid-template-columns,height] duration-500 ease-in-out ${localSelected !== null ? 'h-[55vh] max-h-[480px] sm:h-[380px] md:h-[420px]' : 'h-40 sm:h-48 md:h-56'}`}
                  >
                    {events.map((event, i) => renderEventTile(event, baseIndex + i))}
                  </div>
                );
              };

              const chunks = [];
              for (let i = 0; i < companyEvents.length; i += 4) {
                chunks.push({ events: companyEvents.slice(i, i + 4), baseIndex: i });
              }
              if (chunks.length === 0) return null;
              const [firstChunk, ...extraChunks] = chunks;
              const renderChunk = ({ events, baseIndex }) =>
                events.length === 4 ? renderFullBentoChunk(events, baseIndex) : renderPartialChunk(events, baseIndex);
              return (
                <div data-reveal>
                  {renderChunk(firstChunk)}
                  {extraChunks.length > 0 && (
                    <div
                      className={`grid transition-all duration-700 ease-in-out ${showAllEvents
                          ? 'grid-rows-[1fr] opacity-100 mt-1 sm:mt-2 md:mt-3'
                          : 'grid-rows-[0fr] opacity-0 mt-0'
                        }`}
                    >
                      <div
                        className={`overflow-hidden min-h-0 space-y-1 sm:space-y-2 md:space-y-3 transition-transform duration-700 ease-in-out ${showAllEvents ? 'translate-y-0' : '-translate-y-4'
                          }`}
                      >
                        {extraChunks.map(renderChunk)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {companyEvents.length > 4 && (
              <div className="flex justify-center mt-stack-md">
                <button
                  type="button"
                  onClick={handleToggleShowAllEvents}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-outline-variant bg-surface text-primary font-label-caps text-label-caps hover:bg-surface-container hover:border-primary/40 hover:shadow-md transition-all duration-300"
                >
                  {showAllEvents ? 'View Less' : 'View More'}
                  <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${showAllEvents ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Core Values */}
        <section className="px-margin-page py-section-gap max-w-7xl mx-auto">
          <div data-reveal className="text-center max-w-2xl mx-auto mb-stack-lg space-y-stack-sm">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary">{content.coreValues.title}</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">{content.coreValues.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter">
            {coreValues.map((value, index) => (
              <div
                key={index}
                data-reveal
                style={{ '--reveal-delay': `${index * 100}ms` }}
                className="bg-surface border border-outline-variant rounded-xl p-8 hover:border-primary transition-colors duration-300 group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-stack-md group-hover:bg-primary transition-colors duration-300">
                  <span className="material-symbols-outlined text-primary group-hover:text-on-primary transition-colors duration-300">
                    {value.icon}
                  </span>
                </div>
                <h3 className="font-subhead-lg text-subhead-lg text-primary mb-2">{value.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="bg-surface-container-low py-section-gap">
          <div className="px-margin-page max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-stack-lg items-start">
              <div data-reveal="left" className="w-full md:w-1/3">
                <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
                  {content.whyChooseUs.title}
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-4">
                  {content.whyChooseUs.subtitle}
                </p>
              </div>
              <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-gutter">
                {reasonsToChoose.map((reason, index) => (
                  <div key={index} data-reveal style={{ '--reveal-delay': `${index * 80}ms` }} className="flex gap-4 items-start">
                    <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
                    <p className="font-body-md text-on-surface leading-relaxed">{reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sustainability Commitment */}
        <section className="py-section-gap px-margin-page max-w-7xl mx-auto">
          <div data-reveal="zoom" className="group relative w-full h-[500px] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500 ease-in-out flex items-center justify-center">
            <div className="absolute inset-0 bg-deep-emerald/80 transition-colors duration-500 ease-in-out z-10"></div>
            <img
              className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 ease-in-out group-hover:scale-110"
              src={content.sustainability.image}
              alt="Sustainable luxury farm estate aerial view"
            />
            <div className="relative z-20 py-10 md:py-16 px-6 md:px-16 flex flex-col items-center text-center max-w-3xl space-y-stack-sm md:space-y-stack-md text-on-primary">
              <h2 className="font-display-lg text-2xl sm:text-display-lg-mobile md:text-display-lg leading-tight">
                {content.sustainability.title}
              </h2>
              {content.sustainability.paragraphs.map((paragraph, index) => (
                <p key={index} className="font-body-lg text-base sm:text-body-lg text-tertiary-fixed-dim opacity-95">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
